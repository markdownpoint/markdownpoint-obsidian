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
import {
    compareVersions,
    getLatestReleaseNotes,
    getReleaseNotesForUpdate,
    normalizeVersion,
    shouldAutoDisplayReleaseNotesForUpdate
} from '../src/release-notes.ts';
import { SharedSettings } from '../src/settings/shared.ts';

const manifest: unknown = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));

test('versions are ordered segment by segment as numbers, a missing segment counting as zero', () => {
    assert.equal(compareVersions('1.2.0', '1.10.0'), -1);
    assert.equal(compareVersions('2.0.0', '1.9.9'), 1);
    assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
    assert.equal(compareVersions('1.2', '1.2.0'), 0);
    assert.equal(compareVersions('', '1.0.0'), -1);
});

test('a stored marker that is not a plain version is discarded', () => {
    assert.equal(normalizeVersion(' 1.0.0 '), '1.0.0');
    for (const value of ['1.0.0-beta', 'latest', '', 7, null, undefined]) assert.equal(normalizeVersion(value), '', String(value));
});

test('releases are listed newest first with dates the dialog can read, and the manifest version has its notes', () => {
    const notes = getLatestReleaseNotes(50);
    const versions = notes.map(note => note.version);
    assert.deepEqual(
        [...versions].sort((a, b) => compareVersions(b, a)),
        versions
    );
    for (const note of notes) assert.match(note.date, /^\d{4}-\d{2}-\d{2}$/, note.version);
    assert.ok(typeof manifest === 'object' && manifest !== null && 'version' in manifest);
    assert.ok(versions.includes(String(manifest.version)));
});

test('an upgrade shows the releases since the marker and none newer than the running version', () => {
    assert.deepEqual(
        getReleaseNotesForUpdate('0.9.0', '1.0.0').map(note => note.version),
        ['1.0.0']
    );
    assert.deepEqual(getReleaseNotesForUpdate('0.9.0', '0.9.5'), []);
    assert.equal(shouldAutoDisplayReleaseNotesForUpdate('0.9.0', '1.0.0'), true);
    assert.equal(shouldAutoDisplayReleaseNotesForUpdate('1.0.0', '1.0.0'), false);
});

test('recording the shown release never replaces a newer marker that synced in meanwhile', async () => {
    let disk: Record<string, unknown> = { lastShownVersion: '0.9.0', showSlideImages: false };
    const settings = new SharedSettings({
        loadData: () => Promise.resolve(structuredClone(disk)),
        saveData: data => {
            disk = structuredClone(data as Record<string, unknown>);
            return Promise.resolve();
        }
    });
    await settings.ready;
    // Another device records 2.0.0, and this one closes its dialog before the reload has read it
    const reloading = settings.reload();
    disk = { ...disk, lastShownVersion: '2.0.0' };
    await Promise.all([reloading, settings.advanceLastShownVersion('1.0.0')]);
    assert.equal(disk.lastShownVersion, '2.0.0');
    assert.equal(disk.showSlideImages, false);
    await settings.advanceLastShownVersion('2.1.0');
    assert.equal(settings.lastShownVersion, '2.1.0');
});
