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
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';

test("MarkdownPoint's readers are the bundle its app made at one commit, unedited: each file is what its header's digest names", () => {
    const commits = new Set<string>();
    for (const file of ['markdownpoint-readers.js', 'markdownpoint-readers.d.ts']) {
        const text = readFileSync(new URL(`../src/readers/${file}`, import.meta.url), 'utf8');
        const commit = /^\/\/ app ([0-9a-f]{40})$/m.exec(text)?.[1];
        const stamp = /^\/\/ sha256 ([0-9a-f]{64})\n/m.exec(text);
        assert.ok(commit && stamp, `${file} has the bundle's header`);
        commits.add(commit);
        const body = text.slice(stamp.index + stamp[0].length);
        assert.equal(createHash('sha256').update(body).digest('hex'), stamp[1], `${file} is as the app made it`);
    }
    assert.equal(commits.size, 1, 'both files are of one commit');
});
