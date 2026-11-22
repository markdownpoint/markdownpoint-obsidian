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
import { setTimeout as delay } from 'node:timers/promises';
import { beforeEach, test, vi } from 'vitest';
import type { App, Vault } from 'obsidian';
import { memoryApp, modals, notices } from './support/obsidian.ts';
import type { MarkdownView } from './support/obsidian.ts';
import { PresentationReader, readsAsPresentation } from '../src/presentation/reader.ts';
import { SlideData } from '../src/presentation/slide-data.ts';
import { SlideCreation } from '../src/presentation/new-slide.ts';
import type { SharedSettings } from '../src/settings/shared.ts';
import type { PresentationEditor } from '../src/editor/presentation-editor.ts';
import { getTranslations } from '../src/i18n/index.ts';
import type * as Readers from '../src/readers/markdownpoint-readers.js';

// Each pair MarkdownPoint's readers read, and each presentation file they read for it, counted, read as they read them
const pairsRead = vi.hoisted(() => ({ count: 0 }));
const filesRead = vi.hoisted(() => ({ count: 0 }));
vi.mock('../src/readers/markdownpoint-readers.js', async importOriginal => {
    const readers = await importOriginal<typeof Readers>();
    return {
        ...readers,
        readPresentationFile: (...file: Parameters<typeof readers.readPresentationFile>) => {
            filesRead.count++;
            return readers.readPresentationFile(...file);
        },
        readPresentationMarkdown: (...pair: Parameters<typeof readers.readPresentationMarkdown>) => {
            pairsRead.count++;
            return readers.readPresentationMarkdown(...pair);
        }
    };
});

const words = getTranslations('en').presentations;
const id = '0c3b6a2e-1d4f-4a5b-9c6d-7e8f9a0b1c2d';
const companion = (slides: readonly string[], version = '1.0') =>
    JSON.stringify({
        markdownpoint: version,
        type: 'presentation',
        id,
        theme: 'basic',
        slides: Object.fromEntries(slides.map(slide => [slide, { layout: 'title' }]))
    });
const markdown = (slides: readonly string[], before = '') =>
    `---\nmarkdownpoint: "1.0"\nid: ${id}\n---\n\n${before}${slides.map(slide => `<!-- slide: ${slide} -->\n`).join('\n')}`;
const path = 'Talk/slides.md';
const companionPath = 'Talk/presentation.mdpoint';

/**
 * A vault of these files with the reader running in it, over the plugin's own slide data, which writes the companion as
 * the plugin does and keeps its recovery copy in `recovery`.
 */
function vault(files: Readonly<Record<string, string>>, recovery: unknown = []) {
    const app = memoryApp(files);
    const state = { failing: false, recovery, gate: null as Promise<void> | null };
    const data = new SlideData({
        loadRecovery: () => Promise.resolve(state.recovery),
        saveRecovery: stored => {
            state.recovery = stored;
            return Promise.resolve();
        },
        process: async (target, update, canCommit) => {
            if (state.failing) throw new Error('The disk is full');
            const file = app.vault.getFileByPath(target)!;
            const before = new TextDecoder().decode(file.bytes);
            const after = await update(before);
            if (after !== before && canCommit()) app.vault.write(target, after);
        },
        failed: () => undefined
    });
    const reader = new PresentationReader(
        app as unknown as App,
        () => undefined,
        () => undefined,
        data
    );
    reader.load();
    const reads: string[] = [];
    const readBinary = app.vault.readBinary;
    app.vault.readBinary = async file => {
        reads.push(file.path);
        // A read held back, as a large file or a busy disk holds it
        if (state.gate) await state.gate;
        return readBinary(file);
    };
    /** The slides the presentation file on disk has records for. */
    const records = () =>
        Object.keys(
            (
                JSON.parse(
                    app.vault.getFileByPath(companionPath)!.bytes.length
                        ? new TextDecoder().decode(app.vault.getFileByPath(companionPath)!.bytes)
                        : '{}'
                ) as { slides?: object }
            ).slides ?? {}
        );
    return { app, reader, data, reads, state, records };
}

/** Whether the note in `view` reads as a presentation now: the reader holds its pair. */
const opens = (reader: PresentationReader, view: MarkdownView) =>
    view.file !== null && reader.matchesIdentity(view.file as never, view.getViewData());

/** Every read the vault's events started, done. */
const settle = () => delay(0);

beforeEach(() => {
    notices.length = 0;
});

test('a presentation opens only as MarkdownPoint opens it, and its author learns why not once a session for each file', async () => {
    const { app, reader } = vault({ 'Talk/slides.md': markdown(['a']), 'Talk/presentation.mdpoint': companion(['a']) });
    const view = app.open('Talk/slides.md');
    await settle();
    assert.equal(opens(reader, view), true);
    assert.deepEqual(notices, []);

    // Words before the first slide marker belong to no slide, which MarkdownPoint refuses in slides.md
    const refused = vault({ 'Talk/slides.md': markdown(['a'], 'Stray words\n\n'), 'Talk/presentation.mdpoint': companion(['a']) });
    const note = refused.app.open('Talk/slides.md');
    await settle();
    assert.equal(opens(refused.reader, note), false);
    assert.deepEqual(notices, [words.unreadableFile({ file: 'slides.md', presentation: 'Talk' })]);
    refused.app.open('Talk/slides.md');
    await settle();
    assert.equal(notices.length, 1, 'told once a session');

    // A change from outside that leaves another file unreadable is told when the author opens the presentation, not as it lands
    refused.app.vault.write('Talk/slides.md', markdown(['a']));
    refused.app.vault.write('Talk/presentation.mdpoint', '{');
    await settle();
    assert.equal(notices.length, 1);
    refused.app.open('Talk/slides.md');
    await settle();
    assert.deepEqual(notices.slice(1), [words.unreadableFile({ file: 'presentation.mdpoint', presentation: 'Talk' })]);
});

test('a reason no file holds names the presentation alone, and a newer format asks for the plugin to be updated', async () => {
    // A slide the presentation file lists, with no marker in slides.md
    const unmarked = vault({ 'Talk/slides.md': markdown(['a']), 'Talk/presentation.mdpoint': companion(['a', 'b']) });
    assert.equal(opens(unmarked.reader, unmarked.app.open('Talk/slides.md')), false);
    await settle();
    assert.deepEqual(notices, [words.unreadable({ presentation: 'Talk' })]);

    notices.length = 0;
    const newer = vault({ 'Talk/slides.md': markdown(['a']), 'Talk/presentation.mdpoint': companion(['a'], '2.0') });
    const view = newer.app.open('Talk/slides.md');
    await settle();
    assert.equal(opens(newer.reader, view), false);
    assert.deepEqual(notices, [words.newerFormat({ version: '2.0' })]);
});

test("a presentation at the vault's root opens, and one that doesn't is named by its vault", async () => {
    const root = vault({ 'slides.md': markdown(['a']), 'presentation.mdpoint': companion(['a']) });
    const view = root.app.open('slides.md');
    await settle();
    assert.equal(opens(root.reader, view), true);
    root.app.vault.write('presentation.mdpoint', '{');
    await settle();
    assert.equal(opens(root.reader, view), false);
    root.app.open('slides.md');
    await settle();
    assert.deepEqual(notices, [words.unreadableFile({ file: 'presentation.mdpoint', presentation: 'Vault' })]);
});

test('a change from outside that leaves the pair unreadable turns the presentation into a note, and its repair back', async () => {
    const { app, reader } = vault({ 'Talk/slides.md': markdown(['a']), 'Talk/presentation.mdpoint': companion(['a']) });
    const view = app.open('Talk/slides.md');
    await settle();
    app.vault.write('Talk/presentation.mdpoint', companion(['a', 'b']));
    await settle();
    assert.equal(opens(reader, view), false);
    app.vault.write('Talk/presentation.mdpoint', companion(['a']));
    await settle();
    assert.equal(opens(reader, view), true);
    assert.deepEqual(notices, []);
});

test('typing in a presentation MarkdownPoint refuses reads no file, until Obsidian saves the words', async () => {
    const { app, reader, reads } = vault({
        'Talk/slides.md': markdown(['a'], 'Stray words\n\n'),
        'Talk/presentation.mdpoint': companion(['a'])
    });
    const view = app.open('Talk/slides.md');
    await settle();
    const opened = reads.length;
    for (const typed of ['Stray word\n\n', 'Stray\n\n', '']) app.type(view, markdown(['a'], typed));
    await settle();
    assert.equal(reads.length, opened);
    app.save(view);
    await settle();
    assert.equal(opens(reader, view), true);
});

test("the plugin's two writes of an edit read as one, its companion's save landing before Obsidian's save of the words", async () => {
    // A slide deleted, its record removed at once; then one added, its record written at once
    const { app, reader, data, records } = vault({ [path]: markdown(['a', 'b']), [companionPath]: companion(['a', 'b']) });
    const view = app.open(path);
    await settle();
    assert.ok(await data.remember(path, id, companion(['a', 'b']), ['b']));
    app.type(view, markdown(['a']));
    await settle();
    assert.deepEqual(records(), ['a'], 'the companion saved first');
    assert.equal(opens(reader, view), true, 'the words not saved yet');
    app.save(view);
    await settle();
    assert.equal(opens(reader, view), true);

    assert.ok(await data.remember(path, id, companion(['a', 'c']), ['c']));
    app.type(view, markdown(['a', 'c']));
    await settle();
    assert.deepEqual(records(), ['a', 'c']);
    assert.equal(opens(reader, view), true, 'the words not saved yet');
    app.save(view);
    await settle();
    assert.equal(opens(reader, view), true);
    assert.deepEqual(notices, []);
});

test('a slide restored before the reader takes the companion its deletion saved opens, and its record is written back', async () => {
    const { app, reader, data, state, records } = vault({ [path]: markdown(['a', 'b']), [companionPath]: companion(['a', 'b']) });
    const view = app.open(path);
    await settle();
    assert.ok(await data.remember(path, id, companion(['a', 'b']), ['b']));
    // The deletion's save lands, and the read it starts is held before it takes that companion
    let release!: () => void;
    state.gate = new Promise(resolve => (release = resolve));
    app.type(view, markdown(['a']));
    await settle();
    assert.deepEqual(records(), ['a']);
    // Undone meanwhile: the reader still holds the companion from before the deletion, so this edit saves nothing
    app.type(view, markdown(['a', 'b']));
    await settle();
    state.gate = null;
    release();
    await settle();
    await settle();
    assert.equal(opens(reader, view), true);
    assert.deepEqual(records(), ['a', 'b']);
});

test('a deck whose record a failed save kept on this device opens after a restart, and the plugin writes the record back', async () => {
    const recovery = [{ path, presentationId: id, records: { b: JSON.stringify({ layout: 'title' }) } }];
    // Obsidian saved the words with slide b, and the companion's save of its record failed before the restart
    const { app, reader, records } = vault({ [path]: markdown(['a', 'b']), [companionPath]: companion(['a']) }, recovery);
    const view = app.open(path);
    await settle();
    await settle();
    assert.equal(opens(reader, view), true);
    assert.deepEqual(records(), ['a', 'b']);
    assert.deepEqual(notices, []);
});

test('both files changed from outside open as the files have them, before Obsidian shows the new words', async () => {
    const { app, reader } = vault({ [path]: markdown(['a', 'b']), [companionPath]: companion(['a', 'b']) });
    const view = app.open(path);
    await settle();
    app.vault.write(path, markdown(['a']));
    app.vault.write(companionPath, companion(['a']));
    await settle();
    assert.equal(view.getViewData(), markdown(['a', 'b']));
    assert.equal(opens(reader, view), true);
});

test("a companion broken from outside is refused, though the plugin's own save of it failed", async () => {
    const { app, reader, data, state } = vault({ [path]: markdown(['a', 'b']), [companionPath]: companion(['a', 'b']) });
    const view = app.open(path);
    await settle();
    assert.ok(await data.remember(path, id, companion(['a', 'b']), ['b']));
    state.failing = true;
    app.type(view, markdown(['a']));
    await settle();
    app.vault.write(companionPath, '{');
    await settle();
    assert.equal(opens(reader, view), false);
});

test('a reading view whose read of the files failed reads them again, not the failure', async () => {
    const { app } = vault({ [path]: markdown(['a']), [companionPath]: companion(['a']) });
    const readBinary = app.vault.readBinary;
    app.vault.readBinary = () => Promise.reject(new Error('Not downloaded yet'));
    assert.equal(await readsAsPresentation(app.vault as unknown as Vault, path), false);
    app.vault.readBinary = readBinary;
    assert.equal(await readsAsPresentation(app.vault as unknown as Vault, path), true);
});

test("a deck opened for records the plugin writes back gets them written, though the plugin's last save already wrote them", async () => {
    const { app, reader, data, state, records } = vault({ [path]: markdown(['a']), [companionPath]: companion(['a']) });
    const view = app.open(path);
    await settle();
    // A slide added while the reader's reads are held: its record is saved, then the words, then a sync brings back the
    // companion from before the slide
    let release!: () => void;
    state.gate = new Promise(resolve => (release = resolve));
    assert.ok(await data.remember(path, id, companion(['a', 'b']), ['b']));
    app.type(view, markdown(['a', 'b']));
    await settle();
    assert.deepEqual(records(), ['a', 'b']);
    app.save(view);
    app.vault.write(companionPath, companion(['a']));
    state.gate = null;
    release();
    await settle();
    await settle();
    assert.equal(opens(reader, view), true);
    assert.deepEqual(records(), ['a', 'b']);
});

test("files unchanged since their last read aren't read as a pair again, by the reader or the reading view", async () => {
    const { app, reader } = vault({ [path]: markdown(['a']), [companionPath]: companion(['a']) });
    const unopened = filesRead.count;
    // Opening the note starts two reads, which read the presentation file once
    const view = app.open(path);
    await settle();
    assert.equal(filesRead.count, unopened + 1);
    const opened = pairsRead.count;
    // A command reads the presentation before it changes it, as New slide does three times
    for (let index = 0; index < 3; index++) await reader.refreshView(view as never);
    assert.equal(await readsAsPresentation(app.vault as unknown as Vault, path), true);
    assert.equal(pairsRead.count, opened);
    // A change to either file reads the pair anew, once for the reader and the reading view together
    for (const [file, contents] of [
        [path, markdown(['a'], 'Notes before the first slide.\n\n')],
        [companionPath, companion(['a', 'b'])]
    ] as const) {
        const before = pairsRead.count;
        const filesBefore = filesRead.count;
        app.vault.write(file, contents);
        await settle();
        assert.equal(await readsAsPresentation(app.vault as unknown as Vault, path), false, file);
        assert.equal(pairsRead.count, before + 1, file);
        // The presentation file is read anew only when it changed
        assert.equal(filesRead.count, filesBefore + (file === companionPath ? 1 : 0), file);
    }
});

test('a save of the words alone reads the presentation file no more, and a change Obsidian reports to it reads it anew', async () => {
    const { app, reader, reads } = vault(themed(false));
    const view = app.open(path);
    await settle();
    assert.equal(opens(reader, view), true);
    const files = filesRead.count;
    const pairs = pairsRead.count;
    const opened = reads.length;
    // Saves as Obsidian makes them while the author types
    for (let index = 0; index < 3; index++) {
        app.type(view, `${markdown(['a', 'b'])}\n<!-- notes -->\nNotes ${index}.\n`);
        const typed = reader.snapshot(view.file as never, view.getViewData());
        app.save(view);
        await settle();
        assert.equal(opens(reader, view), true);
        assert.equal(reader.snapshot(view.file as never, view.getViewData()), typed, 'the words typed are parsed once, not again as saved');
    }
    assert.ok(pairsRead.count >= pairs + 3, 'each save reads the pair');
    assert.equal(filesRead.count, files, 'and none reads the presentation file');
    assert.deepEqual(reads.slice(opened), [path, path, path], 'nor its bytes');
    assert.equal(await readsAsPresentation(app.vault as unknown as Vault, path), true);
    assert.equal(filesRead.count, files, 'nor does the reading view');
    // A change to the presentation file, then one that keeps its time and size: each reads it anew
    app.vault.write(companionPath, companion(['a', 'b', 'c']));
    await settle();
    assert.equal(filesRead.count, files + 1);
    app.vault.write(companionPath, companion(['a', 'b', 'd']), true);
    await settle();
    assert.equal(filesRead.count, files + 2);
    assert.equal(await readsAsPresentation(app.vault as unknown as Vault, path), false, 'a record no marker names refuses the pair');
});

test("a picture added to the presentation's media shows on its slide, though both files stay as they were", async () => {
    const { app, reader } = vault({
        [path]: markdown(['a']),
        [companionPath]: JSON.stringify({
            markdownpoint: '1.0',
            type: 'presentation',
            id,
            theme: 'basic',
            slides: { a: { layout: 'title', background: { image: { file: 'media/back.png' } } } }
        }),
        // A theme that reads, which a save of the words alone keeps
        'Talk/themes/basic/master.json': basic('master.json'),
        'Talk/themes/basic/title.json': basic('title.json')
    });
    const view = app.open(path);
    await settle();
    const pictures = () =>
        reader
            .snapshot(view.file as never, view.getViewData())
            ?.images.get('a')
            ?.map(image => image.path);
    assert.deepEqual(pictures(), []);
    app.vault.write('Talk/media/back.png', new Uint8Array([137, 80, 78, 71]));
    await settle();
    assert.deepEqual(pictures(), ['Talk/media/back.png']);
});

test("a change Obsidian reports reads the pair anew, though the write kept both files' time and size", async () => {
    const { app, reader } = vault({ [path]: markdown(['a']), [companionPath]: companion(['a']) });
    const view = app.open(path);
    await settle();
    // The same length, with a record no marker names in place of the one slides.md has
    app.vault.write(companionPath, companion(['b']), true);
    await settle();
    assert.equal(opens(reader, view), false);
    assert.equal(await readsAsPresentation(app.vault as unknown as Vault, path), false);
});

/** A file of MarkdownPoint's Basic theme as the plugin ships it, or one MarkdownPoint refuses: its name isn't one line. */
const basic = (name: string, refused = false) => {
    const source = readFileSync(new URL(`../src/themes/basic/${name}`, import.meta.url), 'utf8');
    return refused ? JSON.stringify({ ...(JSON.parse(source) as object), name: '\nRefused' }) : source;
};
/** A deck of a slide on the Title layout and one on Content, its theme Basic's master and those two layouts. */
const themed = (contentRefused: boolean, titleRefused = false) => ({
    [path]: markdown(['a', 'b']),
    [companionPath]: JSON.stringify({
        markdownpoint: '1.0',
        type: 'presentation',
        id,
        theme: 'basic',
        slides: { a: { layout: 'title' }, b: { layout: 'content' } }
    }),
    'Talk/themes/basic/master.json': basic('master.json'),
    'Talk/themes/basic/title.json': basic('title.json', titleRefused),
    'Talk/themes/basic/content.json': basic('content.json', contentRefused)
});

test('a layout MarkdownPoint refuses leaves the others their slides, read once until the theme changes', async () => {
    const { app, reader, reads } = vault(themed(true));
    const view = app.open(path);
    await settle();
    const structured = () =>
        reader.snapshot(view.file as never, view.getViewData())!.outline.slides.map(slide => [slide.id, slide.structure != null]);
    assert.deepEqual(structured(), [
        ['a', true],
        ['b', false]
    ]);
    const themeReads = () => reads.filter(read => read.startsWith('Talk/themes/')).length;
    const before = themeReads();
    for (let index = 0; index < 2; index++) await reader.refreshView(view as never);
    assert.equal(themeReads(), before, 'the theme read for both layouts serves again, the refused one included');
    // The layout repaired: its slide has its structure
    app.vault.write('Talk/themes/basic/content.json', basic('content.json'));
    await settle();
    assert.deepEqual(structured(), [
        ['a', true],
        ['b', true]
    ]);
    // The folder around the theme renamed: the theme read before is no longer the presentation's
    app.vault.rename('Talk/themes', 'themes-old');
    await settle();
    assert.deepEqual(structured(), [
        ['a', false],
        ['b', false]
    ]);
});

test('a presentation turned back to keeps its slides as its theme made them while its files are read again', async () => {
    const { app, reader } = vault({ ...themed(false), 'Other/slides.md': markdown(['a']), 'Other/presentation.mdpoint': companion(['a']) });
    const structured = (view: MarkdownView) =>
        reader.snapshot(view.file as never, view.getViewData())?.outline.slides.map(slide => slide.structure != null);
    app.open(path);
    await settle();
    app.open('Other/slides.md');
    await settle();
    const view = app.open(path);
    assert.deepEqual(structured(view), [true, true], 'before the read');
    await settle();
    assert.deepEqual(structured(view), [true, true]);
});

test('New slide in a presentation whose every layout MarkdownPoint refuses says none is available, and opens no picker', async () => {
    const { app, reader } = vault(themed(true, true));
    const view = app.open(path);
    await settle();
    modals.length = 0;
    const creation = new SlideCreation(
        app as unknown as App,
        reader,
        {} as PresentationEditor,
        { ready: Promise.resolve(), layoutShortcuts: {} } as unknown as SharedSettings,
        () => undefined
    );
    creation.load();
    await creation.choose(
        { file: view.file as never, view: view as never, canApply: () => true, editingView: () => Promise.resolve(view as never) },
        null
    );
    assert.deepEqual(modals, []);
    assert.deepEqual(notices, [getTranslations('en').slides.layoutsUnavailable]);
});

test("a closed presentation's files changed keep no reading of them, though the write kept their time and size", async () => {
    const { app } = vault({ [path]: markdown(['a']), [companionPath]: companion(['a']) });
    assert.equal(await readsAsPresentation(app.vault as unknown as Vault, path), true);
    app.vault.write(companionPath, companion(['b']), true);
    await settle();
    assert.equal(await readsAsPresentation(app.vault as unknown as Vault, path), false);
});
