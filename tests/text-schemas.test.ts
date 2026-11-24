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
import { copyTextSchemas } from '../src/format/text-schemas.ts';
import { prepareCopiedPart } from '../src/format/prepare-copy.ts';

const master = {
    markdownpoint: '1.0',
    type: 'master',
    objects: [
        { id: 'inherited-grid', type: 'table' },
        { id: 'caption', type: 'text' }
    ]
};
const layout = { markdownpoint: '1.0', type: 'layout', objects: [{ id: 'title', type: 'text', placeholder: true }] };
const theme = { master, layout, layoutKey: 'title' };
const fields = (ids: string[]) =>
    indexPresentation('<!-- slide: one -->\n' + ids.map(id => `<!-- text: ${id} -->\n`).join(''), 0)!.slides[0]!;

test('field schemas come from actual own and inherited object types, never their writing labels', () => {
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
        fields(['title', 'inherited-grid', 'caption', 'body', 'data', 'chart', 'shape', 'unbound']),
        record,
        theme
    )!;
    assert.deepEqual(
        [...result],
        [
            ['text:title', 'rich-text'],
            ['text:inherited-grid', 'table'],
            ['text:caption', 'rich-text'],
            ['text:body', 'table'],
            ['text:data', 'rich-text'],
            ['text:chart', 'table'],
            ['text:shape', 'rich-text'],
            ['text:unbound', 'rich-text']
        ]
    );
    assert.deepEqual(record.objects[0], 'title');
});

test('removed objects and same-level collisions follow the effective inherited types', () => {
    const part = fields(['inherited-grid', 'title', 'caption']);
    const collision = {
        layout: 'title',
        objects: [
            { id: 'inherited-grid', type: 'text' },
            { id: 'title', type: 'table' }
        ]
    };
    assert.deepEqual(
        [...copyTextSchemas(part, collision, theme)!],
        [
            ['text:inherited-grid', 'table'],
            ['text:title', 'rich-text'],
            ['text:caption', 'rich-text']
        ]
    );
    const removed = { ...theme, layout: { ...layout, overrides: { 'inherited-grid': null } } };
    const replacement = { layout: 'title', objects: [{ id: 'inherited-grid', type: 'chart' }] };
    assert.equal(copyTextSchemas(part, replacement, removed)!.get('text:inherited-grid'), 'table');
    assert.equal(
        copyTextSchemas(part, { layout: 'title', overrides: { 'inherited-grid': null } }, theme)!.get('text:inherited-grid'),
        'rich-text'
    );
    for (const type of ['camera', 'world']) {
        const kept = { ...theme, master: { ...master, objects: [{ id: type, type }] }, layout: { ...layout, overrides: { [type]: null } } };
        const collision = { layout: 'title', objects: [{ id: type, type: 'table' }] };
        assert.equal(copyTextSchemas(fields([type]), collision, kept)!.get(`text:${type}`), 'rich-text');
    }
});

test("a chart's words read as a table, a theme's and a slide's alike", () => {
    const charted = { ...theme, master: { ...master, objects: [...master.objects, { id: 'sales', type: 'chart' }] } };
    const record = {
        layout: 'title',
        objects: [
            { id: 'sales', type: 'chart' },
            { id: 'costs', type: 'chart' }
        ]
    };
    assert.deepEqual(
        [...copyTextSchemas(fields(['sales', 'costs']), record, charted)!],
        [
            ['text:sales', 'table'],
            ['text:costs', 'table']
        ]
    );
});

test('missing or mismatched Theme data and malformed object structures refuse schema resolution', () => {
    const part = fields(['title']);
    const record = { layout: 'title' };
    assert.equal(copyTextSchemas(part, record, null), null);
    for (const badTheme of [
        { ...theme, layoutKey: 'other' },
        { ...theme, master: {} },
        { ...theme, layout: null },
        { ...theme, layout: { ...layout, markdownpoint: 2 } }
    ]) {
        assert.equal(copyTextSchemas(part, record, badTheme), null);
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
        assert.equal(copyTextSchemas(part, bad, theme), null);
});

test('resolved schemas drive complete-copy preparation for visually identical table-shaped fields', () => {
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
    const schemas = copyTextSchemas(part, record, theme)!;
    const copied = prepareCopiedPart(
        { id: 'one', markdown, record: JSON.stringify(record) },
        new Map([
            ['one', 'copy-one'],
            ['two', 'copy-two']
        ]),
        schemas
    )!;
    assert.equal(copied.markdown, markdown.replace('slide: one', 'slide: copy-one').replace('[Go](slide:two)', '[Go](slide:copy-two)'));
});
