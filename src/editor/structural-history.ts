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

import { EditorSelection } from "@codemirror/state";
import type { EditorState, Transaction, TransactionSpec } from "@codemirror/state";
import type { PresentationDocument } from "../format/document.ts";
import { slideAtPosition } from "../format/document.ts";

/** Keep a structural edit and its explicit writing position in native history. */
export function slideEditTransactions(state: EditorState, change: TransactionSpec): readonly Transaction[] {
  const edited = state.update(change);
  if (!edited.docChanged) return [edited];
  // Native history otherwise derives redo's caret by mapping the old selection,
  // which cannot follow a moved slide or a deleted field's chosen replacement.
  // This selection-only event is serialized with the edit, adding no text undo step.
  const caret = edited.state.update({ selection: edited.state.selection, userEvent: "select.markdownpoint" });
  return [edited, caret];
}

/** Native membership undo can land on the removed group's boundary. Keep that caret writable in Live Preview. */
export function historyBoundarySelection(transaction: Transaction, before: PresentationDocument, after: PresentationDocument): EditorSelection | null {
  if (!transaction.docChanged || !(transaction.isUserEvent("undo") || transaction.isUserEvent("redo"))) return null;
  const previous = new Set(before.slides.map(slide => slide.id));
  if (previous.size === after.slides.length && after.slides.every(slide => previous.has(slide.id))) return null;
  const restored = after.slides.find(slide => !previous.has(slide.id));
  const selection = EditorSelection.create(transaction.newSelection.ranges.map(range => {
    if (!range.empty) return range;
    const slide = slideAtPosition(after, range.head);
    if (!slide) return range;
    const hidden = range.head < slide.markerTo || slide.blocks.some(block => range.head >= block.from && range.head < block.contentFrom);
    if (!hidden) return range;
    const field = (restored ?? slide).blocks.find(block => block.kind === "text" &&
      (block.contentFrom < block.to || block.contentFrom === transaction.newDoc.length));
    return field ? EditorSelection.cursor(field.contentFrom) : range;
  }), transaction.newSelection.mainIndex);
  return selection.eq(transaction.newSelection) ? null : selection;
}
