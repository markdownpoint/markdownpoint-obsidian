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
import { indexPresentation } from "../src/format/document.ts";
import { boundaryChangesAllowed } from "../src/editor/boundary-protection.ts";

const markdown = '<!-- section: opening -->\n# Opening\n\n<!-- slide: first -->\n\n<!-- text: body -->\nAlpha\n\n<!-- slide: second -->\n\n<!-- text: body -->\nBeta\n';
function editor(): EditorState {
  return EditorState.create({ doc: markdown, extensions: EditorState.transactionFilter.of(transaction => {
    const document = indexPresentation(transaction.startState.doc.toString(), 0)!;
    return boundaryChangesAllowed(transaction, [...document.slides, ...document.sections]) ? transaction : [];
  }) });
}

void test("ordinary field text and section heading edits remain editable", () => {
  for (const word of ["Alpha", "Opening"]) {
    const from = markdown.indexOf(word);
    assert.equal(editor().update({ userEvent: "input", changes: { from, to: from + word.length, insert: "A new thought" } }).newDoc.toString(),
      markdown.replace(word, "A new thought"));
  }
});

void test("typing, deleting, cutting, or replacing a slide or section separator is rejected as one edit", () => {
  for (const token of ["<!-- slide: first -->", "<!-- slide: second -->", "<!-- section: opening -->"]) {
    const from = markdown.indexOf(token);
    for (const change of [
      { from, insert: "x" }, { from: from + 4, insert: "x" }, { from, to: from + token.length },
      { from, to: from + token.length, insert: "Pasted text" },
      { from: Math.max(0, from - 1), to: from + 1 },
      { from: from + token.length, to: from + token.length + 1 },
    ]) assert.equal(editor().update({ userEvent: "input", changes: change }).docChanged, false, JSON.stringify(change));
  }
  const from = markdown.indexOf("Alpha");
  const to = markdown.indexOf("Beta") + 4;
  for (const insert of ["", "A replacement"]) assert.equal(editor().update({ userEvent: "input", changes: { from, to, insert } }).docChanged, false);
});

void test("one marker-crossing change rejects a multi-change edit without applying its ordinary portion", () => {
  const transaction = editor().update({ userEvent: "input", changes: [
    { from: markdown.indexOf("Alpha"), insert: "Valid " },
    { from: markdown.indexOf("<!-- slide: second -->") + 2, insert: "Invalid " },
  ] });
  assert.equal(transaction.newDoc.toString(), markdown);
});

void test("separator protection uses the current source positions after earlier text edits", () => {
  const first = editor().update({ userEvent: "input", changes: { from: markdown.indexOf("Alpha"), insert: "Some more words. " } }).state;
  const from = first.doc.toString().indexOf("<!-- slide: second -->");
  assert.equal(first.update({ userEvent: "input", changes: { from, to: from + 5 } }).docChanged, false);
  const field = first.doc.toString().indexOf("Beta");
  assert.equal(first.update({ userEvent: "input", changes: { from: field, insert: "Still editable. " } }).docChanged, true);
});

void test("native file reload transactions can replace structural content", () => {
  const source = editor();
  const loaded = source.update({ changes: { from: 0, to: source.doc.length, insert: "A replacement from disk" } });
  assert.equal(loaded.newDoc.toString(), "A replacement from disk");
});

void test("a rejected replacement preserves the original selection for subsequent typing", () => {
  const from = markdown.indexOf("Alpha");
  const to = markdown.indexOf("Beta") + 4;
  const state = editor().update({ selection: { anchor: from, head: to } }).state;
  const transaction = state.update({ changes: { from, to, insert: "A" }, selection: { anchor: from + 1 }, userEvent: "input.type" });
  assert.equal(transaction.newDoc.toString(), markdown);
  assert.ok(transaction.newSelection.eq(state.selection));
});
