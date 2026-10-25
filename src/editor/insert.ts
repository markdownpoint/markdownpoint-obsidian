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
import { ChangeSet } from '@codemirror/state';
import type { EditorState, TransactionSpec } from '@codemirror/state';
import type { SlideInsertion } from '../format/insert.ts';
import { indexPresentation } from '../format/document.ts';
import { slideStructureChange } from './boundary-protection.ts';

/** Insert the complete group as one native edit, ready to write in its first slide. */
export function slideInsertionTransaction(
    state: EditorState,
    plan: SlideInsertion,
    firstId: string,
    livePreview = false,
    bodyStart = 0
): TransactionSpec | null {
    let changes = state.changes(plan.changes);
    // CodeMirror normalizes incoming line endings. Resolve caret offsets from its
    // actual document, not the format plan's possibly mixed LF/CRLF source.
    const document = indexPresentation(changes.apply(state.doc).toString(), bodyStart);
    const first = document?.slides.find(slide => slide.id === firstId);
    if (!first) return null;
    const field = first.blocks.find(block => block.kind === 'text');
    if (livePreview && field && field.contentFrom === field.to && field.to < changes.newLength) {
        changes = changes.compose(ChangeSet.of({ from: field.contentFrom - 1, insert: '\n' }, changes.newLength));
    }
    const position = field ? (!livePreview && field.contentFrom === field.to ? field.from : field.contentFrom) : first.markerTo;
    return {
        changes,
        selection: { anchor: position },
        scrollIntoView: true,
        userEvent: 'input.markdownpoint',
        annotations: [slideStructureChange.of(true), isolateHistory.of('full')]
    };
}
