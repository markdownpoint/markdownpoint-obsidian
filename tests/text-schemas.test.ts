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
import { indexPresentation } from '../src/format/document.ts';
import { copyTextSchemas } from '../src/format/text-schemas.ts';
import { prepareCopiedPart } from '../src/format/prepare-copy.ts';

const master = {
    markdownpoint: 1,
    kind: 'master',
    objects: [
        { id: 'inherited-grid', type: 'table' },
        { id: 'caption', type: 'text' }
    ]
};
const layout = { markdownpoint: 1, kind: 'layout', objects: [{ id: 'title', type: 'text', placeholder: true }] };
const theme = { master, layout, layoutKey: 'title' };
const fields = (ids: string[], kind = 'slide', id = 'one') =>
    indexPresentation(`<!-- ${kind}: ${id} -->\n` + ids.map(id => `<!-- text: ${id} -->\n`).join(''), 0)![
        kind === 'slide' ? 'slides' : 'compositions'
    ][0]!;

void test('field schemas come from actual own and inherited object types, never their writing labels', () => {
    const record = {
        layout: 'title',
        objects: [
            'title',
            { id: 'body', type: 'table' },
            { id: 'data', type: 'text' },
            { id: 'chart', type: 'chart' },
            { id: 'shape', type: 'shape' }
        ]
    };
    const result = copyTextSchemas(
        fields(['title', 'inherited-grid', 'caption', 'body', 'data', 'chart', 'shape']),
        'slide',
        record,
        theme
    )!;
    assert.deepEqual(
        [...result],
        [
            ['title', 'rich-text'],
            ['inherited-grid', 'table'],
            ['caption', 'rich-text'],
            ['body', 'table'],
            ['data', 'rich-text'],
            ['chart', 'table'],
            ['shape', 'rich-text']
        ]
    );
    assert.deepEqual(record.objects[0], 'title');
});

void test('removed objects and same-level collisions follow the effective inherited types', () => {
    const part = fields(['inherited-grid', 'title', 'caption']);
    const collision = {
        layout: 'title',
        objects: [
            { id: 'inherited-grid', type: 'text' },
            { id: 'title', type: 'table' }
        ]
    };
    assert.deepEqual(
        [...copyTextSchemas(part, 'slide', collision, theme)!],
        [
            ['inherited-grid', 'table'],
            ['title', 'rich-text'],
            ['caption', 'rich-text']
        ]
    );
    const removed = { ...theme, layout: { ...layout, overrides: { 'inherited-grid': null } } };
    const replacement = { layout: 'title', objects: [{ id: 'inherited-grid', type: 'chart' }] };
    assert.equal(copyTextSchemas(part, 'slide', replacement, removed)!.get('inherited-grid'), 'table');
    assert.equal(
        copyTextSchemas(part, 'slide', { layout: 'title', overrides: { 'inherited-grid': null } }, theme)!.get('inherited-grid'),
        'rich-text'
    );
    for (const type of ['camera', 'world']) {
        const kept = { ...theme, master: { ...master, objects: [{ id: type, type }] }, layout: { ...layout, overrides: { [type]: null } } };
        const collision = { layout: 'title', objects: [{ id: type, type: 'table' }] };
        assert.equal(copyTextSchemas(fields([type]), 'slide', collision, kept)!.get(type), 'rich-text');
    }
});

void test('definitions use their own types while instance controls and unbound text remain rich text', () => {
    const part = fields(['grid', 'inherited-grid', 'callout.caption', 'unbound'], 'composition', 'card');
    const record = {
        objects: [
            { id: 'grid', type: 'table' },
            { id: 'callout', type: 'composition', source: 'inner' }
        ]
    };
    assert.deepEqual(
        [...copyTextSchemas(part, 'composition', record, theme)!],
        [
            ['grid', 'table'],
            ['inherited-grid', 'rich-text'],
            ['callout.caption', 'rich-text'],
            ['unbound', 'rich-text']
        ]
    );
});

void test('missing or mismatched Theme data and malformed object structures refuse schema resolution', () => {
    const part = fields(['title']),
        record = { layout: 'title' };
    assert.equal(copyTextSchemas(part, 'slide', record, null), null);
    for (const badTheme of [
        { ...theme, layoutKey: 'other' },
        { ...theme, master: {} },
        { ...theme, layout: null },
        { ...theme, layout: { ...layout, markdownpoint: 2 } }
    ]) {
        assert.equal(copyTextSchemas(part, 'slide', record, badTheme), null);
    }
    for (const bad of [
        null,
        { layout: 'title', objects: {} },
        { layout: 'title', objects: [null] },
        { layout: 'title', objects: [{ id: 'bad.id', type: 'text' }] },
        { layout: 'title', objects: [{ id: 'own', type: 'text' }, 'own'] },
        { layout: 'title', overrides: { title: { type: 'table' } } },
        { layout: 'title', overrides: { title: 4 } }
    ])
        assert.equal(copyTextSchemas(part, 'slide', bad, theme), null);
    assert.equal(copyTextSchemas(part, 'composition', { objects: ['title'] }, null), null);
});

void test('resolved schemas drive complete-copy preparation for visually identical table-shaped fields', () => {
    const table = '| Heading |\n| --- |\n| [Go](slide:two) |\n';
    const markdown = '<!-- slide: one -->\n<!-- text: body -->\n' + table + '\n<!-- text: data -->\n' + table;
    const record = {
        layout: 'title',
        objects: [
            { id: 'body', type: 'table' },
            { id: 'data', type: 'text' }
        ]
    };
    const part = indexPresentation(markdown, 0)!.slides[0]!;
    const schemas = copyTextSchemas(part, 'slide', record, theme)!;
    const copied = prepareCopiedPart(
        { id: 'one', markdown, record: JSON.stringify(record) },
        'slide',
        new Map([
            ['one', 'copy-one'],
            ['two', 'copy-two']
        ]),
        new Map(),
        schemas
    )!;
    assert.equal(copied.markdown, markdown.replace('slide: one', 'slide: copy-one').replace('[Go](slide:two)', '[Go](slide:copy-two)'));
});
