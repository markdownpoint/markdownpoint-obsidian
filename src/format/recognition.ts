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

import { formatStanding, opensFormatVersion } from './format-version.ts';
import { VERSION_ID, VERSIONS_FOLDER } from '../readers/markdownpoint-readers.js';

/**
 * Whether the file at `path` lies under a presentation's `versions/`, which MarkdownPoint never opens as a presentation of
 * its own, as the app refuses it: in a folder there named by a save time, or anywhere below it where the folder around
 * `versions/` holds a presentation file, as it does around a Finder or File Explorer copy of a version's folder.
 * `holdsPresentation` says whether the vault's folder at a path holds one; without it, only a save time's name counts.
 * `ignoresCase` says the vault's volume finds a name in another case, as a Mac's or a Windows disk does, so `Versions/`
 * there is the folder the app reads as `versions/`.
 */
export function inSavedVersions(path: string, holdsPresentation: (folder: string) => boolean = () => false, ignoresCase = false): boolean {
    const folders = path.split('/').slice(0, -1);
    return folders.some(
        (name, at) =>
            (name === VERSIONS_FOLDER || (ignoresCase && name.toLowerCase() === VERSIONS_FOLDER)) &&
            (VERSION_ID.test(folders[at + 1] ?? '') || holdsPresentation(folders.slice(0, at).join('/')))
    );
}

export function presentationCompanionPath(markdownPath: string): string | null {
    const slash = markdownPath.lastIndexOf('/');
    if (markdownPath.slice(slash + 1).toLowerCase() !== 'slides.md' || inSavedVersions(markdownPath)) return null;
    return markdownPath.slice(0, slash + 1) + 'presentation.mdpoint';
}

/** Candidate names include sync conflicts; unrelated notes and AppleDouble files are ignored. */
export function presentationMember(name: string): 'markdown' | 'companion' | null {
    const lower = name.toLowerCase();
    if (!name.startsWith('._') && name.length > 8 && lower.endsWith('.mdpoint')) return 'companion';
    return /^slides(?![a-z])/i.test(name) && lower.endsWith('.md') ? 'markdown' : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A record's own entry by a name the author chose, as a scheme's: a name may be one JavaScript gives every object, as
 * `__proto__` and `toString` are, which a record lacking it doesn't hold.
 */
export function ownEntry(record: Readonly<Record<string, unknown>>, name: string): unknown {
    return Object.hasOwn(record, name) ? record[name] : undefined;
}

export function isUuid(value: unknown): value is string {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

/** A stable id: a lowercase letter, then letters, digits and single hyphens, ending in a letter or a digit. */
const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function isStableId(value: unknown): value is string {
    return typeof value === 'string' && STABLE_ID.test(value);
}

/**
 * Recognizes the pair's identity only, not its layouts or full format conformance.
 * Both files must declare a format version the plugin opens and the same lowercase UUID as `id`;
 * a similarly named ordinary note or a mismatched companion stays ordinary Markdown.
 */
export function presentationIdentity(frontmatter: unknown, companion: unknown): string | null {
    if (!isRecord(frontmatter) || !isRecord(companion)) return null;
    if (!opensFormatVersion(frontmatter.markdownpoint) || !opensFormatVersion(companion.markdownpoint) || companion.type !== 'presentation')
        return null;
    const id = frontmatter.id;
    if (!isUuid(id)) return null;
    return companion.id === id ? id : null;
}

/**
 * The newer major a pair states when it is otherwise one presentation: the companion's kind and both files' `id` match,
 * and one file states a version the plugin doesn't open, so it reads as ordinary Markdown until the plugin is updated.
 * The app never renames these envelope keys, so a newer major is recognized through them.
 */
export function newerFormat(frontmatter: unknown, companion: unknown): string | null {
    if (!isRecord(frontmatter) || !isRecord(companion) || companion.type !== 'presentation') return null;
    if (!isUuid(frontmatter.id) || companion.id !== frontmatter.id) return null;
    const versions = [companion.markdownpoint, frontmatter.markdownpoint];
    if (versions.some(version => formatStanding(version) === 'invalid')) return null;
    const newer = versions.find(version => formatStanding(version) === 'newer');
    return typeof newer === 'string' ? newer : null;
}
