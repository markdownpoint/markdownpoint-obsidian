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

import { isolateHistory } from '@codemirror/commands';
import { ChangeSet, EditorSelection } from '@codemirror/state';
import type { EditorState, TransactionSpec } from '@codemirror/state';
import type { PresentationDocument } from '../format/document.ts';
import type { SlideDeletion } from '../format/delete.ts';
import { selectionAfterRemoval } from '../selection/list-selection.ts';
import { slideStructureChange } from './boundary-protection.ts';

/** Native history owns the words; surviving writing selections retain their text. */
export function slideDeletionTransaction(
    state: EditorState,
    document: PresentationDocument,
    plan: SlideDeletion,
    livePreview = false
): TransactionSpec {
    let changes = state.changes(plan.changes);
    const remaining = new Set(plan.document.slides.map(slide => slide.id));
    const removed = document.slides.filter(slide => !remaining.has(slide.id));
    const nextId = selectionAfterRemoval(
        document.slides.map(slide => slide.id),
        new Set(removed.map(slide => slide.id))
    ).cursor;
    const next = plan.document.slides.find(slide => slide.id === nextId);
    const field = next?.blocks.find(block => block.kind === 'text');
    const relocate = state.selection.ranges.map(
        range =>
            range.map(changes).empty &&
            removed.some(
                slide => range.head >= slide.from && (range.head < slide.to || (range.head === state.doc.length && range.head === slide.to))
            )
    );
    if (livePreview && relocate.some(Boolean) && field && field.contentFrom === field.to && field.to < changes.newLength) {
        // A compact field needs one native caret line. Include it in this history
        // event so focusing the surviving slide cannot add a second undo step.
        changes = changes.compose(ChangeSet.of({ from: field.contentFrom - 1, insert: '\n' }, changes.newLength));
    }
    const position = field
        ? !livePreview && field.contentFrom === field.to
            ? field.from
            : field.contentFrom
        : (next?.markerTo ?? changes.newLength);
    return {
        changes,
        selection: EditorSelection.create(
            state.selection.ranges.map((range, index) => (relocate[index] ? EditorSelection.cursor(position) : range.map(changes))),
            state.selection.mainIndex
        ),
        userEvent: 'delete.markdownpoint',
        annotations: [slideStructureChange.of(true), isolateHistory.of('full')]
    };
}
