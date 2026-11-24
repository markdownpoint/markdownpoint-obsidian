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

import { readFileSync, writeFileSync } from 'fs';
import { releaseDatePattern, releaseNotesPath } from './scripts/read-release-notes.js';

const targetVersion = process.env.npm_package_version;

// Sync the manifest version with package.json
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

// Record which Obsidian version this plugin release requires
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
versions[targetVersion] = minAppVersion;
writeFileSync('versions.json', `${JSON.stringify(versions, null, 2)}\n`);

// The release day goes into the version's entry in the release notes, so whoever writes the notes never picks it. The
// release script refuses a bump whose entry has no date to replace; a bare npm version without an entry leaves the notes
const now = new Date();
const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(part => String(part).padStart(2, '0')).join('-');
const releaseNotes = readFileSync(releaseNotesPath, 'utf8');
writeFileSync(releaseNotesPath, releaseNotes.replace(releaseDatePattern(targetVersion), `$1${today}$2`));
