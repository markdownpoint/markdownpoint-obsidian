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

export function presentationCompanionPath(markdownPath: string): string | null {
    const slash = markdownPath.lastIndexOf('/');
    if (markdownPath.slice(slash + 1).toLowerCase() !== 'slides.md') return null;
    return markdownPath.slice(0, slash + 1) + 'presentation.mdpoint';
}

/** Candidate names include sync conflicts; unrelated notes and AppleDouble files are ignored. */
export function presentationMember(name: string): 'markdown' | 'companion' | null {
    const lower = name.toLowerCase();
    if (!name.startsWith('._') && name.length > 8 && lower.endsWith('.mdpoint')) return 'companion';
    return /^slides(?![a-z])/i.test(name) && lower.endsWith('.md') ? 'markdown' : null;
}

/** Discover one unambiguous fixed pair, preserving the spelling stored by the vault. */
export function presentationPairNames(names: readonly string[]): { markdown: string; companion: string } | null {
    const markdown = names.filter(name => presentationMember(name) === 'markdown');
    const companion = names.filter(name => presentationMember(name) === 'companion');
    if (
        markdown.length !== 1 ||
        companion.length !== 1 ||
        markdown[0]!.toLowerCase() !== 'slides.md' ||
        companion[0]!.toLowerCase() !== 'presentation.mdpoint'
    )
        return null;
    return { markdown: markdown[0]!, companion: companion[0]! };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDocumentId(value: unknown): value is string {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

export function isStableId(value: unknown): value is string {
    return typeof value === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Recognizes the pair's identity only, not its layouts or full format conformance.
 * Both files must declare a format version the plugin opens and the same lowercase UUID as `id`;
 * a similarly named ordinary note or a mismatched companion stays ordinary Markdown.
 */
export function presentationIdentity(frontmatter: unknown, companion: unknown): string | null {
    if (!isRecord(frontmatter) || !isRecord(companion)) return null;
    if (!opensFormatVersion(frontmatter.markdownpoint) || !opensFormatVersion(companion.markdownpoint) || companion.kind !== 'presentation')
        return null;
    const id = frontmatter.id;
    if (!isDocumentId(id)) return null;
    return companion.id === id ? id : null;
}

/**
 * The newer major a pair states when it is otherwise one presentation: the companion's kind and both files' `id` match,
 * and one file states a version the plugin doesn't open, so it reads as ordinary Markdown until the plugin is updated.
 * The app never renames these envelope keys, so a newer major is recognized through them.
 */
export function newerFormat(frontmatter: unknown, companion: unknown): string | null {
    if (!isRecord(frontmatter) || !isRecord(companion) || companion.kind !== 'presentation') return null;
    if (!isDocumentId(frontmatter.id) || companion.id !== frontmatter.id) return null;
    const versions = [companion.markdownpoint, frontmatter.markdownpoint];
    if (versions.some(version => formatStanding(version) === 'invalid')) return null;
    const newer = versions.find(version => formatStanding(version) === 'newer');
    return typeof newer === 'string' ? newer : null;
}
