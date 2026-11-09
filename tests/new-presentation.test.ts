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
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import { basicTheme, basicThemeFiles } from '../src/themes/basic.ts';
import { firstSlideLayout, prepareNewPresentation } from '../src/format/new-presentation.ts';
import { indexPresentation } from '../src/format/document.ts';
import { readJsonObject } from '../src/format/json.ts';
import { presentationIdentity } from '../src/format/recognition.ts';
import { themeDocument, themeFilePaths } from '../src/format/embedded-theme.ts';

const presentationId = '12345678-1234-4234-8234-123456789abc';

test('the bundled licensed theme has a valid master, every ordered layout and the picture its image layouts hold', () => {
    assert.equal(basicThemeFiles.size, 15);
    assert.equal(themeDocument(basicThemeFiles.get('master.json') as string, 'master')?.id, basicTheme.id);
    assert.equal(basicTheme.layouts.size, 13);
    for (const [key, layout] of basicTheme.layouts) {
        assert.ok(themeDocument(layout.source, 'layout'), key);
        assert.equal(basicThemeFiles.get(`${key}.json`), layout.source);
    }
});

test("Basic's theme files are MarkdownPoint's, byte for byte, so a slide pastes between a presentation the app made and one the plugin made", () => {
    for (const [file, contents] of basicThemeFiles)
        if (typeof contents === 'string')
            assert.equal(contents, readFileSync(new URL(`../src/themes/basic/${file}`, import.meta.url), 'utf8'), file);
});

test('a new presentation holds every file its Basic theme references, the layouts’ preview as the picture’s bytes', () => {
    const referenced = themeFilePaths(basicTheme);
    assert.ok(referenced?.includes('media/layout-preview.jpg'), 'the image layouts hold the preview');
    for (const file of referenced!) assert.ok(basicThemeFiles.has(file), file);
    const preview = readFileSync(new URL('../src/themes/basic/media/layout-preview.jpg', import.meta.url));
    assert.deepEqual(basicThemeFiles.get('media/layout-preview.jpg'), new Uint8Array(preview));
});

test('a new presentation has matching identity, the chosen theme, and a first slide open on its first placeholder', () => {
    const made = prepareNewPresentation(basicTheme, presentationId, 'opening')!;
    const companion = readJsonObject(made.companion)!;
    assert.equal(presentationIdentity({ markdownpoint: '1.0', id: presentationId }, companion), presentationId);
    assert.equal(companion.theme, 'basic');
    assert.deepEqual(companion.slides, { opening: { layout: 'title' } });
    const body = made.markdown.indexOf('<!-- slide:');
    const indexed = indexPresentation(made.markdown, body)!;
    assert.equal(indexed.slides.length, 1);
    assert.equal(
        made.markdown,
        `---\nmarkdownpoint: "1.0"\nid: ${presentationId}\n---\n\n<!-- slide: opening -->\n\n<!-- text: eyebrow -->\n`
    );
    assert.doesNotMatch(made.markdown, /Presentation title|Presentation subtitle|Author and date/);
});

test('a new presentation starts on the first of title, content-with-header, content and blank its theme has, else its first, as MarkdownPoint picks it', () => {
    const order = ['section', 'blank', 'content', 'content-with-header', 'title'];
    const ordered = { ...basicTheme, master: { ...basicTheme.master, value: { ...basicTheme.master.value, 'layout-order': order } } };
    const starts = (without: readonly string[]) => {
        const theme = { ...ordered, layouts: new Map([...ordered.layouts].filter(([key]) => !without.includes(key))) };
        const layout = firstSlideLayout(theme);
        // The theme chooser previews the layout the new presentation starts on.
        assert.deepEqual(readJsonObject(prepareNewPresentation(theme, presentationId, 'opening')!.companion)?.slides, {
            opening: { layout }
        });
        return layout;
    };
    assert.equal(starts([]), 'title');
    assert.equal(starts(['title']), 'content-with-header');
    assert.equal(starts(['title', 'content-with-header']), 'content');
    assert.equal(starts(['title', 'content-with-header', 'content']), 'blank');
    assert.equal(starts(['title', 'content-with-header', 'content', 'blank']), 'section');
    // With no layout-order, its first by key, whatever order the vault lists the files in.
    const { 'layout-order': _order, ...unordered } = basicTheme.master.value;
    const preferred = ['title', 'content-with-header', 'content', 'blank'];
    const rest = [...basicTheme.layouts].filter(([key]) => !preferred.includes(key));
    assert.ok(rest.length > 1);
    const reversed = { ...basicTheme, master: { ...basicTheme.master, value: unordered }, layouts: new Map(rest.reverse()) };
    assert.equal(firstSlideLayout(reversed), rest.map(([key]) => key).sort()[0]);
});

test('each bundled layout can start a presentation without altering the template', () => {
    const before = JSON.stringify([...basicThemeFiles]);
    for (const key of basicTheme.layouts.keys()) {
        const made = prepareNewPresentation(basicTheme, presentationId, 'opening', key)!;
        assert.ok(made, key);
        assert.deepEqual(readJsonObject(made.companion)?.slides, { opening: { layout: key } });
        assert.equal(indexPresentation(made.markdown, made.markdown.indexOf('<!-- slide:'))?.slides.length, 1);
    }
    assert.equal(JSON.stringify([...basicThemeFiles]), before);
});

test('creation refuses invalid identities, keys and missing layouts before returning file contents', () => {
    assert.equal(prepareNewPresentation(basicTheme, 'invalid', 'opening'), null);
    assert.equal(prepareNewPresentation(basicTheme, presentationId, '../outside'), null);
    assert.equal(prepareNewPresentation(basicTheme, presentationId, 'opening', 'missing'), null);
    assert.equal(prepareNewPresentation({ ...basicTheme, key: '../outside' }, presentationId, 'opening'), null);
    assert.equal(prepareNewPresentation({ ...basicTheme, layouts: new Map() }, presentationId, 'opening'), null);
});

test('theme creation inventories media variants, overrides and embedded fonts without sample packages', () => {
    assert.deepEqual(themeFilePaths(basicTheme), ['media/layout-preview.jpg']);
    const make = (file: unknown) => ({
        ...basicTheme,
        master: {
            ...basicTheme.master,
            value: {
                ...basicTheme.master.value,
                objects: [{ file }],
                'font-files': { Custom: ['fonts/custom.eot'] }
            }
        }
    });
    assert.deepEqual(themeFilePaths(make({ light: 'media/light.svg', dark: 'media/dark.svg' })), [
        'media/light.svg',
        'media/dark.svg',
        'media/layout-preview.jpg',
        'fonts/custom.eot'
    ]);
    assert.deepEqual(
        themeFilePaths({
            ...basicTheme,
            master: {
                ...basicTheme.master,
                value: {
                    ...basicTheme.master.value,
                    objects: [
                        { type: 'video', 'poster-time': 2.5 },
                        { type: 'web-video', poster: 'media/poster.png' }
                    ]
                }
            }
        }),
        ['media/poster.png', 'media/layout-preview.jpg']
    );
    for (const path of [
        '../outside.svg',
        '/absolute.svg',
        'media/../outside.svg',
        'https://example.com/file.svg',
        'previews/cover.jpg',
        'example/media/file.jpg',
        // A theme's file follows MarkdownPoint's one path rule.
        'media/a#b.svg',
        'media/con.svg',
        'media/dir./file.svg'
    ]) {
        assert.equal(themeFilePaths(make(path)), null, path);
    }
});
