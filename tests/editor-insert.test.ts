/*
 * MarkdownPoint - Plugin for Obsidian
 * Copyright (c) 2026 Johan Sanneblad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { EditorState } from "@codemirror/state";
import { history, historyField, undo, redo, undoDepth } from "@codemirror/commands";
import { indexPresentation } from "../src/format/document.ts";
import { planSlideInsertion } from "../src/format/insert.ts";
import type { PreparedSlide } from "../src/format/insert.ts";
import { slideInsertionTransaction } from "../src/editor/insert.ts";
import { historyBoundarySelection, slideEditTransactions } from "../src/editor/structural-history.ts";
import type { Transaction } from "@codemirror/state";
import { boundaryChangesAllowed } from "../src/editor/boundary-protection.ts";

const block = (id: string) => `<!-- slide: ${id} -->\n<!-- text: title -->\nThought ${id}\n\n`;
const markdown = block("one") + block("two");
const companion = '{"slides":{"one":{},"two":{}}}';
const prepared = (id: string, source = block(id)): PreparedSlide => ({ id, markdown: source, record: '{"layout":"title"}' });
const idsOf = (state: EditorState) => indexPresentation(state.doc.toString(), 0)!.slides.map(slide => slide.id);
const insert = (state: EditorState, slides = [prepared("new")], after: string | null = "one", livePreview = true) => {
  const plan = planSlideInsertion(state.doc.toString(), indexPresentation(state.doc.toString(), 0)!, companion, slides, after, 0)!;
  assert.ok(plan);
  const transaction = slideInsertionTransaction(state, plan, slides[0]!.id, livePreview)!;
  return slideEditTransactions(state, transaction).at(-1)!.state;
};

void test("slide group insertion is one native edit, separate from typing and repeatable after serialized history", () => {
  const cursor = markdown.indexOf("Thought two") + 4;
  let state = EditorState.create({ doc: markdown, selection: { anchor: cursor }, extensions: [history()] });
  state = state.update({ changes: { from: cursor, insert: "X" }, selection: { anchor: cursor + 1 }, userEvent: "input.type" }).state;
  const typed = state.doc.toString();
  const beforeCursor = state.selection.main.head;
  state = insert(state, [prepared("new"), prepared("another")]);
  const inserted = state.doc.toString();
  const insertedCursor = inserted.indexOf("Thought new");
  assert.equal(state.selection.main.head, insertedCursor);
  assert.equal(undoDepth(state), 2);
  const target = { get state() { return state; }, dispatch: (transaction: Transaction) => {
    const selection = historyBoundarySelection(transaction, indexPresentation(transaction.startState.doc.toString(), 0)!,
      indexPresentation(transaction.newDoc.toString(), 0)!);
    state = selection ? transaction.state.update({ selection, userEvent: "select.markdownpoint" }).state : transaction.state;
  } };
  for (let cycle = 0; cycle < 4; cycle++) {
    state = EditorState.fromJSON(state.toJSON({ history: historyField }), { extensions: [history()] }, { history: historyField });
    assert.ok(undo(target));
    assert.equal(state.doc.toString(), typed);
    if (cycle === 0) assert.equal(state.selection.main.head, beforeCursor);
    assert.ok(state.doc.lineAt(state.selection.main.head).text.startsWith("ThouXght two"));
    assert.ok(redo(target));
    assert.deepEqual(idsOf(state), ["one", "new", "another", "two"]);
    assert.equal(state.selection.main.head, insertedCursor);
  }
  state = state.update({ changes: { from: state.selection.main.head, insert: "Write " }, userEvent: "input.type" }).state;
  assert.equal(undoDepth(state), 3);
  assert.ok(undo(target));
  assert.equal(state.doc.toString(), inserted);
  assert.ok(undo(target));
  assert.equal(state.doc.toString(), typed);
  assert.ok(undo(target));
  assert.equal(state.doc.toString(), markdown);
});

void test("compact inserted fields get their editable line within insertion's single undo", () => {
  let state = EditorState.create({ doc: markdown, selection: { anchor: 0 }, extensions: [history()] });
  const source = '<!-- slide: compact -->\n<!-- text: eyebrow -->\n<!-- text: title -->\nTitle words\n';
  state = insert(state, [prepared("compact", source)]);
  assert.equal(state.doc.lineAt(state.selection.main.head).text, "");
  assert.ok(state.doc.toString().includes('<!-- text: eyebrow -->\n\n<!-- text: title -->'));
  assert.equal(undoDepth(state), 1);
  const target = { get state() { return state; }, dispatch: (transaction: { state: EditorState }) => { state = transaction.state; } };
  assert.ok(undo(target));
  assert.equal(state.doc.toString(), markdown);
  assert.ok(redo(target));
  assert.equal(state.doc.lineAt(state.selection.main.head).text, "");
});

void test("Source insertion leaves compact source untouched and selects its first marker", () => {
  const source = '<!-- slide: compact -->\n<!-- text: title -->\n<!-- text: body -->\nWords\n';
  const state = insert(EditorState.create({ doc: markdown }), [prepared("compact", source)], "one", false);
  assert.ok(state.doc.toString().includes(source));
  assert.equal(state.selection.main.head, state.doc.toString().indexOf('<!-- text: title -->', block("one").length));
});

void test("CRLF fragments use native normalized offsets without splitting compact markers or shifting populated carets", () => {
  for (const compact of [false, true]) {
    const source = `<!-- slide: windows -->\r\n<!-- text: title -->\r\n${compact ? "" : "A Windows title\r\n"}<!-- text: body -->\r\nWords\r\n`;
    for (const livePreview of [false, true]) {
      const state = insert(EditorState.create({ doc: markdown }), [prepared("windows", source)], "one", livePreview);
      const indexed = indexPresentation(state.doc.toString(), 0)!;
      assert.ok(indexed);
      const slide = indexed.slides.find(slide => slide.id === "windows")!;
      assert.deepEqual(slide.blocks.map(block => block.id), ["title", "body"]);
      assert.equal(state.doc.sliceString(slide.blocks[1]!.contentFrom, slide.blocks[1]!.to), "Words\n");
      assert.equal(state.doc.lineAt(state.selection.main.head).text,
        compact ? livePreview ? "" : "<!-- text: title -->" : "A Windows title");
      assert.equal(state.selection.main.head, compact && !livePreview ? slide.blocks[0]!.from : slide.blocks[0]!.contentFrom);
    }
  }
});

void test("insertion into an empty draft and a textless slide has a valid native caret", () => {
  for (const source of [block("first"), '<!-- slide: first -->\n']) {
    const state = insert(EditorState.create({ doc: "" }), [prepared("first", source)], null);
    assert.deepEqual(idsOf(state), ["first"]);
    assert.ok(state.selection.main.head <= state.doc.length);
  }
});

void test("explicit slide insertion passes Live Preview boundary protection without weakening ordinary edits", () => {
  const state = EditorState.create({ doc: markdown, extensions: [EditorState.transactionFilter.of(transaction => {
    const document = indexPresentation(transaction.startState.doc.toString(), 0)!;
    return boundaryChangesAllowed(transaction, document.slides) ? transaction : [];
  })] });
  assert.deepEqual(idsOf(insert(state)), ["one", "new", "two"]);
  assert.equal(state.update({ changes: { from: 0, to: 10 }, userEvent: "delete" }).docChanged, false);
});
