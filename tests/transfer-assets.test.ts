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
import type { App, TFile as ObsidianFile } from 'obsidian';
import { TFile, TFolder } from './support/obsidian.ts';
import { readEmbeddedTheme } from '../src/presentation/theme-reader.ts';
import { decodeSlideClipboard, encodeSlideClipboard } from '../src/format/clipboard.ts';
import { ThemeArtworkMismatch, transferSlideAssets } from '../src/presentation/transfer-assets.ts';

const sourceId = '11111111-1111-4111-8111-111111111111';
const targetId = '22222222-2222-4222-8222-222222222222';
const themeId = '33333333-3333-4333-8333-333333333333';
const token = '44444444-4444-4444-8444-444444444444';
const header = (id: string) => `---\nmarkdownpoint: "1.0"\nid: ${id}\n---\n\n`;

async function fixture(media = ['media/photo.png'], artwork = false) {
    let clock = 0;
    const nodes = new Map<string, TFile | TFolder>([['', new TFolder('')]]);
    const copies: string[] = [];
    const state: { beforeCopy: (path: string) => void; afterTrash: () => void } = {
        beforeCopy: () => undefined,
        afterTrash: () => undefined
    };
    const parentPath = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));
    const folder = (path: string): TFolder => {
        const held = nodes.get(path);
        if (held instanceof TFolder) return held;
        if (held) throw new Error('Occupied');
        const made = new TFolder(path);
        made.parent = folder(parentPath(path));
        made.parent.children.push(made);
        nodes.set(path, made);
        return made;
    };
    const add = (path: string, value: string | Uint8Array) => {
        if (nodes.has(path)) throw new Error('Occupied');
        const file = new TFile(path, typeof value === 'string' ? new TextEncoder().encode(value) : value.slice(), ++clock);
        file.parent = folder(parentPath(path));
        file.parent.children.push(file);
        nodes.set(path, file);
        return file;
    };
    const vault = {
        getRoot: () => folder(''),
        getFolderByPath: (path: string) => {
            const item = nodes.get(path);
            return item instanceof TFolder ? item : null;
        },
        getFileByPath: (path: string) => {
            const item = nodes.get(path);
            return item instanceof TFile ? item : null;
        },
        getAbstractFileByPath: (path: string) => nodes.get(path) ?? null,
        read: (file: TFile) => Promise.resolve(new TextDecoder().decode(file.bytes)),
        getResourcePath: (file: TFile) => 'vault:' + encodeURIComponent(file.path),
        createFolder: (path: string) => {
            if (nodes.has(path)) throw new Error('Occupied');
            return Promise.resolve(folder(path));
        },
        copy: (file: TFile, path: string) => {
            state.beforeCopy(path);
            copies.push(path);
            return Promise.resolve(add(path, file.bytes));
        }
    };
    const app = {
        vault,
        fileManager: {
            trashFile: (item: TFile | TFolder) => {
                assert.ok(!(item instanceof TFolder) || !item.children.length);
                nodes.delete(item.path);
                if (item.parent) item.parent.children = item.parent.children.filter(child => child !== item);
                state.afterTrash();
                return Promise.resolve();
            }
        }
    } as unknown as App;
    const ownerWindow = {
        fetch: (input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            const file = vault.getFileByPath(decodeURIComponent(url.slice(6)));
            return Promise.resolve(file ? new Response(file.bytes.slice().buffer) : new Response(null, { status: 404 }));
        }
    } as unknown as Window;
    const master = JSON.stringify({
        markdownpoint: '1.0',
        kind: 'master',
        id: themeId,
        objects: artwork ? [{ id: 'logo', type: 'image', file: 'media/logo.svg' }] : []
    });
    const layout = '{"markdownpoint":"1.0","kind":"layout","objects":[]}';
    for (const [root, id] of [
        ['source', sourceId],
        ['target', targetId]
    ] as const) {
        add(root + '/slides.md', header(id) + '<!-- slide: one -->\n');
        add(
            root + '/presentation.mdpoint',
            JSON.stringify({ markdownpoint: '1.0', kind: 'presentation', id, theme: 'basic', slides: { one: { layout: 'title' } } })
        );
        add(root + '/themes/basic/master.json', master);
        add(root + '/themes/basic/title.json', layout);
        if (artwork) add(root + '/themes/basic/media/logo.svg', new Uint8Array([1, 2, 3]));
    }
    for (const path of media) add('source/' + path, new Uint8Array([4, 5, 6]));
    const sourceTheme = (await readEmbeddedTheme(vault, 'source/slides.md', { theme: 'basic' }, ['title']))!;
    const theme = (await readEmbeddedTheme(vault, 'target/slides.md', { theme: 'basic' }, ['title']))!;
    const record = JSON.stringify({
        layout: 'title',
        objects: media.map((asset, index) => ({ id: `image-${index}`, type: 'image', file: asset }))
    });
    const packet = decodeSlideClipboard(
        encodeSlideClipboard(
            token,
            { vault: sourceId, path: 'source/slides.md', document: sourceId },
            { slides: [{ id: 'one', markdown: '<!-- slide: one -->\n', record }], compositions: [] },
            sourceTheme
        )!
    )!;
    const target = vault.getFileByPath('target/slides.md')!;
    return {
        app,
        vault,
        nodes,
        copies,
        state,
        packet,
        theme,
        ownerWindow,
        target,
        transfer: (current = () => true, signal = new AbortController().signal) =>
            transferSlideAssets(app, packet, target as unknown as ObsidianFile, theme, ownerWindow, current, signal)
    };
}

test('transfer copies media independently and repeated paste reuses its unchanged files', async () => {
    const f = await fixture(['media/photo.png', 'generated/original.png']);
    const first = await f.transfer();
    const second = await f.transfer();
    assert.equal(f.copies.length, 2);
    assert.equal(first.captured.slides[0]!.record, second.captured.slides[0]!.record);
    assert.equal(first.captured.slides[0]!.markdown, f.packet.captured.slides[0]!.markdown);
    assert.equal(first.current(), true);
    assert.ok(f.copies.some(path => path.startsWith('target/generated/')));
    const copied = f.nodes.get(f.copies[0]!);
    assert.ok(copied instanceof TFile);
    assert.deepEqual(copied.bytes, new Uint8Array([4, 5, 6]));
});

test('an edited destination image is preserved and a new copy is reused on later pastes', async () => {
    const f = await fixture();
    await f.transfer();
    const edited = f.nodes.get(f.copies[0]!);
    assert.ok(edited instanceof TFile);
    edited.bytes = new Uint8Array([9, 9, 9]);
    edited.stat.mtime++;
    const second = await f.transfer();
    const third = await f.transfer();
    assert.equal(f.copies.length, 2);
    assert.equal(second.captured.slides[0]!.record, third.captured.slides[0]!.record);
    assert.deepEqual(edited.bytes, new Uint8Array([9, 9, 9]));
});

test('failed copying removes only its own unused imports', async () => {
    const f = await fixture(['media/photo.png', 'generated/original.png']);
    f.state.beforeCopy = () => {
        if (f.copies.length === 1) throw new Error('Disk full');
    };
    await assert.rejects(f.transfer(), /Disk full/);
    assert.equal(f.vault.getFolderByPath('target/media'), null);
    assert.equal(f.vault.getFolderByPath('target/generated'), null);
    assert.ok(f.vault.getFileByPath('source/media/photo.png'));
});

test('successful imports can be rolled back before insertion while newer companion edits keep them', async () => {
    const first = await fixture();
    const receipt = await first.transfer();
    await receipt.cleanup();
    assert.equal(first.vault.getFolderByPath('target/media'), null);
    const second = await fixture();
    const kept = await second.transfer();
    const companion = second.vault.getFileByPath('target/presentation.mdpoint')!;
    companion.bytes = new TextEncoder().encode('{}');
    companion.stat.mtime++;
    await kept.cleanup();
    assert.ok(second.vault.getFileByPath(second.copies[0]!));
});

test('theme artwork with different bytes refuses the transfer without changing either presentation', async () => {
    const f = await fixture([], true);
    const logo = f.vault.getFileByPath('target/themes/basic/media/logo.svg')!;
    logo.bytes = new Uint8Array([9, 9, 9]);
    logo.stat.mtime++;
    await assert.rejects(f.transfer(), ThemeArtworkMismatch);
    assert.equal(f.copies.length, 0);
    assert.deepEqual(logo.bytes, new Uint8Array([9, 9, 9]));
});

test('a later source or theme edit invalidates the returned insertion guard', async () => {
    const f = await fixture();
    const receipt = await f.transfer();
    f.vault.getFileByPath('target/themes/basic/title.json')!.stat.mtime++;
    assert.equal(receipt.current(), false);
});

test('an aborted transfer cannot return an insertable text-only packet', async () => {
    const f = await fixture([]);
    const controller = new AbortController();
    const receipt = await f.transfer(() => true, controller.signal);
    controller.abort();
    assert.equal(receipt.current(), false);
    await assert.rejects(
        f.transfer(() => true, controller.signal),
        /canceled/
    );
    assert.equal(f.copies.length, 0);
});

test('cleanup stops if ownership changes during the companion read or a deletion', async () => {
    const first = await fixture();
    let current = true;
    const receipt = await first.transfer(() => current);
    const read = first.vault.read;
    first.vault.read = async file => {
        const source = await read(file);
        current = false;
        return source;
    };
    await receipt.cleanup();
    assert.ok(first.vault.getFileByPath(first.copies[0]!));

    const second = await fixture(['media/photo.png', 'generated/original.png']);
    current = true;
    const partial = await second.transfer(() => current);
    second.state.afterTrash = () => {
        current = false;
    };
    await partial.cleanup();
    assert.equal(second.vault.getFileByPath(second.copies[1]!), null);
    assert.ok(second.vault.getFileByPath(second.copies[0]!));
});

test('newly copied media remains in the insertion guard through deletion, replacement or editing', async () => {
    for (const change of ['delete', 'replace', 'edit'] as const) {
        const f = await fixture();
        const receipt = await f.transfer();
        const path = f.copies[0]!;
        const file = f.vault.getFileByPath(path)!;
        if (change === 'delete') f.nodes.delete(path);
        else if (change === 'replace') f.nodes.set(path, new TFile(path, file.bytes, file.stat.mtime));
        else file.stat.mtime++;
        assert.equal(receipt.current(), false, change);
    }
});
