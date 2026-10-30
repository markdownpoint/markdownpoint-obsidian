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

/**
 * Source through the last line of a MarkdownPoint block that holds more than spaces, its line break included. Blank
 * lines only separate blocks, however many stand there, and an empty paragraph is written `<br>`, so the blank lines at a
 * block's end are all organizational.
 */
export function payloadContentEnd(markdown: string, from: number, to: number): number {
    let end = to;
    while (end > from && ' \t\r\n'.includes(markdown[end - 1]!)) end--;
    if (end === from) return from;
    // The line break that ends the last line with words is its own; an unterminated tail of spaces is not.
    const feed = markdown.indexOf('\n', end);
    return feed < 0 || feed >= to ? end : feed + 1;
}

/** Close a block before its next neighbor without creating another authored blank line. */
export function terminateSourceBlock(source: string, newline: string): string {
    if (!source || source.endsWith('\n')) return source;
    // Fold an unterminated whitespace tail into the existing organizational line.
    const closed = source.replace(/(^|\n)([ \t]*)(\r?\n)([ \t]+)$/, '$1$2$4$3');
    return closed.endsWith('\n') ? closed : closed + newline;
}
