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

import type { EditorState, Extension } from '@codemirror/state';
import { Decoration, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import type { PresentationDocument } from '../format/document.ts';
import { wordFields } from './span-marks.ts';

/** A paragraph's id at the end of its last line, with the space before it: the id a step's paragraph cue names it by. */
const PARAGRAPH_ID = / <!-- id: [A-Za-z0-9-]+ -->$/;
const hiddenId = Decoration.replace({});

/** Where each line of a presentation's words ends with a paragraph's id. */
export function paragraphIds(state: EditorState, document: PresentationDocument): { from: number; to: number }[] {
    const ids: { from: number; to: number }[] = [];
    for (const field of wordFields(document)) {
        if (field.to <= field.from) continue;
        for (let line = state.doc.lineAt(field.from); ; line = state.doc.line(line.number + 1)) {
            const id = PARAGRAPH_ID.exec(line.text);
            if (id) ids.push({ from: line.from + id.index, to: line.to });
            if (line.to >= field.to || line.number === state.doc.lines) break;
        }
    }
    return ids;
}

/**
 * Hide each paragraph's id, which says nothing to a reader, as Live Preview hides a line's marks: a line that holds the
 * caret or a selection shows it.
 */
export function paragraphIdDecorations(state: EditorState, ids: readonly { from: number; to: number }[]): DecorationSet {
    return Decoration.set(
        ids.flatMap(id => {
            const line = state.doc.lineAt(id.from);
            return state.selection.ranges.some(range => range.from <= line.to && range.to >= line.from)
                ? []
                : [hiddenId.range(id.from, id.to)];
        })
    );
}

/** Live Preview's hidden paragraph ids, for the presentation `document` reads from the editor's state. */
export function paragraphIdMarks(document: (state: EditorState) => PresentationDocument | null): Extension {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet = Decoration.none;
            private document: PresentationDocument | null = null;
            private ids: readonly { from: number; to: number }[] = [];

            constructor(view: EditorView) {
                this.refresh(view.state, true);
            }

            update(update: ViewUpdate): void {
                const reread = update.docChanged || document(update.state) !== this.document;
                if (reread || update.selectionSet) this.refresh(update.state, reread);
            }

            private refresh(state: EditorState, reread: boolean): void {
                if (reread) {
                    this.document = document(state);
                    this.ids = this.document ? paragraphIds(state, this.document) : [];
                }
                this.decorations = paragraphIdDecorations(state, this.ids);
            }
        },
        { decorations: value => value.decorations }
    );
}
