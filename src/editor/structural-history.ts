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

import type { EditorState, Transaction, TransactionSpec } from "@codemirror/state";

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
