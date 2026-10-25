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
import { embeddedThemePaths, themeDocument } from '../src/format/embedded-theme.ts';
import { readEmbeddedTheme } from '../src/presentation/theme-reader.ts';

const id = '11111111-1111-4111-8111-111111111111';
const companion = { theme: 'basic' };
const markdownPath = 'Presentations/Å calm place/slides.md';
const paths = embeddedThemePaths(markdownPath, companion, ['title'])!;
const master =
    '{"markdownpoint":"1.0","kind":"master","id":"11111111-1111-4111-8111-111111111111","name":"Own test","unknown":9007199254740993}';
const layout = '{"markdownpoint":"1.0","kind":"layout","objects":[{"id":"title","type":"text"}]}';
function vault() {
    const files = new Map([
        [paths.master, { path: paths.master, source: master }],
        [paths.layouts.get('title')!, { path: paths.layouts.get('title')!, source: layout }]
    ]);
    const reads: string[] = [];
    const host = {
        getFileByPath: (path: string) => files.get(path) ?? null,
        read: (file: { path: string; source: string }) => {
            reads.push(file.path);
            return Promise.resolve(file.source);
        }
    };
    return { files, reads, host };
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

test('a Theme snapshot retains full source bytes and reads only required files', async () => {
    const { files, reads, host } = vault();
    files.get(paths.master)!.source = '\uFEFF' + master;
    files.set(paths.root + '/unused.json', { path: paths.root + '/unused.json', source: 'unreadable' });
    const result = await readEmbeddedTheme(host, markdownPath, companion, ['title', 'title']);
    assert.ok(result);
    assert.equal(result.master.source, '\uFEFF' + master);
    assert.equal(result.master.value.name, 'Own test');
    assert.equal(result.key, 'basic');
    assert.equal(result.id, id);
    assert.equal(result.layouts.get('title')!.source, layout);
    assert.equal(result.master.source.includes('9007199254740993'), true);
    assert.deepEqual(reads, [paths.master, paths.layouts.get('title'), paths.master, paths.layouts.get('title')]);
});

test('malformed or ambiguous JSON and wrong document envelopes refuse the snapshot', async () => {
    for (const source of [
        'null',
        '{}',
        '{"markdownpoint":2,"kind":"master","id":"11111111-1111-4111-8111-111111111111"}',
        '{"markdownpoint":"1.0","kind":"layout"}',
        '{"markdownpoint":"1.0","kind":"master","id":"11111111-1111-4111-8111-111111111111",}',
        '{/* comment */"markdownpoint":"1.0","kind":"master","id":"11111111-1111-4111-8111-111111111111"}',
        '{"markdownpoint":"1.0","kind":"master","id":"11111111-1111-4111-8111-111111111111","unknown":1e999}',
        String.raw`{"markdownpoint":"1.0","kind":"master","id":"11111111-1111-4111-8111-111111111111","nested":{"name":1,"na\u006de":2}}`
    ])
        assert.equal(themeDocument(source, 'master'), null, source);
    const { files, host } = vault();
    files.get(paths.layouts.get('title')!)!.source = master;
    assert.equal(await readEmbeddedTheme(host, markdownPath, companion, ['title']), null);
});

test('missing files and read failures return no partial Theme', async () => {
    const missing = vault();
    missing.files.delete(paths.layouts.get('title')!);
    assert.equal(await readEmbeddedTheme(missing.host, markdownPath, companion, ['title']), null);
    const failing = vault();
    failing.host.read = () => Promise.reject(new Error('Unavailable'));
    assert.equal(await readEmbeddedTheme(failing.host, markdownPath, companion, ['title']), null);
    const invalid = vault();
    assert.equal(await readEmbeddedTheme(invalid.host, markdownPath, { theme: '../bad' }, ['title']), null);
    assert.equal(invalid.reads.length, 0);
});

test('a Theme edited while its documents are read is refused without polling or retry', async () => {
    const { files, reads, host } = vault();
    const read = host.read;
    host.read = async file => {
        const source = await read(file);
        if (reads.length === 2 && file.path.endsWith('/title.json'))
            files.get(paths.master)!.source = master.replace('Own test', 'Changed');
        return source;
    };
    assert.equal(await readEmbeddedTheme(host, markdownPath, companion, ['title']), null);
    assert.equal(reads.length, 4);
});

test('replacement or rename of a file cannot validate an earlier file object', async () => {
    for (const replacement of [true, false]) {
        const { files, host } = vault();
        const read = host.read;
        let changed = false;
        host.read = async file => {
            const source = await read(file);
            if (!changed && file.path.endsWith('/title.json')) {
                changed = true;
                if (replacement) files.set(paths.master, { path: paths.master, source: master });
                else files.delete(paths.master);
            }
            return source;
        };
        assert.equal(await readEmbeddedTheme(host, markdownPath, companion, ['title']), null);
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
    assert.equal(themeDocument('{"markdownpoint":"1.0","kind":"master"}', 'master'), null);
});
