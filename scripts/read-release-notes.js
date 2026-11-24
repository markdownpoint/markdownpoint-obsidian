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

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const releaseNotesPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'release-notes.ts');

// A version's entry with its date right after the version, as every entry is written: version-bump.mjs replaces the
// date with the release day, and the release script refuses a bump whose entry it would not find
export function releaseDatePattern(version) {
    return new RegExp(`(version:\\s*['"]${version.replace(/\./g, '\\.')}['"],\\s*date:\\s*['"])[^'"]*(['"])`);
}

// The RELEASE_NOTES array of src/release-notes.ts, newest first. The array is a plain literal, so it
// evaluates as JavaScript without compiling the TypeScript around it
export function readReleaseNotes() {
    const content = readFileSync(releaseNotesPath, 'utf8');
    const releaseNotesMatch = content.match(/const\s+RELEASE_NOTES[\s\S]*?=\s*(\[[\s\S]*?\]);/);
    if (!releaseNotesMatch) throw new Error('Could not find RELEASE_NOTES in src/release-notes.ts');

    let releases;
    try {
        releases = vm.runInNewContext(`(${releaseNotesMatch[1]})`, {});
    } catch (error) {
        throw new Error(`Could not parse release notes: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!Array.isArray(releases) || releases.length === 0) throw new Error('No release notes found');
    return releases;
}

// Whether an entry holds anything to publish: the lead paragraph or a line in one of its lists
export function hasNotes(release) {
    const lists = [release.new, release.improved, release.changed, release.fixed];
    return (
        (typeof release.info === 'string' && release.info.trim() !== '') ||
        lists.some(items => Array.isArray(items) && items.some(item => typeof item === 'string' && item.trim() !== ''))
    );
}
