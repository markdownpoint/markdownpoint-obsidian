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
import { mintId } from '../src/format/id-allocation.ts';

test("a minted id takes MarkdownPoint's allocated shape, id- and a letter, then five lowercase letters or digits", () => {
    const ids = Array.from({ length: 2000 }, () => mintId());
    for (const id of ids) assert.match(id, /^id-[a-z][a-z0-9]{5}$/);
    assert.ok(new Set(ids).size > 1990, 'drawn at random');
});

test('a minted id is drawn again while it is in use, and a draw that never comes free ends in an error', () => {
    const drawn: string[] = [];
    const id = mintId({ has: candidate => drawn.push(candidate) < 3 });
    assert.equal(drawn.length, 3);
    assert.equal(id, drawn[2]);
    assert.throws(() => mintId({ has: () => true }), /Could not allocate a fresh id/);
});
