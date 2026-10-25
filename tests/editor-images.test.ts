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
import test from 'node:test';
import './support/editor-hooks.ts';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { editorInfoField, editorLivePreviewField } from './support/obsidian-fields.ts';
import { indexPresentation } from '../src/format/document.ts';
import { isRecord } from '../src/format/recognition.ts';
import { ImageSpace, setImageSpacing } from '../src/editor/image-spacing.ts';
import { NotesUi } from '../src/settings/notes-ui.ts';
import type { PresentationReader } from '../src/presentation/reader.ts';

const { PresentationEditor } = await import('../src/editor/presentation-editor.ts');

function spacers(state: EditorState): { at: number; height: number }[] {
    const found: { at: number; height: number }[] = [];
    for (const decorations of state.facet(EditorView.decorations)) {
        if (typeof decorations === 'function') continue;
        for (const cursor = decorations.iter(); cursor.value; cursor.next()) {
            const spec: unknown = cursor.value.spec;
            const widget = isRecord(spec) ? spec.widget : undefined;
            if (widget instanceof ImageSpace) found.push({ at: cursor.from, height: widget.estimatedHeight });
        }
    }
    return found;
}

void test('unfinished code fences retain image clearance at mapped slide ends until parsing recovers', () => {
    const source = '<!-- slide: first -->\n<!-- text: body -->\nWords.\n\n<!-- slide: second -->\n<!-- text: body -->\nMore.\n';
    const images = [{ path: 'Talk/media/a.png', src: 'app://a', name: null }];
    let matchesIdentity = true;
    const reader = {
        snapshot(_file: unknown, markdown: string) {
            if (!matchesIdentity) return null;
            const document = indexPresentation(markdown, 0);
            return (
                document && {
                    id: 'document',
                    bodyStart: 0,
                    document,
                    images: new Map(document.slides.map(slide => [slide.id, images])),
                    outline: { slides: document.slides.map(slide => ({ id: slide.id, skipped: false })), sections: [] }
                }
            );
        },
        matchesIdentity: () => matchesIdentity
    } as unknown as PresentationReader;
    const notes = new NotesUi({ loadLocalStorage: () => null, saveLocalStorage: () => undefined });
    const owner = new PresentationEditor(reader, notes, () => undefined);
    let state = EditorState.create({ doc: source, extensions: [editorInfoField, editorLivePreviewField, owner.extension] });
    state = state.update({
        effects: setImageSpacing.of({
            id: 'document',
            heights: new Map([
                ['first', 140],
                ['second', 120]
            ])
        })
    }).state;
    const original = spacers(state);
    assert.equal(original.length, 2);
    const opening = '~~~js\n',
        insertion = source.indexOf('Words.');
    state = state.update({ changes: { from: insertion, insert: opening } }).state;
    assert.equal(indexPresentation(state.doc.toString(), 0), null);
    assert.deepEqual(
        spacers(state),
        original.map(space => ({ ...space, at: space.at + opening.length }))
    );
    const closing = '\n~~~';
    state = state.update({ changes: { from: state.doc.toString().indexOf('Words.') + 6, insert: closing } }).state;
    assert.notEqual(indexPresentation(state.doc.toString(), 0), null);
    assert.deepEqual(
        spacers(state),
        original.map(space => ({ ...space, at: space.at + opening.length + closing.length }))
    );
    matchesIdentity = false;
    state = state.update({ changes: { from: insertion, insert: '~~~\n' } }).state;
    assert.equal(spacers(state).length, 0, 'an unrelated or unrecognized source cannot retain old image chrome');
});
