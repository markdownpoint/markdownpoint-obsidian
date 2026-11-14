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
import { creationThemes, opensAsMade } from '../src/presentation/theme-catalog.ts';
import { prepareNewPresentation } from '../src/format/new-presentation.ts';
import { basicTheme } from '../src/themes/basic.ts';
import { memoryApp } from './support/obsidian.ts';

/** A file of MarkdownPoint's Basic theme as the plugin ships it. */
const basic = (name: string) => readFileSync(new URL(`../src/themes/basic/${name}`, import.meta.url), 'utf8');
/** Basic's master under its own id, with the fields given. */
const master = (id: string, fields: Record<string, unknown> = {}) =>
    JSON.stringify({ ...(JSON.parse(basic('master.json')) as object), id, ...fields });

test('New offers a theme only when MarkdownPoint reads it and opens the presentation New makes from it', async () => {
    const app = memoryApp({
        'Talks/themes/clean/master.json': master('11111111-1111-4111-8111-111111111111'),
        'Talks/themes/clean/title.json': basic('title.json'),
        // MarkdownPoint refuses a master whose name isn't one line
        'Old/themes/named/master.json': master('22222222-2222-4222-8222-222222222222', { name: '\nNamed' }),
        'Old/themes/named/title.json': basic('title.json'),
        // Its one layout MarkdownPoint refuses, so no slide can be made from it
        'Odd/themes/bare/master.json': master('33333333-3333-4333-8333-333333333333'),
        'Odd/themes/bare/title.json': JSON.stringify({ ...(JSON.parse(basic('title.json')) as object), name: '\nTitle' })
    });
    const themes = await creationThemes(app.vault as unknown as Vault);
    assert.deepEqual(
        themes.map(choice => choice.folder?.path ?? 'included'),
        ['included', 'Talks/themes/clean']
    );
});

test('the pair New makes opens as MarkdownPoint opens it, and one it would refuse does not', () => {
    const made = prepareNewPresentation(basicTheme, '0c3b6a2e-1d4f-4a5b-9c6d-7e8f9a0b1c2d', 'first')!;
    assert.equal(opensAsMade('Talk', made), true);
    assert.equal(opensAsMade('Talk', { ...made, markdown: `${made.markdown}\n<!-- slide: second -->\n` }), false);
});
