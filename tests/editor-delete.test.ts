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
import { EditorSelection, EditorState } from "@codemirror/state";
import { history, historyField, undo, redo, undoDepth } from "@codemirror/commands";
import { indexPresentation } from "../src/format/document.ts";
import { planSlideDeletion } from "../src/format/delete.ts";
import { slideDeletionTransaction } from "../src/editor/delete.ts";
import { slideEditTransactions } from "../src/editor/structural-history.ts";

const block = (id: string) => `<!-- slide: ${id} -->\n<!-- text: title -->\nThought ${id}\n\n`;
const markdown = ["one", "two", "three"].map(block).join("");
const companion = '{"slides":{"one":{},"two":{},"three":{}}}';

void test("deletion preserves text selections in surviving slides", () => {
  const anchor = markdown.indexOf("Thought three"), head = anchor + "Thought three".length;
  const state = EditorState.create({ doc: markdown, selection: EditorSelection.range(anchor, head) });
  const document = indexPresentation(markdown, 0)!;
  const plan = planSlideDeletion(markdown, document, companion, ["one"])!;
  const next = state.update(slideDeletionTransaction(state, document, plan)).state;
  assert.equal(next.doc.sliceString(next.selection.main.from, next.selection.main.to), "Thought three");
});

void test("a deleted writing position lands in the next slide and one native undo restores words and caret", () => {
  const cursor = markdown.indexOf("Thought two") + 4;
  let state = EditorState.create({ doc: markdown, selection: { anchor: cursor }, extensions: [history()] });
  const document = indexPresentation(markdown, 0)!;
  const plan = planSlideDeletion(markdown, document, companion, ["two"])!;
  state = slideEditTransactions(state, slideDeletionTransaction(state, document, plan)).at(-1)!.state;
  assert.equal(state.doc.sliceString(state.selection.main.head, state.selection.main.head + 13), "Thought three");
  const dispatch = (transaction: { state: EditorState }) => { state = transaction.state; };
  assert.ok(undo({ state, dispatch }));
  assert.equal(state.doc.toString(), markdown);
  assert.equal(state.selection.main.head, cursor);
  assert.ok(redo({ state, dispatch }));
  assert.equal(state.doc.toString(), block("one") + block("three"));
});

void test("all-slide deletion leaves a valid caret and undo restores the complete draft", () => {
  let state = EditorState.create({ doc: markdown, selection: { anchor: markdown.length }, extensions: [history()] });
  const document = indexPresentation(markdown, 0)!;
  const plan = planSlideDeletion(markdown, document, companion, ["one", "two", "three"])!;
  state = slideEditTransactions(state, slideDeletionTransaction(state, document, plan)).at(-1)!.state;
  assert.equal(state.doc.length, 0);
  assert.equal(state.selection.main.head, 0);
  assert.ok(undo({ state, dispatch: transaction => { state = transaction.state; } }));
  assert.equal(state.doc.toString(), markdown);
});

void test("a compact surviving field retains a focusable marker before its empty payload", () => {
  const source = block("one") + '<!-- slide: two -->\n<!-- text: title -->\n<!-- text: body -->\n';
  const state = EditorState.create({ doc: source, selection: { anchor: source.indexOf("Thought one") } });
  const document = indexPresentation(source, 0)!;
  const plan = planSlideDeletion(source, document, companion, ["one"])!;
  const next = state.update(slideDeletionTransaction(state, document, plan)).state;
  assert.equal(next.selection.main.head, next.doc.toString().indexOf("<!-- text: title -->"));
});

void test("Live Preview includes a compact caret line in deletion's single native history event", () => {
  const source = block("one") + '<!-- slide: two -->\n<!-- text: title -->\n<!-- text: body -->\nWords.\n';
  const document = indexPresentation(source, 0)!;
  const plan = planSlideDeletion(source, document, companion, ["one"])!;
  const cursor = source.indexOf("Thought one");
  let state = EditorState.create({ doc: source, selection: { anchor: cursor }, extensions: [history()] });
  state = slideEditTransactions(state, slideDeletionTransaction(state, document, plan, true)).at(-1)!.state;
  const inserted = '<!-- slide: two -->\n<!-- text: title -->\n\n<!-- text: body -->\nWords.\n';
  assert.equal(state.doc.toString(), inserted);
  assert.equal(state.doc.lineAt(state.selection.main.head).text, "");
  assert.equal(undoDepth(state), 1);
  state = EditorState.fromJSON(state.toJSON({ history: historyField }), { extensions: [history()] }, { history: historyField });
  const dispatch = (transaction: { state: EditorState }) => { state = transaction.state; };
  assert.ok(undo({ state, dispatch }));
  assert.equal(state.doc.toString(), source);
  assert.equal(state.selection.main.head, cursor);
  assert.ok(redo({ state, dispatch }));
  assert.equal(state.doc.toString(), inserted);
  assert.equal(state.doc.lineAt(state.selection.main.head).text, "");
  const position = state.selection.main.head;
  state = state.update({ changes: { from: position, insert: "New words" }, selection: { anchor: position + 9 }, userEvent: "input.type" }).state;
  assert.equal(undoDepth(state), 2);
  assert.ok(undo({ state, dispatch }));
  assert.equal(state.doc.toString(), inserted);
  assert.ok(undo({ state, dispatch }));
  assert.equal(state.doc.toString(), source);
});

void test("deletion adds no caret line to an independent surviving writing selection", () => {
  const source = block("one") + '<!-- slide: two -->\n<!-- text: title -->\n<!-- text: body -->\nWords.\n';
  const document = indexPresentation(source, 0)!;
  const plan = planSlideDeletion(source, document, companion, ["one"])!;
  const state = EditorState.create({ doc: source, selection: { anchor: source.indexOf("Words.") } });
  const next = state.update(slideDeletionTransaction(state, document, plan, true)).state;
  assert.equal(next.doc.toString(), source.slice(block("one").length));
  assert.equal(next.doc.sliceString(next.selection.main.head), "Words.\n");
});
