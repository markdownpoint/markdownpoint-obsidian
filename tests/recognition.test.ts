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
import type { TFolder as ObsidianFolder, Vault } from 'obsidian';
import {
    inSavedVersions,
    newerFormat,
    presentationCompanionPath,
    presentationIdentity,
    presentationPairNames
} from '../src/format/recognition.ts';
import { enclosingPresentation, learnVaultCase, presentationAround, presentationFiles } from '../src/presentation/presentation-files.ts';
import { TFile, TFolder } from './support/obsidian.ts';

const presentationId = '12345678-1234-7234-9234-123456789abc';
const frontmatter = { markdownpoint: '1.0', id: presentationId };
const companion = { markdownpoint: '1.0', type: 'presentation', id: presentationId, slides: {} };

test('the fixed companion stays beside slides.md at the vault root or in a nested folder', () => {
    assert.equal(presentationCompanionPath('slides.md'), 'presentation.mdpoint');
    assert.equal(presentationCompanionPath('Talks/Årets möte/slides.md'), 'Talks/Årets möte/presentation.mdpoint');
    assert.equal(presentationCompanionPath('Talks/Årets möte/Slides.MD'), 'Talks/Årets möte/presentation.mdpoint');
    for (const path of ['slides.md.bak', 'notes.md', 'slides.md/notes.md', 'slides.md/']) {
        assert.equal(presentationCompanionPath(path), null);
    }
});

test('a saved version stays ordinary Markdown, as MarkdownPoint opens one only from its presentation', () => {
    for (const path of ['Talk/versions/2026-10-30T16.20.05Z-k3pz/slides.md', 'versions/2026-10-30T16.20.05Z-a1b2/slides.md']) {
        assert.equal(presentationCompanionPath(path), null);
    }
    assert.equal(presentationCompanionPath('versions/slides.md'), 'versions/presentation.mdpoint');
    assert.equal(presentationCompanionPath('Talk/versions/draft/slides.md'), 'Talk/versions/draft/presentation.mdpoint');
    // A folder named by a time alone is no version's, as every version's name ends in its tail.
    assert.equal(
        presentationCompanionPath('Talk/versions/2026-10-30T16.20.05Z/slides.md'),
        'Talk/versions/2026-10-30T16.20.05Z/presentation.mdpoint'
    );
    // A version is saved on a day the calendar has, at a time the clock shows, as MarkdownPoint names one.
    for (const time of ['2024-02-29T00.00.00Z', '2000-02-29T23.59.59Z'])
        assert.equal(presentationCompanionPath(`versions/${time}-k3pz/slides.md`), null, time);
    for (const time of [
        '2026-02-29T16.20.05Z',
        '1900-02-29T16.20.05Z',
        '0000-01-01T16.20.05Z',
        '2026-04-31T16.20.05Z',
        '2026-10-30T24.00.00Z',
        '2026-10-30T16.60.05Z',
        '2026-10-30T16.20.60Z'
    ])
        assert.equal(presentationCompanionPath(`versions/${time}-k3pz/slides.md`), `versions/${time}-k3pz/presentation.mdpoint`, time);
});

test('anything under the versions/ of a folder holding a presentation is no presentation of its own, as the app refuses it', () => {
    const holds =
        (...folders: string[]) =>
        (folder: string) =>
            folders.includes(folder);
    // A Finder or File Explorer copy of a version's folder, and any other folder there, beside the presentation they belong to.
    for (const path of [
        'Talk/versions/2026-10-30T16.20.05Z-k3pz copy/slides.md',
        'Talk/versions/draft/slides.md',
        'Talk/versions/slides.md'
    ])
        assert.equal(inSavedVersions(path, holds('Talk')), true, path);
    assert.equal(inSavedVersions('versions/draft/slides.md', holds('')), true, 'at the vault root');
    assert.equal(inSavedVersions('Talk/versions/a/versions/b/slides.md', holds('Talk/versions/a')), true, 'the nearer versions/');
    // A folder named versions in a folder holding no presentation is the author's own.
    assert.equal(inSavedVersions('Talk/versions/draft/slides.md', holds('Other')), false);
    assert.equal(inSavedVersions('Talk/Versions/draft/slides.md', holds('Talk')), false, 'the format spells versions/ in lowercase');
    // On a volume that finds a name in another case, `Versions/` is the folder the app reads as `versions/`.
    assert.equal(inSavedVersions('Talk/Versions/draft/slides.md', holds('Talk'), true), true);
    assert.equal(inSavedVersions('Talk/VERSIONS/2026-10-30T16.20.05Z-k3pz/slides.md', undefined, true), true);
    assert.equal(inSavedVersions('Talk/Versions/draft/slides.md', holds('Other'), true), false);
    // A version's own folder is one by its name, whether or not its presentation's files are there.
    assert.equal(inSavedVersions('Talk/versions/2026-10-30T16.20.05Z-k3pz/slides.md'), true);
    assert.equal(inSavedVersions('Talk/versions/2026-10-30T16.20.05Z-k3pz/media/slides.md'), true);
    assert.equal(inSavedVersions('Talk/slides.md', holds('Talk')), false);
});

test("a pair under a presentation folder's versions/ resolves to no files, so the plugin neither opens nor writes it", () => {
    const folders = new Map<string, TFolder>();
    const folder = (path: string, names: string[]): void => {
        const entry = new TFolder(path);
        entry.children = names.map(name => new TFile(path ? `${path}/${name}` : name, new Uint8Array(), 0));
        folders.set(path, entry);
    };
    folder('Talk', ['slides.md', 'presentation.mdpoint']);
    folder('Talk/versions/2026-10-30T16.20.05Z-k3pz copy', ['slides.md', 'presentation.mdpoint']);
    folder('Notes', ['todo.md']);
    folder('Notes/versions/draft', ['slides.md', 'presentation.mdpoint']);
    const vault = {
        getRoot: () => folders.get('') ?? new TFolder(''),
        getFolderByPath: (path: string) => folders.get(path) ?? null
    } as unknown as Vault;
    assert.equal(presentationFiles(vault, 'Talk/versions/2026-10-30T16.20.05Z-k3pz copy/slides.md'), null);
    assert.equal(presentationFiles(vault, 'Talk/versions/2026-10-30T16.20.05Z-k3pz copy/presentation.mdpoint'), null);
    assert.equal(presentationFiles(vault, 'Talk/slides.md')?.companion.path, 'Talk/presentation.mdpoint');
    assert.equal(presentationFiles(vault, 'Notes/versions/draft/slides.md')?.companion.path, 'Notes/versions/draft/presentation.mdpoint');
});

test("a pair inside another presentation's folder resolves to no files and names the outermost presentation around it, while a lone presentation file makes none", () => {
    const folders = new Map<string, TFolder>();
    const folder = (path: string, names: string[]): void => {
        const entry = new TFolder(path);
        entry.children = names.map(name =>
            Object.assign(new TFile(path ? `${path}/${name}` : name, new Uint8Array(), 0), { parent: entry })
        );
        entry.parent = path ? folders.get(path.slice(0, Math.max(0, path.lastIndexOf('/'))))! : null;
        entry.parent?.children.push(entry);
        folders.set(path, entry);
    };
    folder('', []);
    folder('Talk', ['Slides.md', 'presentation.mdpoint']);
    folder('Talk/media', []);
    folder('Talk/media/Middle', ['slides.md', 'presentation.mdpoint']);
    folder('Talk/media/Middle/Inner', ['slides.md', 'presentation.mdpoint']);
    folder('Loose', ['presentation.mdpoint']);
    folder('Loose/Deck', ['slides.md', 'presentation.mdpoint']);
    const vault = { getRoot: () => folders.get('')!, getFolderByPath: (path: string) => folders.get(path) ?? null } as unknown as Vault;
    assert.equal(
        presentationFiles(vault, 'Talk/Slides.md')?.companion.path,
        'Talk/presentation.mdpoint',
        'a presentation holding others opens'
    );
    assert.equal(presentationAround(vault, 'Talk/Slides.md'), null);
    for (const path of ['Talk/media/Middle/slides.md', 'Talk/media/Middle/Inner/presentation.mdpoint']) {
        assert.equal(presentationFiles(vault, path), null, path);
        assert.equal(presentationAround(vault, path)?.path, 'Talk', path);
    }
    assert.equal(
        enclosingPresentation(folders.get('Talk/media') as unknown as ObsidianFolder)?.path,
        'Talk',
        'from a folder at any depth, the outermost'
    );
    assert.equal(presentationFiles(vault, 'Loose/Deck/slides.md')?.companion.path, 'Loose/Deck/presentation.mdpoint');
    assert.equal(
        enclosingPresentation(folders.get('Loose') as unknown as ObsidianFolder),
        null,
        'a lone presentation file makes no folder a presentation'
    );
});

test("a pair under Versions/ is a saved version where the vault's volume finds a name in another case, and the author's own elsewhere", async () => {
    const folders = new Map<string, TFolder>();
    const folder = (path: string, names: string[]): void => {
        const entry = new TFolder(path);
        entry.children = names.map(name => new TFile(path ? `${path}/${name}` : name, new Uint8Array(), 0));
        folders.set(path, entry);
    };
    folder('Talk', ['slides.md', 'presentation.mdpoint']);
    folder('Talk/Versions/draft', ['slides.md', 'presentation.mdpoint']);
    // A volume that ignores case finds the plugins folder in another case too, unless asked for that spelling alone, though
    // the config folder's name has no letters.
    const vault = (ignoresCase: boolean, spelled: readonly string[] = ['.123/plugins']) =>
        ({
            configDir: '.123',
            adapter: {
                exists: async (path: string, sensitive = false) =>
                    spelled.includes(path) || (ignoresCase && !sensitive && spelled.some(name => name.toLowerCase() === path.toLowerCase()))
            },
            getRoot: () => new TFolder(''),
            getFolderByPath: (path: string) => folders.get(path) ?? null
        }) as unknown as Vault;
    const caseless = vault(true);
    const cased = vault(false);
    // A volume that keeps case can hold a second folder spelled the other way.
    const twoFolders = vault(false, ['.123/plugins', '.123/PLUGINS']);
    for (const each of [caseless, cased, twoFolders]) await learnVaultCase(each);
    assert.equal(presentationFiles(caseless, 'Talk/Versions/draft/slides.md'), null);
    for (const each of [cased, twoFolders])
        assert.equal(presentationFiles(each, 'Talk/Versions/draft/slides.md')?.companion.path, 'Talk/Versions/draft/presentation.mdpoint');
});

test('pair discovery keeps actual filename case and leaves unrelated notes alone', () => {
    assert.deepEqual(
        presentationPairNames([
            'Slides.MD',
            'Presentation.MDPOINT',
            'README.md',
            'notes.md',
            'slideshow.md',
            '._presentation.mdpoint',
            '._slides.md',
            '.mdpoint'
        ]),
        { markdown: 'Slides.MD', companion: 'Presentation.MDPOINT' }
    );
    assert.equal(presentationPairNames(['slides.md', 'old-name.mdpoint']), null);
    assert.equal(presentationPairNames(['slides copy.md', 'presentation.mdpoint']), null);
    assert.equal(presentationPairNames(['slides.md']), null);
    assert.equal(presentationPairNames(['presentation.mdpoint']), null);
});

test('a conflicted copy of either member makes the pair unavailable', () => {
    for (const copy of [
        'slides copy.md',
        'slides 2.md',
        'slides-laptop.md',
        'slides (1).md',
        'slides (conflicted copy).md',
        'SLIDES.MD',
        'Presentation.MDPOINT',
        'presentation copy.mdpoint',
        'another.mdpoint'
    ]) {
        assert.equal(presentationPairNames(['slides.md', 'presentation.mdpoint', copy]), null, copy);
    }
});

test('format-1 metadata with the same canonical presentation identity recognizes the pair', () => {
    assert.equal(presentationIdentity(frontmatter, companion), presentationId);
});

test('a missing or unrelated companion and ordinary frontmatter do not recognize a presentation', () => {
    for (const value of [null, undefined, false, [], 'presentation', {}, { document: presentationId }]) {
        assert.equal(presentationIdentity(frontmatter, value), null);
        assert.equal(presentationIdentity(value, companion), null);
    }
    assert.equal(presentationIdentity(frontmatter, { ...companion, type: 'theme' }), null);
});

test('each file must declare a version 1 format as a quoted major and minor', () => {
    for (const markdownpoint of [undefined, 1, 1.5, '1', '01.0', '1.01', '2.0', '0.9', ' 1.0']) {
        assert.equal(presentationIdentity({ ...frontmatter, markdownpoint }, companion), null, String(markdownpoint));
        assert.equal(presentationIdentity(frontmatter, { ...companion, markdownpoint }), null, String(markdownpoint));
    }
    for (const markdownpoint of ['1.0', '1.3', '1.10']) {
        assert.equal(
            presentationIdentity({ ...frontmatter, markdownpoint }, { ...companion, markdownpoint }),
            presentationId,
            markdownpoint
        );
    }
});

test('the format before 1.0, with a numeric version and a document key, stays an ordinary note', () => {
    const before = { markdownpoint: 1, document: presentationId };
    assert.equal(presentationIdentity(before, { markdownpoint: 1, type: 'presentation', document: presentationId }), null);
    assert.equal(
        presentationIdentity({ markdownpoint: '1.0', document: presentationId }, { ...companion, id: undefined, document: presentationId }),
        null
    );
});

test('a mismatched, missing, or noncanonical identity does not activate presentation behavior', () => {
    assert.equal(presentationIdentity(frontmatter, { ...companion, id: '87654321-1234-7234-9234-123456789abc' }), null);
    for (const value of [undefined, '', 'not-a-uuid', presentationId.toUpperCase(), ` ${presentationId}`]) {
        assert.equal(presentationIdentity({ ...frontmatter, id: value }, { ...companion, id: value }), null);
    }
});

test('recognition leaves unrelated frontmatter and presentation data untouched', () => {
    const markdown = { ...frontmatter, tags: ['writing'], nested: { author: 'A writer' } };
    const data = { ...companion, extra: { future: true }, slides: { opening: { layout: 'title' } } };
    const before = structuredClone({ markdown, data });
    assert.equal(presentationIdentity(markdown, data), presentationId);
    assert.deepEqual({ markdown, data }, before);
});

test('a pair of a newer major states its version through the envelope keys, and every other pair states none', () => {
    const later = { ...companion, markdownpoint: '2.0', slides: { opening: { layout: 'title', unknown: true } } };
    assert.equal(presentationIdentity({ ...frontmatter, markdownpoint: '2.0' }, later), null);
    assert.equal(newerFormat({ ...frontmatter, markdownpoint: '2.0' }, later), '2.0');
    assert.equal(newerFormat(frontmatter, later), '2.0');
    assert.equal(newerFormat({ ...frontmatter, markdownpoint: '3.1' }, companion), '3.1');
    for (const markdownpoint of ['1.0', '1.4'])
        assert.equal(newerFormat(frontmatter, { ...companion, markdownpoint }), null, markdownpoint);
    for (const value of [
        { ...later, type: 'theme' },
        { ...later, id: '87654321-1234-7234-9234-123456789abc' },
        { ...later, id: undefined, document: presentationId }
    ])
        assert.equal(newerFormat({ ...frontmatter, markdownpoint: '2.0' }, value), null);
    for (const markdownpoint of [undefined, 1, '2', '0.9'])
        assert.equal(newerFormat({ ...frontmatter, markdownpoint }, later), null, String(markdownpoint));
    assert.equal(newerFormat(null, later), null);
    assert.equal(
        newerFormat({ markdownpoint: 1, document: presentationId }, { markdownpoint: 1, type: 'presentation', document: presentationId }),
        null
    );
});
