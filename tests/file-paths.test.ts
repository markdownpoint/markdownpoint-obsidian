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
import { isAuthoredFilePath, isPortableName, isPresentationFilePath, isThemeFilePath } from '../src/format/file-paths.ts';

test('a portable name is one every supported system holds as written', () => {
    for (const name of ['Photo 1.PNG', 'Årets möte', 'a#b', 'console', 'com0', 'COM10', '.hidden'])
        assert.equal(isPortableName(name), true, name);
    for (const name of [
        '',
        'a<b',
        'a>b',
        'a:b',
        'a"b',
        'a|b',
        'a?b',
        'a*b',
        'a/b',
        'a\\b',
        'a\u0000b',
        'a\nb',
        'a\u007fb',
        'a\u0085b',
        'end.',
        'end ',
        '.',
        '..',
        'con',
        'NUL.txt',
        'Com1.tar.gz',
        'lpt¹',
        'COM³.png'
    ])
        assert.equal(isPortableName(name), false, JSON.stringify(name));
});

test("a file's path is MarkdownPoint's: portable names joined by a slash, none hidden and none with a number sign", () => {
    for (const path of ['media/picture.png', 'art/Wait... what.PNG', 'media/Årets möte/Photo 1.PNG', 'generated/picture.png'])
        assert.equal(isAuthoredFilePath(path), true, path);
    for (const path of [
        '',
        42,
        '/media/picture.png',
        'media//picture.png',
        'media/../picture.png',
        'media/./picture.png',
        'media/.cache/picture.png',
        'media/a#b.png',
        'media/a?b.png',
        'media/dir./picture.png',
        'media/con.png',
        'media\\picture.png',
        'https://example.com/picture.png',
        'generated/0f5b3c1e-7d1a-4c55-9d3a-7d3f8a2b9c01.json'
    ])
        assert.equal(isAuthoredFilePath(path), false, String(path));
});

test("a presentation's file is in media or generated, and a theme's is none of its package's own", () => {
    assert.equal(isPresentationFilePath('media/picture.png'), true);
    assert.equal(isPresentationFilePath('generated/picture.png'), true);
    for (const path of ['picture.png', 'misc/picture.png', 'media', 'Media/picture.png'])
        assert.equal(isPresentationFilePath(path), false, path);
    for (const path of ['art/logo.svg', 'logo.svg', 'previews-old/logo.png', 'art/manifest.json'])
        assert.equal(isThemeFilePath(path), true, path);
    for (const path of ['manifest.json', 'previews/cover.png', 'example/media/picture.png', 'art/.DS_Store', 'art/a#b.svg'])
        assert.equal(isThemeFilePath(path), false, path);
});
