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
import "./support/editor-hooks.ts";
import { EditorState } from "@codemirror/state";
import { indexPresentation } from "../src/format/document.ts";
import { isRecord } from "../src/format/recognition.ts";
import { slideNotes } from "../src/editor/notes.ts";

const { notesDecorations } = await import("../src/editor/notes-widgets.ts");

/** Where the notes decorations let a line take the direction of its own text. */
function autoDirectionLines(markdown: string, open: boolean): number[] {
  const slots = slideNotes(markdown, indexPresentation(markdown, 0)!, "Notes");
  const opened = new Set(open ? slots.map(slot => slot.slideId) : []);
  const actions = { toggle: () => undefined, edit: () => undefined };
  return notesDecorations(EditorState.create({ doc: markdown }), slots, opened, false, new Set(), actions).filter(range => {
    const spec: unknown = range.value.spec;
    return isRecord(spec) && isRecord(spec.attributes) && spec.attributes.dir === "auto";
  }).map(range => range.from);
}

void test("an open note's first line takes its own text direction beside the hidden notes marker", () => {
  const markdown = "<!-- slide: first -->\n<!-- text: title -->\nIdea.\n<!-- notes -->\nPause here.\nThen go on.\n<!-- slide: second -->\n";
  assert.deepEqual(autoDirectionLines(markdown, true), [markdown.indexOf("Pause here.")]);
  assert.deepEqual(autoDirectionLines(markdown, false), []);
  assert.deepEqual(autoDirectionLines("<!-- slide: first -->\n<!-- notes -->\n<!-- slide: second -->\n", true), []);
});
