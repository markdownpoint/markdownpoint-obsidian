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

import { isolateHistory } from "@codemirror/commands";
import { EditorSelection } from "@codemirror/state";
import type { EditorState, TransactionSpec } from "@codemirror/state";
import type { PresentationDocument } from "../format/document.ts";
import { stepSlideSource } from "../format/reorder.ts";
import { slideStructureChange } from "./boundary-protection.ts";

/** Preserve native text ranges by their slide/section identity and local offset. */
export function slideStepTransaction(state: EditorState, document: PresentationDocument, ids: Iterable<string>, direction: "up" | "down"): TransactionSpec | null {
  const planned = stepSlideSource(state.doc.toString(), document, ids, direction);
  if (!planned) return null;
  const changes = state.changes({ from: planned.from, to: planned.to, insert: planned.insert });
  const length = changes.newLength;
  const contains = (range: { from: number; to: number }, position: number): boolean =>
    position >= range.from && (position < range.to || (position === state.doc.length && position === range.to));
  const mapPosition = (position: number): number => {
    const slide = document.slides.find(slide => contains(slide, position));
    const section = slide ? undefined : document.sections.find(section => contains(section, position));
    const before = slide ?? section;
    const after = slide ? planned.document.slides.find(candidate => candidate.id === slide.id)
      : section ? planned.document.sections.find(candidate => candidate.id === section.id) : undefined;
    if (!before || !after) return changes.mapPos(position);
    // A former EOF caret stays inside its slide rather than landing on the
    // following slide's marker after that slide moves earlier.
    return Math.min(after.from + position - before.from, after.to - (after.to < length ? 1 : 0));
  };
  return {
    changes,
    selection: EditorSelection.create(state.selection.ranges.map(range =>
      EditorSelection.range(mapPosition(range.anchor), mapPosition(range.head))), state.selection.mainIndex),
    userEvent: "move.markdownpoint",
    annotations: [slideStructureChange.of(true), isolateHistory.of("full")],
  };
}
