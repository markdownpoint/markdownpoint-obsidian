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
import { decodeSlideClipboard, encodeSlideClipboard } from '../src/format/clipboard.ts';
import { prepareClipboardPaste, sameClipboardPresentation, sameClipboardTheme } from '../src/format/paste.ts';
import { indexPresentation } from '../src/format/document.ts';
import { planSlideInsertion } from '../src/format/insert.ts';
import { embeddedThemePaths, themeDocument } from '../src/format/embedded-theme.ts';

const uuid = '11111111-1111-4111-8111-111111111111',
    path = 'deck/slides.md';
const origin = { vault: uuid, path, document: uuid };
const paths = embeddedThemePaths(path, { theme: 'basic' }, ['title'])!;
const master = '{"markdownpoint":1,"kind":"master","id":"11111111-1111-4111-8111-111111111111"}';
const layout = '{"markdownpoint":1,"kind":"layout","objects":[{"id":"body","type":"text","placeholder":true}]}';
const theme = {
    key: 'basic',
    id: uuid,
    root: paths.root,
    master: { path: paths.master, source: master, value: themeDocument(master, 'master')! },
    layouts: new Map([['title', { path: paths.layouts.get('title')!, source: layout, value: themeDocument(layout, 'layout')! }]])
};
const markdown = '<!-- slide: first -->\n<!-- text: body -->\nFirst words.\n<!-- notes -->\nRemember this.\n';
const record =
    '{"layout":"title","unknown":{"value":9007199254740993},"objects":[{"id":"photo","type":"image","asset":"media/photo.jpg"}]}';
const packet = decodeSlideClipboard(
    encodeSlideClipboard(uuid, origin, { slides: [{ id: 'first', markdown, record }], compositions: [] }, theme)!
)!;

test('same-presentation paste keeps raw fields, notes and metadata while creating independent IDs', () => {
    let source = markdown,
        companion = '{"slides":{"first":' + record + '}}';
    for (let count = 0; count < 3; count++) {
        const document = indexPresentation(source, 0)!;
        const prepared = prepareClipboardPaste(packet, source, document, companion, new Map(), () => `new-${count}`)!;
        assert.equal(prepared.slides[0]!.record, record);
        assert.equal(prepared.slides[0]!.markdown, markdown.replace('slide: first', `slide: new-${count}`));
        const plan = planSlideInsertion(source, document, companion, prepared.slides, 'first', 0, prepared.compositions)!;
        source = [...plan.changes]
            .reverse()
            .reduce((text, change) => text.slice(0, change.from) + change.insert + text.slice(change.to), source);
        companion = plan.companion;
    }
    assert.deepEqual(
        indexPresentation(source, 0)!.slides.map(part => part.id),
        ['first', 'new-2', 'new-1', 'new-0']
    );
});

test('an empty presentation accepts the first pasted slide', () => {
    const document = indexPresentation('', 0)!;
    const prepared = prepareClipboardPaste(packet, '', document, '{"slides":{}}', new Map(), () => 'fresh')!;
    assert.ok(planSlideInsertion('', document, '{"slides":{}}', prepared.slides, null, 0));
});

test('orphaned and recoverable identities are not recycled by a copied slide', () => {
    const document = indexPresentation(markdown, 0)!;
    assert.equal(
        prepareClipboardPaste(packet, markdown, document, '{"slides":{"first":{},"orphan":{}}}', new Map(), () => 'orphan'),
        null
    );
    assert.equal(
        prepareClipboardPaste(packet, markdown, document, '{"slides":{"first":{}}}', new Map([['recoverable', '{}']]), () => 'recoverable'),
        null
    );
});

test('same-origin asset references require the original vault, document, path and theme sources', () => {
    assert.equal(sameClipboardPresentation(packet, origin), true);
    assert.equal(sameClipboardPresentation(packet, { ...origin, path: 'deck/Slides.MD' }), true);
    assert.equal(sameClipboardPresentation(packet, { ...origin, path: 'other/slides.md' }), false);
    for (const key of ['vault', 'path', 'document'] as const)
        assert.equal(sameClipboardPresentation(packet, { ...origin, [key]: 'different' }), false);
    assert.equal(sameClipboardTheme(packet, theme), true);
    assert.equal(sameClipboardTheme(packet, { ...theme, root: 'other/themes/basic' }), true);
    assert.equal(sameClipboardTheme(packet, { ...theme, master: { ...theme.master, source: master + ' ' } }), false);
    assert.equal(sameClipboardTheme(packet, { ...theme, layouts: new Map() }), false);
});

test('a locally owned Cut restores identity once; repeated Paste and Undo Cut clone instead', () => {
    const empty = indexPresentation('', 0)!,
        companion = '{"slides":{}}';
    const restored = prepareClipboardPaste(packet, '', empty, companion, new Map([['first', record]]), () => 'copy', true)!;
    assert.equal(restored.slides[0]!.id, 'first');
    const standing = indexPresentation(markdown, 0)!;
    const repeated = prepareClipboardPaste(
        packet,
        markdown,
        standing,
        '{"slides":{"first":' + record + '}}',
        new Map(),
        () => 'copy',
        true
    )!;
    assert.equal(repeated.slides[0]!.id, 'copy');
    const newer = prepareClipboardPaste(packet, '', empty, companion, new Map([['first', '{"newer":true}']]), () => 'copy', true)!;
    assert.equal(newer.slides[0]!.id, 'copy');
    const unauthenticated = prepareClipboardPaste(packet, '', empty, companion, new Map(), () => 'copy')!;
    assert.equal(unauthenticated.slides[0]!.id, 'copy');
});
