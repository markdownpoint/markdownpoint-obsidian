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
import { readJsonObject } from '../src/format/json.ts';

test('a JSON object reads as MarkdownPoint reads one: past a byte order mark, refused for a key written twice, at any size', () => {
    assert.deepEqual(readJsonObject(`${String.fromCharCode(0xfeff)}{"a":1}`), { a: 1 });
    assert.equal(readJsonObject('{"a":{"b":1,"b":2}}'), null);
    // More values in one array than a call takes arguments.
    const values = Array.from({ length: 200_000 }, (_, index) => index);
    assert.equal((readJsonObject(JSON.stringify({ values }))?.values as number[] | undefined)?.length, 200_000);
});
