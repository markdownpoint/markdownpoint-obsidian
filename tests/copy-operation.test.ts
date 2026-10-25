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
import { SlideCopy } from '../src/presentation/copy.ts';
import type { CopySource, SlideCopyHost } from '../src/presentation/copy.ts';
import { decodeSlideClipboard } from '../src/format/clipboard.ts';
import { indexPresentation } from '../src/format/document.ts';
import { embeddedThemePaths, themeDocument } from '../src/format/embedded-theme.ts';
import { clipboardVaultId, CLIPBOARD_VAULT_KEY, clipboardDigest, ownsClipboardCut, CLIPBOARD_CUT_KEY } from '../src/settings/clipboard.ts';

const uuid = '11111111-1111-4111-8111-111111111111',
    path = 'deck/slides.md';
const companion = JSON.stringify({
    markdownpoint: 1,
    kind: 'presentation',
    document: uuid,
    theme: 'basic',
    slides: { one: { layout: 'title' }, two: { layout: 'title' } }
});
const markdown = '<!-- slide: one -->\n<!-- text: body -->\nFirst words.\n<!-- slide: two -->\n<!-- text: body -->\nSecond words.\n';
const paths = embeddedThemePaths(path, { theme: 'basic' }, ['title'])!;
const master = '{"markdownpoint":1,"kind":"master","id":"11111111-1111-4111-8111-111111111111"}',
    layout = '{"markdownpoint":1,"kind":"layout","objects":[{"id":"body","type":"text","placeholder":true}]}';
const theme = {
    key: 'basic',
    id: uuid,
    root: paths.root,
    master: { path: paths.master, source: master, value: themeDocument(master, 'master')! },
    layouts: new Map([['title', { path: paths.layouts.get('title')!, source: layout, value: themeDocument(layout, 'layout')! }]])
};
function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>(done => {
        resolve = done;
    });
    return { promise, resolve };
}
function setup() {
    const state = { markdown, companion, active: true, writes: [] as string[], reads: 0 };
    const source = (): CopySource => ({
        path,
        documentId: uuid,
        markdown: state.markdown,
        companion: state.companion,
        index: indexPresentation(state.markdown, 0)!
    });
    const host: SlideCopyHost<string> = {
        current: () => state.active,
        read: () => {
            state.reads++;
            return Promise.resolve(source());
        },
        theme: (_source, _metadata, layouts) => {
            assert.deepEqual(layouts, ['title']);
            return Promise.resolve(theme);
        },
        vaultId: () => uuid,
        write: (_context, encoded) => {
            state.writes.push(encoded);
            return Promise.resolve();
        }
    };
    return { state, host, copier: new SlideCopy(host), source };
}

void test('Copy captures a complete group in source order and leaves its source untouched', async () => {
    const { state, copier } = setup();
    const result = await copier.copy('view', ['two', 'one']);
    assert.equal(result.kind, 'copied');
    assert.equal(state.writes.length, 1);
    assert.deepEqual(
        decodeSlideClipboard(state.writes[0]!)!.captured.slides.map(part => part.id),
        ['one', 'two']
    );
    assert.equal(state.markdown, markdown);
    assert.equal(state.companion, companion);
    assert.equal(state.reads, 2);
});

void test('newer words or companion edits during preparation leave the clipboard untouched', async () => {
    for (const edit of ['markdown', 'companion'] as const) {
        const { state, host, copier } = setup(),
            entered = deferred(),
            resume = deferred();
        host.theme = async () => {
            entered.resolve();
            await resume.promise;
            return theme;
        };
        const copying = copier.copy('view', ['one']);
        await entered.promise;
        state[edit] = state[edit].replace(edit === 'markdown' ? 'First' : '"title"', edit === 'markdown' ? 'Newer' : '"changed"');
        resume.resolve();
        assert.equal((await copying).kind, 'changed');
        assert.equal(state.writes.length, 0);
    }
});

void test('a later copy intent supersedes slow earlier preparation', async () => {
    const { state, host, copier } = setup(),
        entered = deferred(),
        resume = deferred();
    let calls = 0;
    host.theme = async () => {
        if (++calls === 1) {
            entered.resolve();
            await resume.promise;
        }
        return theme;
    };
    const first = copier.copy('view', ['one']);
    await entered.promise;
    assert.equal((await copier.copy('view', ['two'])).kind, 'copied');
    resume.resolve();
    assert.equal((await first).kind, 'canceled');
    assert.equal(state.writes.length, 1);
    assert.equal(decodeSlideClipboard(state.writes[0]!)!.captured.slides[0]!.id, 'two');
});

void test('an in-flight clipboard write finishes before the newer copy writes its result', async () => {
    const { state, host, copier } = setup(),
        writing = deferred(),
        resume = deferred(),
        secondPrepared = deferred();
    host.write = async (_context, encoded) => {
        state.writes.push(encoded);
        if (state.writes.length === 1) {
            writing.resolve();
            await resume.promise;
        }
    };
    let preparations = 0;
    host.theme = () => {
        if (++preparations === 2) secondPrepared.resolve();
        return Promise.resolve(theme);
    };
    const first = copier.copy('view', ['one']);
    await writing.promise;
    const second = copier.copy('view', ['two']);
    await secondPrepared.promise;
    assert.equal(state.writes.length, 1);
    resume.resolve();
    assert.equal((await first).kind, 'canceled');
    assert.equal((await second).kind, 'copied');
    assert.deepEqual(
        state.writes.map(source => decodeSlideClipboard(source)!.captured.slides[0]!.id),
        ['one', 'two']
    );
});

void test('unload or loss of the captured context cancels pending Copy without a write', async () => {
    for (const stop of [false, true]) {
        const { state, host, copier } = setup(),
            entered = deferred(),
            resume = deferred();
        host.theme = async () => {
            entered.resolve();
            await resume.promise;
            return theme;
        };
        const copying = copier.copy('view', ['one']);
        await entered.promise;
        if (stop) copier.stop();
        else state.active = false;
        resume.resolve();
        assert.equal((await copying).kind, 'canceled');
        assert.equal(state.writes.length, 0);
    }
});

void test('newer typing while Copy waits for an earlier write is checked when its turn arrives', async () => {
    const { state, host, copier } = setup(),
        writing = deferred(),
        resume = deferred(),
        prepared = deferred();
    host.write = async (_context, encoded) => {
        state.writes.push(encoded);
        writing.resolve();
        await resume.promise;
    };
    let calls = 0;
    host.theme = () => {
        if (++calls === 2) prepared.resolve();
        return Promise.resolve(theme);
    };
    const first = copier.copy('view', ['one']);
    await writing.promise;
    const second = copier.copy('view', ['two']);
    await prepared.promise;
    state.markdown = markdown.replace('Second', 'Newer');
    resume.resolve();
    assert.equal((await first).kind, 'canceled');
    assert.equal((await second).kind, 'changed');
    assert.equal(state.writes.length, 1);
});

void test('failed or unavailable reads/writes do not poison a later Copy', async () => {
    const { state, host, copier } = setup(),
        write = host.write.bind(host);
    host.write = () => Promise.reject(new Error('Clipboard unavailable'));
    assert.equal((await copier.copy('view', ['one'])).kind, 'failed');
    host.write = write;
    assert.equal((await copier.copy('view', ['two'])).kind, 'copied');
    host.theme = () => Promise.resolve(null);
    assert.equal((await copier.copy('view', ['one'])).kind, 'unavailable');
    assert.equal(state.writes.length, 1);
});

void test('clipboard origin identity persists only in vault-local storage and survives reload', () => {
    let stored: unknown = null,
        writes = 0;
    const host = {
        loadLocalStorage: (key: string) => {
            assert.equal(key, CLIPBOARD_VAULT_KEY);
            return stored;
        },
        saveLocalStorage: (key: string, value: unknown) => {
            assert.equal(key, CLIPBOARD_VAULT_KEY);
            stored = value;
            writes++;
        }
    };
    assert.equal(
        clipboardVaultId(host, () => uuid),
        uuid
    );
    assert.equal(
        clipboardVaultId(host, () => {
            throw new Error('Must reuse the identity');
        }),
        uuid
    );
    assert.equal(writes, 1);
    stored = 'invalid';
    assert.equal(
        clipboardVaultId(host, () => uuid),
        uuid
    );
    assert.equal(writes, 2);
});

void test('local Cut authority survives reload but cannot authorize an altered packet', async () => {
    const stored = new Map<string, unknown>();
    const host = {
        loadLocalStorage: (key: string) => stored.get(key),
        saveLocalStorage: (key: string, value: unknown) => {
            stored.set(key, value);
        }
    };
    const { copier } = setup();
    const copied = await copier.copy('view', ['one']);
    assert.equal(copied.kind, 'copied');
    if (copied.kind !== 'copied') return;
    const digest = await clipboardDigest(copied.encoded);
    assert.equal(ownsClipboardCut(host, digest), false);
    host.saveLocalStorage(CLIPBOARD_CUT_KEY, digest);
    assert.equal(ownsClipboardCut({ ...host }, await clipboardDigest(copied.encoded)), true);
    assert.equal(ownsClipboardCut(host, await clipboardDigest(copied.encoded.replace('First', 'Altered'))), false);
});
