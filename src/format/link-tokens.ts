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

import { Lexer, Marked, Tokenizer } from 'marked';
import type { Token } from 'marked';

interface EmphasisMask {
    from: number;
    shown: string;
    mask: string;
    stars: string;
}
const emphasisMasks = new WeakMap<Lexer, Map<string, EmphasisMask>>();

/** MDP lets stars separate punctuation from adjacent words, including CJK. */
function relaxedStars(source: string): string {
    return source.replace(/(?!\*)[\p{P}\p{S}](?=\*+[^\s\p{P}\p{S}])|(?<=[^\s\p{P}\p{S}]\*+)(?!\*)[\p{P}\p{S}]/gu, char =>
        'a'.repeat(char.length)
    );
}

/** Advance over Markdown that keeps delimiter characters literal. */
function literalEnd(source: string, at: number): number {
    const char = source[at];
    if (char === '\\') return Math.min(source.length, at + 2);
    if (char !== '`' && char !== '<') return at;
    const lexer = new Lexer({ gfm: true, tokenizer: new Tokenizer() });
    const tokenizer = lexer.options.tokenizer!;
    const rest = source.slice(at);
    const token = char === '`' ? tokenizer.codespan(rest) : (tokenizer.autolink(rest) ?? tokenizer.tag(rest));
    if (!token && char === '`') return at + /^`+/.exec(rest)![0].length;
    return token ? at + token.raw.length : at;
}

/** Balanced parentheses, with quoted titles, angle destinations and escapes opaque. */
function destinationEnd(source: string, opening: number): number {
    const rest = source.slice(opening);
    const pieces = /\\[\s\S]|(?<=^\(\s*)<[^>]*>|(?<=\s)"(?:\\[\s\S]|[^"\\])*"|(?<=\s)'(?:\\[\s\S]|[^'\\])*'|[()]/g;
    let depth = 0;
    for (const piece of rest.matchAll(pieces)) {
        if (piece[0] === '(') depth++;
        else if (piece[0] === ')' && --depth === 0) return opening + piece.index + 1;
    }
    return opening;
}

function closingBracket(source: string, opening: number, nestedDestinations = false): number {
    let depth = 1;
    for (let at = opening + 1; at < source.length;) {
        const end = literalEnd(source, at);
        if (end > at) {
            at = end;
            continue;
        }
        if (source[at] === '[') depth++;
        if (source[at] === ']') {
            if (--depth === 0) return at;
            if (nestedDestinations && source[at + 1] === '(') {
                at = destinationEnd(source, at + 1);
                continue;
            }
        }
        at++;
    }
    return -1;
}

/** A malformed destination does not shield delimiters in its apparent label. */
function protectedEnd(source: string, at: number): number {
    const literal = literalEnd(source, at);
    if (literal > at) return literal;
    const opening = source.startsWith('![', at) ? at + 1 : source[at] === '[' ? at : -1;
    if (opening < 0) return at;
    const closing = closingBracket(source, opening);
    if (closing < 0) return at;
    if (source[closing + 1] === '(') {
        const end = destinationEnd(source, closing + 1);
        return end > closing + 1 ? end : at;
    }
    const reference = /^\[(?:\\[\s\S]|[^\]\\])*\]/.exec(source.slice(closing + 1));
    return closing + 1 + (reference?.[0].length ?? 0);
}

function delimitedSpan(source: string): { length: number; content: string } | null {
    const delimiter = source.slice(0, 2);
    if ((delimiter !== '==' && delimiter !== '~~') || !/\S/.test(source[2] ?? '')) return null;
    for (let at = 2; at < source.length;) {
        if (at > 2 && source.startsWith(delimiter, at) && /\S/.test(source[at - 1]!))
            return { length: at + 2, content: source.slice(2, at) };
        const end = protectedEnd(source, at);
        at = end > at ? end : at + 1;
    }
    return null;
}

function colorSpan(source: string): { length: number; content: string } | null {
    if (!source.startsWith('[')) return null;
    const close = closingBracket(source, 0, true);
    if (close <= 1) return null;
    const attribute = /^\{color=(?:"([^"]*)"|([^\s"{}]+))\}/.exec(source.slice(close + 1));
    const value = attribute?.[1] ?? attribute?.[2];
    if (!attribute || value === undefined) return null;
    const role = /^[a-z][a-z0-9-]*$/.test(value);
    const hex = /^#[a-f\d]+$/i.test(value) && [4, 5, 7, 9].includes(value.length);
    return role || hex ? { length: close + 1 + attribute[0].length, content: source.slice(1, close) } : null;
}

/** An enclosing emphasis delimiter cannot close inside another formatting span. */
function maskFormatting(source: string, masked: string): EmphasisMask {
    const offset = masked.length - source.length,
        pieces: string[] = [],
        shown: string[] = [];
    let from = 0;
    for (let at = 0; at < source.length;) {
        const end = literalEnd(source, at);
        if (end > at) {
            at = end;
            continue;
        }
        const span = delimitedSpan(source.slice(at)) ?? colorSpan(source.slice(at));
        if (span) {
            pieces.push(masked.slice(offset + from, offset + at), 'a'.repeat(span.length));
            shown.push(source.slice(from, at), 'a'.repeat(span.length));
            at += span.length;
            from = at;
        } else at++;
    }
    const mask = pieces.length ? masked.slice(0, offset) + pieces.join('') + masked.slice(offset + from) : masked;
    return { from: offset, shown: shown.length ? shown.join('') + source.slice(from) : source, mask, stars: relaxedStars(mask) };
}

/** MDP's extra inline formatting only contributes a container for its words. */
const grammar = new Marked({
    gfm: true,
    tokenizer: {
        html: source => (/^<br[ \t]*\/?>/i.test(source) ? undefined : false),
        del: () => undefined,
        emStrong(source, masked, previous = '') {
            if (source[0] !== '*' && source[0] !== '_') return false;
            // Each lexer owns one field. Reuse its paragraph mask across emphasis starts.
            const cache = emphasisMasks.get(this.lexer) ?? new Map<string, EmphasisMask>();
            emphasisMasks.set(this.lexer, cache);
            const from = masked.length - source.length;
            const saved = cache.get(masked);
            const prepared = saved && saved.from <= from ? saved : maskFormatting(source, masked);
            if (prepared !== saved) cache.set(masked, prepared);
            let shown = prepared.shown.slice(from - prepared.from),
                mask = prepared.mask;
            if (source[0] === '*') {
                // Only the opening neighbor is read from source; closing runs use the mask.
                const opening = /^\*+[^*]?/u.exec(shown)![0];
                const prefix = relaxedStars(previous + opening);
                shown = prefix.slice(previous.length) + shown.slice(opening.length);
                previous = prefix.slice(0, previous.length);
                mask = prepared.stars;
            }
            const token = Tokenizer.prototype.emStrong.call(this, shown, mask, previous);
            if (!token || shown === source) return token;
            const raw = source.slice(0, token.raw.length),
                width = token.type === 'strong' ? 2 : 1;
            const text = raw.slice(width, -width);
            return { ...token, raw, text, tokens: this.lexer.inlineTokens(text) };
        }
    },
    extensions: [
        {
            name: 'presentation-format',
            level: 'inline',
            start: source => {
                const found = /==|~~|\[/.exec(source);
                return found?.index;
            },
            tokenizer(source) {
                const span = delimitedSpan(source) ?? colorSpan(source);
                if (!span) return undefined;
                return {
                    type: 'strong',
                    raw: source.slice(0, span.length),
                    text: span.content,
                    tokens: this.lexer.inlineTokens(span.content)
                };
            }
        }
    ]
});

/** Tokens for finding navigation links, never for rendering or serializing words. */
export function linkTokens(source: string): Token[] {
    return grammar.lexer(source);
}
