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
import { PresentationEditor } from '../src/editor/presentation-editor.ts';
import { NotesUi } from '../src/settings/notes-ui.ts';
import type { PresentationReader } from '../src/presentation/reader.ts';
import { CompanionDocument, reconcileSlideRecords } from '../src/format/companion.ts';
import { planSlideDeletion } from '../src/format/delete.ts';
import { indexPresentation } from '../src/format/document.ts';
import { planSlideInsertion } from '../src/format/insert.ts';
import { readJsonObject } from '../src/format/json.ts';
import { presentationIdentity } from '../src/format/recognition.ts';

// A presentation a newer MarkdownPoint saved as format 1.1: a key, an object type, a step's channel and a word form the
// plugin doesn't know, each kept as the file spells it.
const ID = '0f8c4d0e-6a1b-4c2d-9e3f-5a6b7c8d9e0f';
const header = `---\nmarkdownpoint: "1.1"\nid: ${ID}\n---\n\n`;
const block = (id: string, words: string) => `<!-- slide: ${id} -->\n<!-- text: title -->\n${words}\n<!-- notes -->\nRemember ${id}.\n\n`;
const sticker = String.raw`{ "layout": "title", "mood": "calm", "objects": [ { "id": "sticker", "type": "sticker", "tilt": 0.5 } ] }`;
const sparkle = String.raw`{ "layout": "content", "steps": [ { "id": "in", "duration": 1, "curves": { "title.sparkle": [ { "id": "k", "at": 0 } ] } } ] }`;
const spanned = block('a', 'Made by a [newer]{glow=2} MarkdownPoint.');
const markdown = header + spanned + block('b', 'Words for b.');
const companion = `{\n  "markdownpoint": "1.1",\n  "type": "presentation",\n  "id": "${ID}",\n  "handout": { "columns": 2 },\n  "slides": { "a": ${sticker}, "b": ${sparkle} },\n  "compositions": {}\n}\n`;
const apply = (source: string, changes: readonly { from: number; to: number; insert: string }[]) =>
    [...changes].reverse().reduce((text, change) => text.slice(0, change.from) + change.insert + text.slice(change.to), source);
const index = (source: string) => indexPresentation(source, header.length)!;
/** The companion's bytes around its slides: the version and the keys the plugin doesn't manage. */
const outside = (source: string) => source.slice(0, source.indexOf('"slides"')) + source.slice(source.indexOf(',\n  "compositions"'));
const records = (source: string) => [...CompanionDocument.read(source)!.records];

test("a presentation of a newer format minor opens, and what the plugin doesn't know stays as the file has it through an insertion, a deletion and its undo", () => {
    assert.equal(presentationIdentity({ markdownpoint: '1.1', id: ID }, readJsonObject(companion)), ID);
    const added = { id: 'c', markdown: block('c', 'Words for c.'), record: '{"layout":"title"}' };
    const inserted = planSlideInsertion(markdown, index(markdown), companion, [added], 'a', header.length)!;
    assert.ok(inserted);
    assert.equal(apply(markdown, inserted.changes), header + spanned + added.markdown + block('b', 'Words for b.'));
    assert.equal(outside(inserted.companion), outside(companion), 'the version and the keys around the slides stay as written');
    assert.deepEqual(records(inserted.companion), [
        ['a', sticker],
        ['b', sparkle],
        ['c', added.record]
    ]);
    const deleted = planSlideDeletion(markdown, index(markdown), companion, ['a'])!;
    assert.ok(deleted);
    assert.equal(apply(markdown, deleted.changes), header + block('b', 'Words for b.'));
    assert.equal(outside(deleted.companion), outside(companion));
    assert.deepEqual(records(deleted.companion), [['b', sparkle]]);
    const undone = reconcileSlideRecords(deleted.companion, new Map([['a', sticker]]), new Set(['a', 'b']))!;
    assert.ok(undone);
    assert.equal(outside(undone.companion), outside(companion));
    assert.deepEqual(
        records(undone.companion),
        [
            ['b', sparkle],
            ['a', sticker]
        ],
        "the deleted slide returns with the object the plugin doesn't know"
    );
});

test("in Live Preview a later minor's marker stays in view as written, and no edit crosses or enters it", () => {
    const later = `${header}<!-- slide: a -->\n<!-- text: title -->\nA title\n\n<!-- sticker: t -->\nTilted.\n\n<!-- notes -->\nSay it.\n`;
    const reader = {
        snapshot(_file: unknown, source: string) {
            const document = indexPresentation(source, header.length);
            return (
                document && {
                    id: ID,
                    bodyStart: header.length,
                    document,
                    images: new Map(),
                    placeholders: new Map(),
                    outline: { slides: document.slides.map(slide => ({ id: slide.id, skipped: false })), sections: [] }
                }
            );
        },
        matchesIdentity: () => true
    } as unknown as PresentationReader;
    const notes = new NotesUi({ loadLocalStorage: () => null, saveLocalStorage: () => undefined });
    const owner = new PresentationEditor(reader, notes, () => undefined);
    const state = EditorState.create({ doc: later, extensions: [editorInfoField, editorLivePreviewField, owner.extension] });
    const marker = later.indexOf('<!-- sticker');
    // A Delete at the end of the title's words would join the marker to them, and its block to the title
    for (const [userEvent, change] of [
        ['delete', { from: marker - 1, to: marker }],
        ['delete', { from: marker, to: marker + 4 }],
        ['input', { from: marker + 5, insert: 'x' }],
        ['input', { from: marker - 1, to: marker + 1, insert: 'Pasted' }]
    ] as const)
        assert.equal(state.update({ userEvent, changes: change }).docChanged, false, JSON.stringify(change));
    const words = later.indexOf('Tilted.');
    assert.equal(
        state.update({ userEvent: 'input', changes: { from: words, insert: 'Still ' } }).newDoc.toString(),
        later.replace('Tilted.', 'Still Tilted.')
    );
    for (const decorations of state.facet(EditorView.decorations)) {
        if (typeof decorations === 'function') continue;
        for (const cursor = decorations.iter(); cursor.value; cursor.next())
            assert.ok(
                cursor.to <= marker || cursor.from > marker,
                `a decoration over ${JSON.stringify(later.slice(cursor.from, cursor.to))}`
            );
    }
});
