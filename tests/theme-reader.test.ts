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
import type { Vault } from 'obsidian';
import { embeddedThemePaths, themeDocument } from '../src/format/embedded-theme.ts';
import { readEmbeddedTheme } from '../src/presentation/theme-reader.ts';
import { memoryApp } from './support/obsidian.ts';

const id = '11111111-1111-4111-8111-111111111111';
const companion = { theme: 'basic' };
const markdownPath = 'Presentations/Å calm place/slides.md';
const paths = embeddedThemePaths(markdownPath, companion, ['title'])!;
/** A file of MarkdownPoint's Basic theme as the plugin ships it. */
const basic = (name: string) => readFileSync(new URL(`../src/themes/basic/${name}`, import.meta.url), 'utf8');
const master = basic('master.json');
const layout = basic('title.json');
/** A theme folder of these files, by name, in a vault whose every read is listed. */
function vault(
    files: Readonly<Record<string, string>> = { 'master.json': master, 'title.json': layout, 'blank.json': basic('blank.json') }
) {
    const app = memoryApp(Object.fromEntries(Object.entries(files).map(([name, source]) => [`${paths.root}/${name}`, source])));
    const reads: string[] = [];
    const readBinary = app.vault.readBinary;
    app.vault.readBinary = file => {
        reads.push(file.name);
        return readBinary(file);
    };
    return { files: app.vault, reads, host: app.vault as unknown as Vault };
}

test('embedded Theme paths are exact vault-relative references, including spaces and Unicode', () => {
    assert.equal(paths.root, `Presentations/Å calm place/themes/basic`);
    assert.equal(paths.master, paths.root + '/master.json');
    assert.deepEqual([...embeddedThemePaths('slides.md', companion, ['title', 'body', 'title'])!.layouts.keys()], ['title', 'body']);
    for (const path of ['notes.md', '/slides.md', '../slides.md', 'deck/../slides.md', 'deck//slides.md', 'deck\\slides.md']) {
        assert.equal(embeddedThemePaths(path, companion, ['title']), null);
    }
    for (const key of ['../title', 'title.json', 'Master', 'master', 'manifest', 'con', 'nul', 'com1', 'lpt9']) {
        assert.equal(embeddedThemePaths(markdownPath, companion, [key]), null);
    }
    for (const theme of ['../outside', id.toUpperCase().replace('111', 'AAA'), null, 4]) {
        assert.equal(embeddedThemePaths(markdownPath, { theme }, ['title']), null);
    }
});

test('a Theme reads as MarkdownPoint reads its folder, every JSON file once, and keeps the bytes of the documents it uses', async () => {
    const { files, reads, host } = vault();
    files.write(`${paths.root}/master.json`, '\uFEFF' + master);
    reads.length = 0;
    const result = await readEmbeddedTheme(host, markdownPath, companion, ['title', 'title']);
    assert.ok(result);
    assert.equal(result.master.source, '\uFEFF' + master);
    assert.equal(result.key, 'basic');
    assert.equal(result.id, 'c17f2a67-54b1-492b-8ab3-838711173ab2');
    assert.deepEqual([...result.layouts.keys()], ['title']);
    assert.equal(result.layouts.get('title')!.source, layout);
    // Each file as MarkdownPoint reads the folder, then each again, to know none changed meanwhile
    assert.deepEqual(reads.sort(), ['blank.json', 'blank.json', 'master.json', 'master.json', 'title.json', 'title.json']);
});

test("a master MarkdownPoint doesn't read gives no Theme, and a layout it doesn't read is left out", async () => {
    const named = (source: string, name: string) => JSON.stringify({ ...(JSON.parse(source) as object), name });
    // One line that isn't blank: MarkdownPoint refuses the master, and with it every slide
    assert.equal(
        await readEmbeddedTheme(vault({ 'master.json': named(master, '\nBasic'), 'title.json': layout }).host, markdownPath, companion, [
            'title'
        ]),
        null
    );
    const theme = await readEmbeddedTheme(
        vault({ 'master.json': master, 'title.json': named(layout, '\nTitle'), 'blank.json': basic('blank.json') }).host,
        markdownPath,
        companion,
        ['title', 'blank']
    );
    assert.deepEqual([...theme!.layouts.keys()], ['blank']);
    // A layout file whose document is a master's, and one that isn't there, are none of the theme's layouts
    const folders: Record<string, string>[] = [{ 'master.json': master, 'title.json': master }, { 'master.json': master }];
    for (const files of folders)
        assert.deepEqual([...(await readEmbeddedTheme(vault(files).host, markdownPath, companion, ['title']))!.layouts.keys()], []);
    assert.equal(await readEmbeddedTheme(vault({ 'title.json': layout }).host, markdownPath, companion, ['title']), null);
});

test('malformed or ambiguous JSON and wrong document envelopes are no theme document', () => {
    for (const source of [
        'null',
        '{}',
        '{"markdownpoint":2,"type":"master","id":"11111111-1111-4111-8111-111111111111"}',
        '{"markdownpoint":"1.0","type":"layout"}',
        '{"markdownpoint":"1.0","type":"master","id":"11111111-1111-4111-8111-111111111111",}',
        '{/* comment */"markdownpoint":"1.0","type":"master","id":"11111111-1111-4111-8111-111111111111"}',
        '{"markdownpoint":"1.0","type":"master","id":"11111111-1111-4111-8111-111111111111","unknown":1e999}',
        String.raw`{"markdownpoint":"1.0","type":"master","id":"11111111-1111-4111-8111-111111111111","nested":{"name":1,"na\u006de":2}}`
    ])
        assert.equal(themeDocument(source, 'master'), null, source);
});

test('read failures and keys no theme has return no partial Theme', async () => {
    const failing = vault();
    failing.files.readBinary = () => Promise.reject(new Error('Unavailable'));
    assert.equal(await readEmbeddedTheme(failing.host, markdownPath, companion, ['title']), null);
    const invalid = vault();
    assert.equal(await readEmbeddedTheme(invalid.host, markdownPath, { theme: '../bad' }, ['title']), null);
    assert.equal(invalid.reads.length, 0);
});

test('a Theme whose folder changes while its files are read is refused without polling or retry', async () => {
    for (const change of ['edit', 'replace', 'remove', 'rename a layout', 'empty an unused file', 'add an empty file'] as const) {
        const { files, reads, host } = vault();
        const readBinary = files.readBinary;
        files.readBinary = async file => {
            const bytes = await readBinary(file);
            // Once the folder's three files have been read, before they are read again
            if (reads.length === 3) {
                const master = `${paths.root}/master.json`;
                if (change === 'edit') files.write(master, basic('master.json') + '\n');
                else if (change === 'replace') {
                    files.remove(master);
                    files.write(master, basic('master.json'));
                } else if (change === 'remove') files.remove(master);
                else if (change === 'rename a layout') files.rename(`${paths.root}/title.json`, 'cover.json');
                // An empty JSON file leaves the theme unread in MarkdownPoint, though the presentation uses none of it
                else if (change === 'empty an unused file') files.write(`${paths.root}/blank.json`, '');
                else files.write(`${paths.root}/extra.json`, '');
            }
            return bytes;
        };
        assert.equal(await readEmbeddedTheme(host, markdownPath, companion, ['title']), null, change);
    }
});
test('Theme keys and UUID identities are independent; legacy folders are not guessed', () => {
    assert.equal(
        embeddedThemePaths(markdownPath, { theme: 'company-profile' }, [])!.root,
        'Presentations/Å calm place/themes/company-profile'
    );
    for (const theme of ['con', 'nul', 'com1', 'lpt9', 'Company profile', '../basic', id])
        assert.equal(embeddedThemePaths(markdownPath, { theme }, []), null);
    assert.equal(embeddedThemePaths(markdownPath, { design: id }, []), null);
    assert.equal(themeDocument('{"markdownpoint":"1.0","type":"master"}', 'master'), null);
});
