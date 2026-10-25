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
import { EditorSelection } from '@codemirror/state';
import type { ChangeDesc, EditorState, Transaction, TransactionSpec } from '@codemirror/state';
import type { PresentationDocument } from '../format/document.ts';
import { reorderSlideSource } from '../format/reorder.ts';
import type { SlideReorder } from '../format/reorder.ts';
import { slideStructureChange } from './boundary-protection.ts';

/** Preserve native text ranges by their slide/section identity and local offset. */
function reorderedSelection(
    state: EditorState,
    document: PresentationDocument,
    next: PresentationDocument,
    changes: ChangeDesc
): EditorSelection {
    const length = changes.newLength;
    const contains = (range: { from: number; to: number }, position: number): boolean =>
        position >= range.from && (position < range.to || (position === state.doc.length && position === range.to));
    const mapPosition = (position: number): number => {
        const slide = document.slides.find(slide => contains(slide, position));
        const section = slide ? undefined : document.sections.find(section => contains(section, position));
        const before = slide ?? section;
        const after = slide
            ? next.slides.find(candidate => candidate.id === slide.id)
            : section
              ? next.sections.find(candidate => candidate.id === section.id)
              : undefined;
        if (!before || !after) return changes.mapPos(position);
        // A former EOF caret stays inside its slide rather than landing on the
        // following slide's marker after that slide moves earlier.
        return Math.min(after.from + position - before.from, after.to - (after.to < length ? 1 : 0));
    };
    return EditorSelection.create(
        state.selection.ranges.map(range => EditorSelection.range(mapPosition(range.anchor), mapPosition(range.head))),
        state.selection.mainIndex
    );
}

/** Native history can only map offsets through a replacement; retain the writing identity through repeated moves. */
export function historyReorderSelection(
    transaction: Transaction,
    before: PresentationDocument,
    after: PresentationDocument
): EditorSelection | null {
    if (!transaction.docChanged || !(transaction.isUserEvent('undo') || transaction.isUserEvent('redo'))) return null;
    const order = (document: PresentationDocument) =>
        [
            ...document.slides.map(part => ({ from: part.from, key: `slide:${part.id}` })),
            ...document.sections.map(part => ({ from: part.from, key: `section:${part.id}` }))
        ]
            .sort((a, b) => a.from - b.from)
            .map(part => part.key);
    const prior = order(before),
        current = order(after),
        known = new Set(prior);
    if (prior.length !== current.length || current.some(key => !known.has(key)) || prior.every((key, index) => key === current[index]))
        return null;
    const selection = reorderedSelection(transaction.startState, before, after, transaction.changes);
    return selection.eq(transaction.newSelection) ? null : selection;
}

export function slideReorderTransaction(
    state: EditorState,
    document: PresentationDocument,
    ids: Iterable<string>,
    action: SlideReorder
): TransactionSpec | null {
    const planned = reorderSlideSource(state.doc.toString(), document, ids, action);
    if (!planned) return null;
    const changes = state.changes({ from: planned.from, to: planned.to, insert: planned.insert });
    return {
        changes,
        selection: reorderedSelection(state, document, planned.document, changes),
        userEvent: 'move.markdownpoint',
        annotations: [slideStructureChange.of(true), isolateHistory.of('full')]
    };
}
