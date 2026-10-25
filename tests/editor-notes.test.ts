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

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { editorInfoField, editorLivePreviewField } from './support/obsidian.ts';
import { indexPresentation } from '../src/format/document.ts';
import { isRecord } from '../src/format/recognition.ts';
import { slideNotes } from '../src/editor/notes.ts';
import { notesDecorations } from '../src/editor/notes-widgets.ts';
import { PresentationEditor } from '../src/editor/presentation-editor.ts';
import { NotesUi } from '../src/settings/notes-ui.ts';
import type { PresentationReader } from '../src/presentation/reader.ts';

/** Where the notes decorations let a line take the direction of its own text. */
function autoDirectionLines(markdown: string, open: boolean): number[] {
    const slots = slideNotes(markdown, indexPresentation(markdown, 0)!, 'Notes');
    const opened = new Set(open ? slots.map(slot => slot.slideId) : []);
    const actions = { toggle: () => undefined, edit: () => undefined };
    return notesDecorations(EditorState.create({ doc: markdown }), slots, opened, false, new Set(), actions)
        .filter(range => {
            const spec: unknown = range.value.spec;
            return isRecord(spec) && isRecord(spec.attributes) && spec.attributes.dir === 'auto';
        })
        .map(range => range.from);
}

test("an open note's first line takes its own text direction beside the hidden notes marker", () => {
    const markdown =
        '<!-- slide: first -->\n<!-- text: title -->\nIdea.\n<!-- notes -->\nPause here.\nThen go on.\n<!-- slide: second -->\n';
    assert.deepEqual(autoDirectionLines(markdown, true), [markdown.indexOf('Pause here.')]);
    assert.deepEqual(autoDirectionLines(markdown, false), []);
    assert.deepEqual(autoDirectionLines('<!-- slide: first -->\n<!-- notes -->\n<!-- slide: second -->\n', true), []);
});

/** The draft's presenter notes rows; the widget class is internal to the editor. */
function notesRows(state: EditorState): number {
    let rows = 0;
    for (const decorations of state.facet(EditorView.decorations)) {
        if (typeof decorations === 'function') continue;
        for (const cursor = decorations.iter(); cursor.value; cursor.next()) {
            const spec: unknown = cursor.value.spec;
            if (isRecord(spec) && spec.widget?.constructor.name === 'NotesDisclosure') rows++;
        }
    }
    return rows;
}

test('slides without notes keep their notes row while an unclosed fence stops parsing', () => {
    const source = '<!-- slide: first -->\n<!-- text: body -->\nWords.\n\n<!-- slide: second -->\n<!-- text: body -->\nMore.\n';
    const reader = {
        snapshot(_file: unknown, markdown: string) {
            const document = indexPresentation(markdown, 0);
            return (
                document && {
                    id: 'document',
                    bodyStart: 0,
                    document,
                    images: new Map(),
                    outline: { slides: document.slides.map(slide => ({ id: slide.id, skipped: false })), sections: [] }
                }
            );
        },
        matchesIdentity: () => true
    } as unknown as PresentationReader;
    const notes = new NotesUi({ loadLocalStorage: () => null, saveLocalStorage: () => undefined });
    const owner = new PresentationEditor(reader, notes, () => undefined);
    let state = EditorState.create({ doc: source, extensions: [editorInfoField, editorLivePreviewField, owner.extension] });
    assert.equal(notesRows(state), 2);
    state = state.update({ changes: { from: source.indexOf('Words.'), insert: '~~~js\n' } }).state;
    assert.equal(indexPresentation(state.doc.toString(), 0), null);
    assert.equal(notesRows(state), 2);
});
