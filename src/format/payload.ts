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

import { blockTokens } from './block-grammar.ts';
import { lineEnd } from './document.ts';

/**
 * Source through the last line of a MarkdownPoint block that holds more than spaces, its line break included. Blank
 * lines only separate blocks, however many stand there, and an empty paragraph is written `<br>`, so the blank lines at a
 * block's end are organizational; but a code block the words leave open runs to the file's end, and its blank lines are
 * its code, all but the last, as MarkdownPoint reads them.
 */
export function payloadContentEnd(markdown: string, from: number, to: number): number {
    // Only a block that runs to the file's end can leave a code block open: one would take in the marker after it.
    const words = to === markdown.length ? markdown.slice(from) : '';
    // A line end is CRLF, a bare LF or a bare CR, and the LF of a CRLF starts no line of its own.
    if (leavesCodeOpen(words))
        return from + words.replace(/(^|[\r\n])[ \t]+$/, '$1').replace(/(^|\r\n|\n|\r(?!\n))[ \t]*(?:\r\n|\r|\n)$/, '$1').length;
    let end = to;
    while (end > from && ' \t\r\n'.includes(markdown[end - 1]!)) end--;
    if (end === from) return from;
    // The line break that ends the last line with words is its own; an unterminated tail of spaces is not.
    const ending = lineEnd(markdown, end);
    return !ending || ending.at >= to ? end : ending.next;
}

/** Close a block before its next neighbor without creating another authored blank line. */
export function terminateSourceBlock(source: string, newline: string): string {
    if (!source || /[\r\n]$/.test(source)) return source;
    // Fold an unterminated whitespace tail into the existing organizational line.
    const closed = source.replace(/(^|\r\n|\n|\r(?!\n))([ \t]*)(\r\n|\r|\n)([ \t]+)$/, '$1$2$4$3');
    return /[\r\n]$/.test(closed) ? closed : closed + newline;
}

const OPEN_CODE_PROBE = 'mp-open-code-probe';

/** Whether Markdown words leave a fenced code block open at their end, as the grammar that draws the slide reads them. */
function leavesCodeOpen(words: string): boolean {
    if (!words.includes('```') && !words.includes('~~~')) return false;
    const last = blockTokens(`${words.replace(/\r\n?/g, '\n')}\n${OPEN_CODE_PROBE}`)
        .filter(token => token.type !== 'space')
        .at(-1);
    return last?.type === 'code' && last.codeBlockStyle !== 'indented' && last.raw.replace(/\n+$/, '').endsWith(OPEN_CODE_PROBE);
}
