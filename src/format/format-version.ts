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

// The format version the plugin writes and reads in full, as the MarkdownPoint app's format-version.ts states it.
// Change it here when the format moves, in the release that writes the new version.
const FORMAT_MAJOR = 1;
const FORMAT_MINOR = 0;

/** The version every file states as `markdownpoint`: a major and a minor, always a string, since 1.10 and 1.1 are one number. */
export const FORMAT_VERSION = `${FORMAT_MAJOR}.${FORMAT_MINOR}`;

/** A stated version's major and minor: whole numbers without leading zeros, as the MarkdownPoint app reads them. */
function versionParts(value: unknown): { major: number; minor: number } | null {
    const parts = typeof value === 'string' ? /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/.exec(value) : null;
    return parts ? { major: Number(parts[1]), minor: Number(parts[2]) } : null;
}

/**
 * How a stated version stands to the plugin, ranked as the MarkdownPoint app ranks it: one it reads fully, its own
 * minor or an earlier one; a newer minor of its major, which only adds what an earlier reader passes over; a newer
 * major, which needs a newer plugin; or no version.
 */
export function formatStanding(value: unknown): 'readable' | 'newer-minor' | 'newer' | 'invalid' {
    const parts = versionParts(value);
    if (!parts || parts.major < FORMAT_MAJOR) return 'invalid';
    if (parts.major > FORMAT_MAJOR) return 'newer';
    return parts.minor > FORMAT_MINOR ? 'newer-minor' : 'readable';
}

/** Whether a stated format version opens: any minor of the plugin's major. */
export function opensFormatVersion(value: unknown): boolean {
    const standing = formatStanding(value);
    return standing === 'readable' || standing === 'newer-minor';
}

/**
 * Whether the plugin knows every key of a stated version. A newer minor may hold keys an older file must not receive,
 * so slides are only copied out of a presentation the plugin reads fully.
 */
export function readsFormatFully(value: unknown): boolean {
    return formatStanding(value) === 'readable';
}

/**
 * The version a .md file's frontmatter states, read from the file's own text as MarkdownPoint reads it ahead of the file,
 * since a newer minor's file reads otherwise: the `markdownpoint` line of the frontmatter that opens the file, its value
 * quoted. Unquoted, it is a number to YAML, which states no version.
 */
export function statedMarkdownVersion(markdown: string): string | undefined {
    const opening = /^\uFEFF?---(?:\r\n|\r|\n)/.exec(markdown);
    if (!opening) return undefined;
    const line = /[^\r\n]*/y;
    for (let at = opening[0].length; at < markdown.length;) {
        line.lastIndex = at;
        const text = line.exec(markdown)![0];
        if (/^---[ \t]*$/.test(text)) return undefined;
        if (text.startsWith('markdownpoint:')) {
            const value = text.slice('markdownpoint:'.length);
            return /^\s*["']/.test(value) ? quotedScalar(value) : undefined;
        }
        at += text.length + (markdown.startsWith('\r\n', at + text.length) ? 2 : 1);
    }
    return undefined;
}

/**
 * A quoted one-line YAML value as MarkdownPoint reads one, a comment after it or not: in double quotes, with YAML's
 * escapes, of which only those that name a character by number can spell a version, or in single quotes, where two make
 * one. Undefined for a quote the line doesn't close.
 */
function quotedScalar(raw: string): string | undefined {
    const text = raw.trim();
    const double = /^"((?:[^"\\]|\\.)*)"(?:\s+#.*)?$/.exec(text);
    if (double)
        return double[1]!.replace(/\\(?:(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})|.)/g, (_, numbered?: string) => {
            const point = numbered === undefined ? Infinity : Number.parseInt(numbered.slice(1), 16);
            // Any other escape names a character no version holds
            return point <= 0x10ffff ? String.fromCodePoint(point) : '\\';
        });
    return /^'((?:[^']|'')*)'(?:\s+#.*)?$/.exec(text)?.[1]!.replace(/''/g, "'");
}
