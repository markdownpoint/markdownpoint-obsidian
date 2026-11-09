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
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

test("what the plugin carries of MarkdownPoint, Basic and core's chart number rules with their CLDR walk, is MarkdownPoint's own, file for file, as the manifest written with it names each by its digest", () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const copies = Object.fromEntries(
        ['src/core', 'src/common', 'src/themes/basic'].flatMap(folder =>
            readdirSync(path.join(root, folder), { recursive: true, withFileTypes: true })
                .filter(entry => entry.isFile())
                .map(entry => {
                    const file = path.join(entry.parentPath, entry.name);
                    return [
                        path.relative(root, file).split(path.sep).join('/'),
                        createHash('sha256').update(readFileSync(file)).digest('hex')
                    ];
                })
        )
    );
    const manifest = JSON.parse(readFileSync(new URL('./copies-manifest.json', import.meta.url), 'utf8')) as {
        files: Record<string, string>;
    };
    assert.deepEqual(copies, manifest.files);
});
