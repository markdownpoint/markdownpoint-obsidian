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
import { controlTextSchemas, copyTextSchemas } from '../src/format/text-schemas.ts';
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
const noControls = new Map();
const fields = (ids: string[], kind = 'slide', id = 'one') =>
    indexPresentation(`<!-- ${kind}: ${id} -->\n` + ids.map(id => `<!-- text: ${id} -->\n`).join(''), 0)![
        kind === 'slide' ? 'slides' : 'compositions'
    ][0]!;

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
        fields(['title', 'inherited-grid', 'caption', 'body', 'data', 'chart', 'shape']),
        'slide',
        record,
        theme,
        noControls
    )!;
    assert.deepEqual(
        [...result],
        [
            ['text:title', ['rich-text']],
            ['text:inherited-grid', ['table']],
            ['text:caption', ['rich-text']],
            ['text:body', ['table']],
            ['text:data', ['rich-text']],
            ['text:chart', ['chart']],
            ['text:shape', ['rich-text']]
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
        [...copyTextSchemas(part, 'slide', collision, theme, noControls)!],
        [
            ['text:inherited-grid', ['table']],
            ['text:title', ['rich-text']],
            ['text:caption', ['rich-text']]
        ]
    );
    const removed = { ...theme, layout: { ...layout, overrides: { 'inherited-grid': null } } };
    const replacement = { layout: 'title', objects: [{ id: 'inherited-grid', type: 'chart' }] };
    assert.deepEqual(copyTextSchemas(part, 'slide', replacement, removed, noControls)!.get('text:inherited-grid'), ['chart']);
    assert.deepEqual(
        copyTextSchemas(part, 'slide', { layout: 'title', overrides: { 'inherited-grid': null } }, theme, noControls)!.get(
            'text:inherited-grid'
        ),
        ['rich-text']
    );
    for (const type of ['camera', 'world']) {
        const kept = { ...theme, master: { ...master, objects: [{ id: type, type }] }, layout: { ...layout, overrides: { [type]: null } } };
        const collision = { layout: 'title', objects: [{ id: type, type: 'table' }] };
        assert.deepEqual(copyTextSchemas(fields([type]), 'slide', collision, kept, noControls)!.get(`text:${type}`), ['rich-text']);
    }
});

test("only a part's own chart reads its cells by its presentation's language: a theme's chart, and a slide's object colliding with it, stay a table", () => {
    const charted = { ...theme, master: { ...master, objects: [...master.objects, { id: 'sales', type: 'chart' }] } };
    const record = {
        layout: 'title',
        objects: [
            { id: 'sales', type: 'chart' },
            { id: 'costs', type: 'chart' }
        ]
    };
    assert.deepEqual(
        [...copyTextSchemas(fields(['sales', 'costs']), 'slide', record, charted, noControls)!],
        [
            ['text:sales', ['table']],
            ['text:costs', ['chart']]
        ]
    );
    const definition = fields(['costs'], 'composition', 'card');
    assert.deepEqual(
        copyTextSchemas(definition, 'composition', { objects: [{ id: 'costs', type: 'chart' }] }, null, noControls)!.get('text:costs'),
        ['chart']
    );
});

test('definitions use their own types while an instance control of a definition not copied and unbound text remain rich text', () => {
    const part = fields(['grid', 'inherited-grid', 'callout.caption', 'unbound'], 'composition', 'card');
    const record = {
        objects: [
            { id: 'grid', type: 'table' },
            { id: 'callout', type: 'instance', composition: 'inner' }
        ]
    };
    assert.deepEqual(
        [...copyTextSchemas(part, 'composition', record, theme, noControls)!],
        [
            ['text:grid', ['table']],
            ['text:inherited-grid', ['rich-text']],
            ['text:callout.caption', ['rich-text']],
            ['text:unbound', ['rich-text']]
        ]
    );
});

test("a text control's words read as each member bound to show them, its default and an instance's value alike, apart from an object of its id", () => {
    const grid = {
        controls: [
            { id: 'rows', type: 'text' },
            { id: 'caption', type: 'text' },
            { id: 'both', type: 'text' },
            { id: 'loose', type: 'text' },
            { id: 'tint', type: 'color' }
        ],
        objects: [
            { id: 'cells', type: 'table', bindings: { text: 'rows' } },
            { id: 'caption', type: 'chart' },
            { id: 'label', type: 'text', bindings: { text: 'caption' } },
            { id: 'mirror', type: 'table', bindings: { text: 'both' } },
            { id: 'echo', type: 'text', bindings: { text: 'both' } },
            { id: 'swatch', type: 'shape', bindings: { fill: 'tint' } }
        ]
    };
    const controls = controlTextSchemas(new Map([['grid', grid]]));
    assert.deepEqual(
        [...controls.get('grid')!],
        [
            ['rows', ['table']],
            ['caption', ['rich-text']],
            ['both', ['table', 'rich-text']],
            ['loose', ['rich-text']]
        ]
    );
    const markers = ['control: rows', 'control: caption', 'control: both', 'text: caption'].map(marker => `<!-- ${marker} -->\n`);
    const definition = indexPresentation('<!-- composition: grid -->\n' + markers.join(''), 0)!.compositions[0]!;
    assert.deepEqual(
        [...copyTextSchemas(definition, 'composition', grid, null, controls)!],
        [
            ['control:rows', ['table']],
            ['control:caption', ['rich-text']],
            ['control:both', ['table', 'rich-text']],
            ['text:caption', ['chart']]
        ]
    );
    const slide = { layout: 'title', objects: [{ id: 'card', type: 'instance', composition: 'grid' }] };
    assert.deepEqual(
        [...copyTextSchemas(fields(['card.rows', 'card.both', 'card.loose', 'gone.rows']), 'slide', slide, theme, controls)!],
        [
            ['text:card.rows', ['table']],
            ['text:card.both', ['table', 'rich-text']],
            ['text:card.loose', ['rich-text']],
            ['text:gone.rows', ['rich-text']]
        ]
    );
});

test('missing or mismatched Theme data and malformed object structures refuse schema resolution', () => {
    const part = fields(['title']);
    const record = { layout: 'title' };
    assert.equal(copyTextSchemas(part, 'slide', record, null, noControls), null);
    for (const badTheme of [
        { ...theme, layoutKey: 'other' },
        { ...theme, master: {} },
        { ...theme, layout: null },
        { ...theme, layout: { ...layout, markdownpoint: 2 } }
    ]) {
        assert.equal(copyTextSchemas(part, 'slide', record, badTheme, noControls), null);
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
        assert.equal(copyTextSchemas(part, 'slide', bad, theme, noControls), null);
    assert.equal(copyTextSchemas(part, 'composition', { objects: ['title'] }, null, noControls), null);
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
    const schemas = copyTextSchemas(part, 'slide', record, theme, noControls)!;
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
