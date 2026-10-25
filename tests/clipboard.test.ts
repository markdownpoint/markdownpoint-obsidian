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
import { decodeSlideClipboard, encodeSlideClipboard, SLIDE_CLIPBOARD_MIME } from '../src/format/clipboard.ts';
import { embeddedThemePaths, themeDocument } from '../src/format/embedded-theme.ts';
import { prepareSlideCopies } from '../src/format/copy.ts';

const uuid = '11111111-1111-4111-8111-111111111111';
const origin = { vault: uuid, document: uuid, path: 'Presentations/Å calm place/slides.md' };
const paths = embeddedThemePaths(origin.path, { theme: 'basic' }, ['title'])!;
const masterSource =
    '\uFEFF{"markdownpoint":1,"kind":"master","id":"11111111-1111-4111-8111-111111111111","name":"Own test","future":9007199254740993}';
const layoutSource = '{"markdownpoint":1,"kind":"layout","objects":[{"id":"body","type":"text","placeholder":true}]}';
const theme = {
    key: 'basic',
    id: uuid,
    root: paths.root,
    master: { path: paths.master, source: masterSource, value: themeDocument(masterSource, 'master')! },
    layouts: new Map([
        ['title', { path: paths.layouts.get('title')!, source: layoutSource, value: themeDocument(layoutSource, 'layout')! }]
    ])
};
const captured = {
    slides: [
        {
            id: 'one',
            markdown:
                '<!-- slide: one -->\r\n<!-- text: body -->\r\n[Go](slide:two) and `[No](slide:two)`.\r\n<!-- notes -->\r\nKeep these notes.\r\n',
            record: String.raw`{"layout":"title","future":9007199254740993,"escaped":"\u0061"}`
        },
        {
            id: 'two',
            markdown: '<!-- slide: two -->\n<!-- text: instance.caption -->\nOwn words.\n',
            record: '{"layout":"title","objects":[{"id":"instance","type":"composition","source":"card"}]}'
        }
    ],
    compositions: [
        {
            id: 'card',
            markdown: '<!-- composition: card -->\n<!-- control: caption -->\nDefault words.\n',
            record: '{"controls":{"caption":{"type":"text"}}}'
        }
    ]
};
const encoded = () => encodeSlideClipboard(uuid, origin, captured, theme)!;
const transport = () => ({
    version: 2,
    token: uuid,
    origin: { ...origin },
    slides: captured.slides.map(part => ({ ...part })),
    compositions: captured.compositions.map(part => ({ ...part })),
    theme: { key: 'basic', id: uuid, master: masterSource, layouts: [{ key: 'title', source: layoutSource }] }
});
const mutate = (change: (value: ReturnType<typeof transport> & { schemas?: unknown }) => void) => {
    const value = transport();
    change(value);
    return JSON.stringify(value);
};

test('whole-slide clipboard round trips keep complete raw fields, records, Theme documents and origin', () => {
    const result = decodeSlideClipboard(encoded())!;
    assert.ok(result);
    assert.equal(result.token, uuid);
    assert.deepEqual(result.origin, origin);
    assert.deepEqual(result.captured, captured);
    assert.equal(result.theme.master.source, masterSource);
    assert.equal(result.theme.layouts.get('title')!.source, layoutSource);
    assert.equal(result.theme.root, paths.root);
    assert.equal(result.schemas.get('one')!.get('body'), 'rich-text');
    assert.equal(result.schemas.get('two')!.get('instance.caption'), 'rich-text');
    assert.notEqual(SLIDE_CLIPBOARD_MIME, 'web application/x-markdownpoint-slides');
});

test('text and incompatible, malformed or ambiguous transport data are never treated as slides', () => {
    for (const source of [
        '# Plain Markdown',
        '{',
        '[]',
        '{"version":1,"version":2}',
        JSON.stringify({ markdownpoint: 1, kind: 'slides', root: '/tmp', slides: [] }),
        mutate(value => {
            value.version = 1;
        }),
        mutate(value => {
            value.token = 'invalid';
        }),
        mutate(value => {
            value.origin.vault = 'invalid';
        }),
        mutate(value => {
            value.origin.document = 'invalid';
        }),
        mutate(value => {
            value.origin.path = '../slides.md';
        }),
        mutate(value => {
            value.origin.path = '/slides.md';
        }),
        mutate(value => {
            value.slides = [];
        })
    ])
        assert.equal(decodeSlideClipboard(source), null);
});

test('missing layouts, definitions and duplicate identities refuse incomplete clipboard groups', () => {
    for (const source of [
        mutate(value => {
            value.theme.layouts = [];
        }),
        mutate(value => {
            value.compositions = [];
        }),
        mutate(value => {
            value.theme.layouts.push(value.theme.layouts[0]!);
        }),
        mutate(value => {
            value.theme.layouts[0]!.key = '../title';
        }),
        mutate(value => {
            value.theme.master = layoutSource;
        }),
        mutate(value => {
            value.theme.key = '../outside';
        }),
        mutate(value => {
            value.theme.id = '22222222-2222-4222-8222-222222222222';
        }),
        mutate(value => {
            value.slides.push(value.slides[0]!);
        }),
        mutate(value => {
            value.compositions[0]!.id = 'one';
        }),
        mutate(value => {
            value.slides[0]!.record = '{"layout":"title","layout":"title"}';
        }),
        mutate(value => {
            value.slides[0]!.record = 'null';
        })
    ])
        assert.equal(decodeSlideClipboard(source), null);
});

test('source identities, kinds and field boundaries must match the supplied records', () => {
    for (const source of [
        mutate(value => {
            value.slides[0]!.id = 'mismatch';
        }),
        mutate(value => {
            value.slides[0]!.markdown = value.compositions[0]!.markdown;
        }),
        mutate(value => {
            value.slides[0]!.markdown += value.slides[1]!.markdown;
        }),
        mutate(value => {
            value.slides[0]!.markdown = '<!-- section: first -->\n# Section\n' + value.slides[0]!.markdown;
        }),
        mutate(value => {
            value.slides[0]!.markdown += '<!-- notes -->\nDuplicate.\n';
        }),
        mutate(value => {
            value.slides[0]!.markdown += '<!-- text: body -->\nDuplicate.\n';
        })
    ])
        assert.equal(decodeSlideClipboard(source), null);
});

test('supplied schema claims cannot change the grammar derived from the copied Theme', () => {
    const source = mutate(value => {
        value.schemas = { one: { body: 'table' } };
    });
    assert.equal(decodeSlideClipboard(source)!.schemas.get('one')!.get('body'), 'rich-text');
    const decoded = decodeSlideClipboard(source)!;
    let next = 0;
    const copies = prepareSlideCopies(
        decoded.captured,
        decoded.captured.compositions,
        new Set(['existing']),
        decoded.schemas,
        () => `new-${++next}`
    )!;
    assert.ok(copies);
    assert.equal(copies.compositions.length, 0);
    assert.ok(copies.slides[0]!.markdown.includes('[Go](slide:new-2) and `[No](slide:two)`'));
});

test('encoding carries only declared transport fields while raw presentation metadata stays complete', () => {
    const extra = { ...captured, slides: captured.slides.map(part => ({ ...part, privateContext: 'not clipboard data' })) };
    const context = { ...origin, privateContext: 'not clipboard data' };
    const source = encodeSlideClipboard(uuid, context, extra, theme);
    assert.ok(source);
    assert.equal(source.includes('privateContext'), false);
    assert.deepEqual(decodeSlideClipboard(source)!.captured, captured);
});
