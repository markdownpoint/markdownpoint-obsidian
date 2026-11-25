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

import { Lexer, Tokenizer } from 'marked';
import { decodeCharacterReferences, tokenPlainWords } from '../core/character-references.ts';
import { markdownTokens, markdownWordTokens } from '../readers/markdownpoint-readers.js';
import type { MarkdownToken } from '../readers/markdownpoint-readers.js';
import { isRecord } from './recognition.ts';

/** Advance over Markdown that keeps delimiter characters literal. */
export function literalEnd(source: string, at: number): number {
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
export function destinationEnd(source: string, opening: number): number {
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

/** A span's attribute, `key=value`, its value bare or in double or single quotes, on one line, as the app reads it. */
const spanPair = String.raw`[a-z][a-z0-9-]*=(?:"[^"\n]*"|'[^'\n]*'|[^\s"'{}]+)`;
/** Spaces and tabs with at most one line break among them, as Pandoc's reader skips them inside an attribute block. */
const spanSpace = String.raw`[ \t]*(?:\n[ \t]*)?`;
// The space after the pairs is matched only after a pair, so no run of space can be split two ways.
const spanAttributes = new RegExp(String.raw`^\{${spanSpace}(?:(${spanPair}(?:(?=[ \t\n])${spanSpace}${spanPair})*)${spanSpace})?\}`);
/**
 * The length of the attributes a span's closing bracket carries at the start of `source`: `key=value` pairs, such as a
 * color, a weight, an upright slant or several, `{color=muted font-weight=600 font-style=normal}`, or none, `{}`. A value may be bare or in single or double
 * quotes, and spaces, tabs and one line break may stand inside the braces and between the attributes, as Pandoc reads
 * them. A key or a value the app doesn't take leaves the span a span: the app skips it and applies the rest. 0 where no
 * attribute block reads.
 */
export function spanAttributesLength(source: string): number {
    return spanAttributes.exec(source)?.[0].length ?? 0;
}

/**
 * A bracketed span as the MarkdownPoint app reads one: words with a color, a weight, an upright slant or several,
 * `[words]{color=muted font-weight=600}`, or a group with none, `[words]{}`. An attribute the app doesn't take leaves it a span.
 */
export function presentationSpan(source: string): { length: number; content: string } | null {
    if (!source.startsWith('[')) return null;
    const close = closingBracket(source, 0, true);
    if (close <= 1) return null;
    const attributes = spanAttributesLength(source.slice(close + 1));
    return attributes ? { length: close + 1 + attributes, content: source.slice(1, close) } : null;
}

/**
 * Markdown's blocks and their words as the MarkdownPoint app reads them, for finding navigation links and reading words
 * as labels, never for rendering or serializing words.
 */
export function linkTokens(source: string): MarkdownToken[] {
    return markdownTokens(source);
}

/** Words alone as the MarkdownPoint app reads them, as `linkTokens` reads a block's. */
export function wordTokens(source: string): MarkdownToken[] {
    return markdownWordTokens(source);
}

/** Whether tokens hold HTML at any depth: a comment, a paragraph id's included, or a tag, a line break's `<br>` among them. */
export function holdsHtml(tokens: readonly unknown[]): boolean {
    return tokens.some(
        token =>
            isRecord(token) &&
            (token.type === 'html' || token.type === 'mp_line_break' || (Array.isArray(token.tokens) && holdsHtml(token.tokens)))
    );
}

/** Whether a token is one marked gives, which may be plain words. */
const wordsToken = (token: unknown): token is Parameters<typeof tokenPlainWords>[0] =>
    isRecord(token) && typeof token.type === 'string' && typeof token.raw === 'string';

/** A token's words as written and the Markdown that writes them, where it is plain words (`tokenPlainWords`). */
function plainToken(token: unknown): { words: string; raw: string } | undefined {
    if (!wordsToken(token)) return undefined;
    const words = tokenPlainWords(token);
    return words === undefined ? undefined : { words, raw: token.raw };
}

/**
 * A run of plain words: its words, each character reference read over the run as a whole, as MarkdownPoint reads them,
 * and the Markdown that writes them; and its pieces, each token's words and Markdown, but for two tokens a reference
 * spans, as one at a bare address's end does, whose token ends before its `;`, which stand as one piece.
 */
interface WordsRun {
    words: string;
    raw: string;
    pieces: { words: string; raw: string }[];
}

/** Tokens in reading order, each run of plain words joined as one (`WordsRun`), and any other token as it is. */
function tokenRuns(tokens: readonly unknown[]): (WordsRun | { token: unknown })[] {
    const parts: (WordsRun | { token: unknown })[] = [];
    let pieces: { words: string; raw: string }[] = [];
    const close = (): void => {
        if (!pieces.length) return;
        parts.push({
            words: decodeCharacterReferences(pieces.map(piece => piece.words).join('')),
            raw: pieces.map(piece => piece.raw).join(''),
            pieces: pieces.map(piece => ({ words: decodeCharacterReferences(piece.words), raw: piece.raw }))
        });
        pieces = [];
    };
    for (const token of tokens) {
        const plain = plainToken(token);
        if (!plain) {
            close();
            parts.push({ token });
            continue;
        }
        const last = pieces.at(-1);
        const spanned =
            last !== undefined &&
            decodeCharacterReferences(last.words + plain.words) !==
                decodeCharacterReferences(last.words) + decodeCharacterReferences(plain.words);
        if (last && spanned) {
            last.words += plain.words;
            last.raw += plain.raw;
        } else pieces.push(plain);
    }
    close();
    return parts;
}

/** The words tokens read as, without their marks: a list's items and a table's cells included. */
export function inlineText(tokens: readonly unknown[]): string {
    return tokenRuns(tokens)
        .map(part => ('words' in part ? part.words : tokenText(part.token)))
        .join('');
}

/** The words of a token that isn't plain words, without its marks. */
function tokenText(token: unknown): string {
    if (!isRecord(token)) return '';
    if (token.type === 'html' || token.type === 'def') return '';
    if (token.type === 'br' || token.type === 'mp_line_break') return '\n';
    // A field, `{{slide-number}}`, reads as written: a label has no slide to number.
    if (token.type === 'mp_field') return typeof token.raw === 'string' ? token.raw : '';
    const children: unknown = token.tokens ?? token.items;
    if (Array.isArray(children)) return inlineText(children);
    const header: unknown = token.header;
    const rows: unknown = token.rows;
    if (Array.isArray(header) && Array.isArray(rows)) return inlineText(header) + inlineText(rows.flat() as unknown[]);
    return typeof token.text === 'string' ? token.text : '';
}

/** The words of a block of Markdown, as a reader reads them, without their marks. */
export function markdownWords(source: string): string {
    return inlineText(linkTokens(source));
}
