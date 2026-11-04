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
import { planSlideInsertion } from '../src/format/insert.ts';
import { isRecord } from '../src/format/recognition.ts';
import { prepareNewSlide } from '../src/format/new-slide.ts';
import type { EmbeddedTheme } from '../src/format/embedded-theme.ts';
import type { TextFieldLabels } from '../src/format/text-binding.ts';
import { slideInsertionTransaction } from '../src/editor/insert.ts';
import { missingSlots, validatedSlotInsertion } from '../src/editor/writing-fields.ts';
import { PresentationEditor } from '../src/editor/presentation-editor.ts';
import { NotesUi } from '../src/settings/notes-ui.ts';
import type { PresentationReader } from '../src/presentation/reader.ts';

const labels: TextFieldLabels = {
    names: { title: 'Title', body: 'Body', eyebrow: 'Eyebrow' },
    text: 'Text',
    numbered: ({ name, number }) => `${name} ${number}`
};
const deck =
    '<!-- slide: empty -->\n\n' +
    '<!-- slide: words -->\n<!-- text: body -->\nWords.\n\n' +
    '<!-- slide: noted -->\n<!-- text: title -->\nA title\n<!-- notes -->\nSay it.\n\n' +
    '<!-- slide: own -->\n<!-- text: chart -->\nNorth\n\n<!-- notes -->\nPoint.\n';
const slots = new Map<string, readonly string[]>([
    ['empty', ['eyebrow', 'title', 'body']],
    ['words', ['title', 'body']],
    ['noted', ['title', 'body']],
    ['own', ['title', 'body']]
]);
const at = (text: string) => deck.indexOf(text);

test("a layout's slots without blocks go in its reading order among the slot blocks, else after the words, before notes", () => {
    const missing = missingSlots(indexPresentation(deck, 0)!, slots, labels);
    assert.deepEqual(
        missing.map(slot => [slot.slideId, slot.id, slot.label, slot.at, slot.opening]),
        [
            ['empty', 'eyebrow', 'Eyebrow', at('<!-- slide: words'), true],
            ['empty', 'title', 'Title', at('<!-- slide: words'), true],
            ['empty', 'body', 'Body', at('<!-- slide: words'), true],
            ['words', 'title', 'Title', at('<!-- text: body'), true],
            ['noted', 'body', 'Body', at('<!-- notes -->\nSay'), false],
            ['own', 'title', 'Title', at('<!-- notes -->\nPoint'), false],
            ['own', 'body', 'Body', at('<!-- notes -->\nPoint'), false]
        ]
    );
});

test('writing in a missing slot adds only its marker, with the caret on its writable line', () => {
    const document = indexPresentation(deck, 0)!;
    const write = (slideId: string, id: string) => {
        const slot = missingSlots(document, slots, labels).find(slot => slot.slideId === slideId && slot.id === id)!;
        const insertion = validatedSlotInsertion(deck, document, slot)!;
        assert.ok(insertion);
        const written = deck.slice(0, insertion.from) + insertion.insert + deck.slice(insertion.from);
        const block = indexPresentation(written, 0)!
            .slides.find(slide => slide.id === slideId)!
            .blocks.find(block => block.id === id)!;
        assert.equal(block.contentFrom, insertion.cursor);
        return written;
    };
    assert.equal(write('empty', 'title'), deck.replace('<!-- slide: empty -->\n\n', '<!-- slide: empty -->\n\n<!-- text: title -->\n\n'));
    assert.equal(write('words', 'title'), deck.replace('<!-- slide: words -->\n', '<!-- slide: words -->\n\n<!-- text: title -->\n\n'));
    assert.equal(write('noted', 'body'), deck.replace('A title\n', 'A title\n\n<!-- text: body -->\n\n'));
    const document2 = indexPresentation(write('words', 'title'), 0)!;
    assert.equal(
        missingSlots(document2, slots, labels).some(slot => slot.slideId === 'words'),
        false
    );
    const stale = missingSlots(document, slots, labels).find(slot => slot.slideId === 'words')!;
    assert.equal(validatedSlotInsertion(write('words', 'title'), document2, stale), null);
});

/** The draft's fields for slots without blocks; the widget class is internal to the editor. */
function missingFields(state: EditorState): number {
    let fields = 0;
    for (const decorations of state.facet(EditorView.decorations)) {
        if (typeof decorations === 'function') continue;
        for (const cursor = decorations.iter(); cursor.value; cursor.next()) {
            const spec: unknown = cursor.value.spec;
            if (isRecord(spec) && spec.widget?.constructor.name === 'MissingField') fields++;
        }
    }
    return fields;
}

test('Live Preview shows each missing slot as an empty field until its marker stands, mapped while parsing stops', () => {
    const reader = {
        snapshot(_file: unknown, markdown: string) {
            const document = indexPresentation(markdown, 0);
            return (
                document && {
                    id: 'document',
                    bodyStart: 0,
                    document,
                    images: new Map(),
                    slots,
                    outline: { slides: document.slides.map(slide => ({ id: slide.id, skipped: false })), sections: [] }
                }
            );
        },
        matchesIdentity: () => true
    } as unknown as PresentationReader;
    const notes = new NotesUi({ loadLocalStorage: () => null, saveLocalStorage: () => undefined });
    const owner = new PresentationEditor(reader, notes, () => undefined);
    let state = EditorState.create({ doc: deck, extensions: [editorInfoField, editorLivePreviewField, owner.extension] });
    assert.equal(missingFields(state), 7);
    state = state.update({ changes: { from: at('<!-- text: body'), insert: '<!-- text: title -->\nHeader\n' } }).state;
    assert.equal(missingFields(state), 6);
    state = state.update({ changes: { from: state.doc.toString().indexOf('Words.'), insert: '~~~js\n' } }).state;
    assert.equal(indexPresentation(state.doc.toString(), 0), null);
    assert.equal(missingFields(state), 6);
});

function layoutTheme(): EmbeddedTheme {
    const value = {
        objects: [
            { id: 'body', type: 'text', placeholder: true, frame: { x: 80, y: 300, width: 600, height: 240 } },
            { id: 'title', type: 'text', placeholder: true, frame: { x: 80, y: 150, width: 600, height: 100 } }
        ]
    };
    return {
        key: 'basic',
        id: 'theme',
        root: 'deck/themes/basic',
        master: { path: 'master.json', source: '{}', value: {} },
        layouts: new Map([['title', { path: 'title.json', source: JSON.stringify(value), value }]])
    };
}

test('a new slide opens on its first slot in Live Preview and Source mode, the others shown until they have words', () => {
    const source = '<!-- slide: one -->\n<!-- text: title -->\nOne\n\n<!-- slide: two -->\n<!-- text: title -->\nTwo\n';
    const part = prepareNewSlide(layoutTheme(), 'title', 'new')!;
    for (const [after, livePreview, expected] of [
        ['one', true, source.replace('<!-- slide: two', '<!-- slide: new -->\n\n<!-- text: title -->\n\n<!-- slide: two')],
        ['one', false, source.replace('<!-- slide: two', '<!-- slide: new -->\n\n<!-- text: title -->\n\n<!-- slide: two')],
        ['two', true, source + '\n<!-- slide: new -->\n\n<!-- text: title -->\n']
    ] as const) {
        const state = EditorState.create({ doc: source });
        const plan = planSlideInsertion(source, indexPresentation(source, 0)!, '{"slides":{"one":{},"two":{}}}', [part], after, 0)!;
        const next = state.update(slideInsertionTransaction(state, plan, 'new', livePreview)!).state;
        assert.equal(next.doc.toString(), expected, `${after} ${livePreview}`);
        const document = indexPresentation(expected, 0)!;
        const slide = document.slides.find(slide => slide.id === 'new')!;
        assert.equal(next.selection.main.head, slide.blocks[0]!.contentFrom);
        const others = missingSlots(document, new Map([['new', ['title', 'body']]]), labels);
        assert.deepEqual(
            others.map(slot => [slot.id, slot.at]),
            [['body', slide.blocks[0]!.to]]
        );
    }
});
