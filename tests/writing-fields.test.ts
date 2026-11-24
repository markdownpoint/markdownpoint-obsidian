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
import { indexPresentation } from '../src/format/document.ts';
import { compactFieldAt, writingFields } from '../src/editor/writing-fields.ts';
import { blankFold, selectionOnBlank, writingAreaDecorations } from '../src/editor/field-widgets.ts';
import { EditorState } from '@codemirror/state';
import { en } from '../src/i18n/locales/en.ts';
import { slideNotes } from '../src/editor/notes.ts';

const labels = en.fields;

test('writing fields keep empty roles, original marker bytes, and native content ranges', () => {
    const markdown =
        '<!-- slide: first -->\r\n<!-- text: eyebrow -->\r\n\r\n<!-- text: title -->\r\nA clear idea.\r\n\r\n<!-- text: body -->\r\n';
    const fields = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
    assert.deepEqual(
        fields.map(field => [field.key, field.label, field.populated]),
        [
            ['first:text:eyebrow', 'Eyebrow', false],
            ['first:text:title', 'Title', true],
            ['first:text:body', 'Body', false]
        ]
    );
    assert.deepEqual(
        fields.map(field => field.opening),
        [true, false, false]
    );
    for (const field of fields) assert.equal(field.markerText, markdown.slice(field.from, field.contentFrom));
    assert.equal(markdown.slice(fields[1]!.contentFrom, fields[1]!.to).trim(), 'A clear idea.');
    assert.equal(fields[2]!.contentFrom, markdown.length);
});

test('custom writing areas receive labels while presenter notes retain their own disclosure', () => {
    const markdown =
        '<!-- slide: first -->\n<!-- text: data-table -->\nRaw table content.\n<!-- notes -->\nA private reminder.\n<!-- text: body -->\nBody words.\n';
    const fields = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
    assert.deepEqual(
        fields.map(field => [field.role, field.label]),
        [
            ['body', 'Data table'],
            ['body', 'Body']
        ]
    );
});

test('compact empty fields preserve a zero-length payload before the following marker', () => {
    const markdown = '<!-- slide: first -->\n<!-- text: title -->\n<!-- text: body -->\n<!-- slide: second -->\n';
    const fields = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
    assert.equal(fields.length, 2);
    assert.ok(fields.every(field => !field.populated && field.contentFrom === field.to));
});

test('a shared marker position belongs to the preceding compact writing field', () => {
    const markdown = '<!-- slide: first -->\n<!-- text: title -->\n<!-- text: body -->\n<!-- slide: second -->\n<!-- text: eyebrow -->\n';
    const document = indexPresentation(markdown, 0)!;
    const fields = writingFields(markdown, document, labels);
    assert.equal(compactFieldAt(fields, fields[1]!.from, markdown.length)?.key, 'first:text:title');
    assert.equal(compactFieldAt(fields, document.slides[1]!.from, markdown.length)?.key, 'first:text:body');
    assert.equal(compactFieldAt(fields, markdown.length, markdown.length), undefined);
});

test('numbered fields and allocated copies retain independent identities', () => {
    const ids = ['title-2', 'title-id-b7d9e1', 'body-2', 'body-3', 'caption-id-f9h2k4', 'id-m4n6p8', 'notes'];
    const markdown = '<!-- slide: first -->\n' + ids.map(id => `<!-- text: ${id} -->\n\n`).join('') + '<!-- notes -->\n\n';
    const document = indexPresentation(markdown, 0)!;
    const fields = writingFields(markdown, document, labels);
    assert.deepEqual(
        fields.map(field => [field.label, field.role]),
        [
            ['Title 2', 'title'],
            ['Title', 'title'],
            ['Body 2', 'body'],
            ['Body 3', 'body'],
            ['Caption', 'body'],
            ['Text', 'body'],
            ['Notes', 'body']
        ]
    );
    const keys = [...fields.map(field => field.key), slideNotes(markdown, document, 'Notes')[0]!.field!.key];
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(fields.every(field => field.markerText === markdown.slice(field.from, field.contentFrom)));
});

test("a field is named after its object's id, and only the id title is a title", () => {
    const ids = ['intro-title', 'title', 'body-2', 'label-id-b7d9e1'];
    const markdown = '<!-- slide: first -->\n' + ids.map(id => `<!-- text: ${id} -->\nWords.\n\n`).join('');
    const fields = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
    assert.deepEqual(
        fields.map(field => [field.key, field.label, field.role]),
        [
            ['first:text:intro-title', 'Intro title', 'body'],
            ['first:text:title', 'Title', 'title'],
            ['first:text:body-2', 'Body 2', 'body'],
            ['first:text:label-id-b7d9e1', 'Label', 'body']
        ]
    );
});

test('one organizational blank line ends a block with no height of its own; each blank line before it stays a row', () => {
    const folded = (markdown: string) => {
        const state = EditorState.create({ doc: markdown });
        const [field] = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
        const ranges: [number, number][] = [];
        for (const range of writingAreaDecorations(state, field!, false, new Set())) {
            const spec = range.value.spec as { block?: boolean; widget?: unknown };
            if (spec.block && !spec.widget) ranges.push([range.from, range.to]);
        }
        return { ranges, words: markdown.indexOf('Words.') + 'Words.\n'.length };
    };
    const next = '<!-- slide: next -->\n';
    // The blank line MarkdownPoint writes before the next marker folds away
    const one = folded(`<!-- slide: one -->\n<!-- text: body -->\nWords.\n\n${next}`);
    assert.deepEqual(one.ranges, [[one.words, one.words + 1]]);
    // Two blank lines show one row: only the last folds, so a line Enter adds after the words stays where the caret writes
    const two = folded(`<!-- slide: one -->\n<!-- text: body -->\nWords.\n\n\n${next}`);
    assert.deepEqual(two.ranges, [[two.words + 1, two.words + 2]]);
    const three = folded(`<!-- slide: one -->\n<!-- text: body -->\nWords.\n\n\n\n${next}`);
    assert.deepEqual(three.ranges, [[three.words + 2, three.words + 3]]);
    // At the end of the file, too, only the last blank line folds
    const end = folded('<!-- slide: one -->\n<!-- text: body -->\nWords.\n\n\n');
    assert.deepEqual(end.ranges, [[end.words + 1, end.words + 2]]);
    // Spaces after the file's last line break are a row of their own, as the file's last row is: the blank line folds alone
    const tail = folded('<!-- slide: one -->\n<!-- text: body -->\nWords.\n\n  ');
    assert.deepEqual(tail.ranges, [[tail.words, tail.words + 1]]);
    // A blank line an edit leaves a caret on stays shown; a caret on it is one on that line, never on the file's last row
    const markdown = `<!-- slide: one -->\n<!-- text: body -->\nWords.\n\n${next}`;
    const [field] = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
    const on = (doc: string, head: number) => {
        const state = EditorState.create({ doc, selection: { anchor: head } });
        const [first] = writingFields(doc, indexPresentation(doc, 0)!, labels);
        return selectionOnBlank(state, first!, blankFold(state, first!)!);
    };
    assert.deepEqual(
        [one.words - 1, one.words, one.words + 1].map(head => on(markdown, head)),
        [false, true, false]
    );
    assert.equal(blankFold(EditorState.create({ doc: markdown }), field!), one.words);
    const shown = EditorState.create({ doc: markdown, selection: { anchor: one.words } });
    assert.deepEqual(
        writingAreaDecorations(shown, field!, false, new Set([one.words])).filter(
            range => range.from === one.words && range.to > range.from
        ),
        []
    );
    const ended = '<!-- slide: one -->\n<!-- text: body -->\nWords.\n\n';
    assert.equal(on(ended, ended.length), false);
    const spaces = '<!-- slide: one -->\n<!-- text: body -->\nWords.\n\n  ';
    assert.equal(on(spaces, spaces.length), false);
    // A selection begun on the line keeps it, one that only passes over it does not
    const selected = (doc: string, anchor: number, head: number) => {
        const [first] = writingFields(doc, indexPresentation(doc, 0)!, labels);
        const state = EditorState.create({ doc, selection: { anchor, head } });
        return selectionOnBlank(state, first!, blankFold(state, first!)!);
    };
    assert.equal(selected(markdown, one.words, one.words - 3), true);
    assert.equal(selected(markdown, markdown.indexOf('Words.'), markdown.indexOf(next)), false);
    // A block whose words end the file, or with no words, folds nothing
    assert.deepEqual(folded('<!-- slide: one -->\n<!-- text: body -->\nWords.').ranges, []);
});
