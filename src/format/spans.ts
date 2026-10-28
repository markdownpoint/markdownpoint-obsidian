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

import type { Token } from 'marked';
import { blockTokens } from './block-grammar.ts';
import { destinationEnd, literalEnd, presentationSpan, wordTokens } from './link-tokens.ts';

/**
 * A span, `[words]{color=accent}`: words with a color, a weight or both, or a group with neither, `[words]{}`, which the
 * MarkdownPoint app writes for each run whose style changes inside a word, such as `[**Mark**]{}[***do***]{}[*wn*]{}`.
 * `wordsFrom` and `wordsTo` bound what an author reads: the words without the brackets, the attributes and the emphasis
 * delimiters that enclose all of the span's words.
 */
export interface WordSpan {
    readonly from: number;
    readonly to: number;
    readonly wordsFrom: number;
    readonly wordsTo: number;
}

/** Code, HTML and a reference definition keep their characters as written; so does a block that holds one. */
function keepsSource(token: Token): boolean {
    if (token.type === 'code' || token.type === 'html' || token.type === 'def') return true;
    const children: Token[] = [];
    if ('tokens' in token && Array.isArray(token.tokens)) children.push(...token.tokens);
    if ('items' in token && Array.isArray(token.items)) children.push(...(token.items as Token[]));
    return children.some(keepsSource);
}

/** How many of `lead`'s delimiters pair around all of `content`'s words, as the lexer pairs them: all, or none. */
function enclosingWidth(content: string, lead: string): number {
    let words = content;
    let width = 0;
    while (width < lead.length) {
        const tokens = wordTokens(words);
        const token = tokens.length === 1 ? tokens[0]! : null;
        if (!token || token.raw !== words || (token.type !== 'em' && token.type !== 'strong') || typeof token.text !== 'string') return 0;
        const delimiter = (words.length - token.text.length) / 2;
        if (!(delimiter >= 1) || words.slice(delimiter, words.length - delimiter) !== token.text) return 0;
        width += delimiter;
        words = token.text;
    }
    return width === lead.length && words.length > 0 ? width : 0;
}

function spanAt(source: string, at: number): WordSpan | null {
    const span = presentationSpan(source.slice(at));
    if (!span) return null;
    const content = span.content;
    // Delimiters that enclose the words read as their style; any other run stays where the author can see it.
    const inner = enclosingWidth(content, /^(?:==|~~|[*_])*/.exec(content)![0]);
    return { from: at, to: at + span.length, wordsFrom: at + 1 + inner, wordsTo: at + 1 + content.length - inner };
}

/**
 * The spans in one field's Markdown, at offsets into it, as the MarkdownPoint app reads them: never in code, HTML, a
 * reference definition or a link's destination, and inside another span or a link's words too. A block that holds code
 * anywhere keeps all of its source in view.
 */
export function fieldSpans(source: string): WordSpan[] {
    if (!source.includes(']{')) return [];
    const tokens = blockTokens(source);
    if (tokens.map(token => token.raw).join('') !== source) return [];
    const spans: WordSpan[] = [];
    let from = 0;
    for (const token of tokens) {
        const to = from + token.raw.length;
        // Offsets stay the field's, and nothing reads past the block's end.
        const block = source.slice(0, to);
        if (token.raw.includes(']{') && !keepsSource(token))
            for (let at = from; at < to;) {
                const end = literalEnd(block, at);
                if (end > at) {
                    at = end;
                    continue;
                }
                if (block.startsWith('](', at)) {
                    at = Math.max(at + 1, destinationEnd(block, at + 1));
                    continue;
                }
                const span = block[at] === '[' ? spanAt(block, at) : null;
                if (span) spans.push(span);
                at++;
            }
        from = to;
    }
    return spans;
}
