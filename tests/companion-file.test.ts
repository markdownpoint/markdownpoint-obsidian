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
import { processCompanion } from '../src/presentation/companion-file.ts';

const path = 'deck/presentation.mdpoint';
const file = { path };
const markdown = { path: 'deck/slides.md' };
const pair = { markdown, companion: file };

test('a companion change during recovery preparation is reread without overwriting it', async () => {
    let disk = 'old',
        attempts = 0,
        preparations = 0;
    const vault = {
        getPair: () => pair,
        read: () => Promise.resolve(disk),
        process: (_file: typeof file, update: (source: string) => string) => {
            if (++attempts === 1) disk = 'external';
            disk = update(disk);
            return Promise.resolve(disk);
        }
    };
    await processCompanion(vault, path, current => {
        preparations++;
        return Promise.resolve(current + ':updated');
    });
    assert.equal(disk, 'external:updated');
    assert.equal(preparations, 2);
    assert.equal(attempts, 2);
});

test('failed recovery preparation and unchanged contents never reach a vault write', async () => {
    let writes = 0;
    const vault = {
        getPair: () => pair,
        read: () => Promise.resolve('original'),
        process: (_file: typeof file, _update: (source: string) => string) => {
            writes++;
            return Promise.resolve('unexpected');
        }
    };
    await assert.rejects(
        processCompanion(vault, path, () => Promise.reject(new Error('Backup failed'))),
        /Backup failed/
    );
    await processCompanion(vault, path, value => Promise.resolve(value));
    assert.equal(writes, 0);
    await assert.rejects(
        processCompanion({ ...vault, getPair: () => null }, path, value => Promise.resolve(value)),
        /missing/
    );
});

test('a real vault write failure is reported without retries', async () => {
    let attempts = 0;
    const vault = {
        getPair: () => pair,
        read: () => Promise.resolve('original'),
        process: (_file: typeof file, _update: (source: string) => string): Promise<string> => {
            attempts++;
            throw new Error('Disk write failed');
        }
    };
    await assert.rejects(
        processCompanion(vault, path, value => Promise.resolve(value + ':updated')),
        /Disk write failed/
    );
    assert.equal(attempts, 1);
});

test('replacing either member or introducing a conflict during recovery preparation cannot receive the old write', async () => {
    for (const replacement of [null, { ...pair, companion: { path } }, { ...pair, markdown: { path: markdown.path } }]) {
        let current: typeof pair | null = pair,
            disk = 'original';
        const vault = {
            getPair: () => current,
            read: () => Promise.resolve(disk),
            process: (_file: typeof file, update: (source: string) => string) => {
                disk = update(disk);
                return Promise.resolve(disk);
            }
        };
        await assert.rejects(
            processCompanion(vault, path, value => {
                current = replacement;
                return Promise.resolve(value + ':updated');
            }),
            /files changed/
        );
        assert.equal(disk, 'original');
    }
});

test('replacing Markdown while Vault.process is queued cannot commit old slide membership', async () => {
    let current: typeof pair | null = pair,
        disk = 'original';
    const vault = {
        getPair: () => current,
        read: () => Promise.resolve(disk),
        process: (_file: typeof file, update: (source: string) => string) => {
            current = { ...pair, markdown: { path: markdown.path } };
            disk = update(disk);
            return Promise.resolve(disk);
        }
    };
    await assert.rejects(
        processCompanion(vault, path, value => Promise.resolve(value + ':updated')),
        /files changed/
    );
    assert.equal(disk, 'original');
});
