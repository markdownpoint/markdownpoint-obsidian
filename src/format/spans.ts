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
import { decodeCharacterReferences } from '../core/character-references.ts';
import { destinationEnd, literalEnd, presentationSpan, wordTokens } from './link-tokens.ts';

/**
 * A span, `[words]{color=accent}`: words with a color, a weight or both, or a group with neither, `[words]{}`, which the
 * MarkdownPoint app writes for each run whose style changes inside a word, such as `[**Mark**]{}[***do***]{}[*wn*]{}`.
 * `wordsFrom` and `wordsTo` bound what an author reads: the words without the brackets, the attributes and the emphasis
 * delimiters that enclose all of the span's words. A link in a span's words, `[words](https://example.com)`, reads as one
 * too, with its destination as `href`: Obsidian takes the span's brackets for a link of their own and the link for words.
 * So does a link whose words hold a span, `[[*a*]{}b](slide:one)`: Obsidian's link ends at the first `]`, the span's.
 */
export interface WordSpan {
    readonly from: number;
    readonly to: number;
    readonly wordsFrom: number;
    readonly wordsTo: number;
    readonly href?: string;
    /**
     * The backtick runs of each code span in its own words, not in a span inside them. Obsidian keeps every mark inside
     * brackets it reads as an unresolved link in view, a code span's backticks among them, while it styles the code.
     */
    readonly code?: readonly { readonly from: number; readonly to: number }[];
    /**
     * The styles the delimiters it hides draw, outermost first. Obsidian reads no emphasis and no code inside brackets
     * inside brackets, so for a span in another span or a link the plugin draws them.
     */
    readonly styles?: readonly SpanStyle[];
}

/** A style an enclosing delimiter draws, by the name of Obsidian's class for it, `cm-em` for `*`. */
export type SpanStyle = 'em' | 'strong' | 'highlight' | 'strikethrough';

const delimiterStyles: Readonly<Record<string, SpanStyle>> = {
    '*': 'em',
    _: 'em',
    '**': 'strong',
    __: 'strong',
    '==': 'highlight',
    '~~': 'strikethrough'
};

/** Code, HTML and a reference definition keep their characters as written; so does a block that holds one. */
function keepsSource(token: Token): boolean {
    if (token.type === 'code' || token.type === 'html' || token.type === 'def') return true;
    const children: Token[] = [];
    if ('tokens' in token && Array.isArray(token.tokens)) children.push(...token.tokens);
    if ('items' in token && Array.isArray(token.items)) children.push(...(token.items as Token[]));
    return children.some(keepsSource);
}

/**
 * How many of `lead`'s delimiters pair around all of `content`'s words, as the lexer pairs them, all or none, and the
 * style each pair draws. The lexer reads `==` and `~~` as containers, so their characters name their style.
 */
function enclosing(content: string, lead: string): { width: number; styles: SpanStyle[] } {
    const none = { width: 0, styles: [] };
    let words = content;
    let width = 0;
    const styles: SpanStyle[] = [];
    while (width < lead.length) {
        const tokens = wordTokens(words);
        const token = tokens.length === 1 ? tokens[0]! : null;
        if (!token || token.raw !== words || (token.type !== 'em' && token.type !== 'strong') || typeof token.text !== 'string')
            return none;
        const delimiter = (words.length - token.text.length) / 2;
        if (!(delimiter >= 1) || words.slice(delimiter, words.length - delimiter) !== token.text) return none;
        styles.push(delimiterStyles[words.slice(0, delimiter)]!);
        width += delimiter;
        words = token.text;
    }
    return width === lead.length && words.length > 0 ? { width, styles } : none;
}

function spanAt(source: string, at: number): WordSpan | null {
    const span = presentationSpan(source.slice(at));
    if (!span) return null;
    const content = span.content;
    // Delimiters that enclose the words read as their style; any other run stays where the author can see it.
    const { width, styles } = enclosing(content, /^(?:==|~~|[*_])*/.exec(content)![0]);
    return {
        from: at,
        to: at + span.length,
        wordsFrom: at + 1 + width,
        wordsTo: at + 1 + content.length - width,
        ...(styles.length ? { styles } : {})
    };
}

/**
 * The link whose words run from `from` to `close` and whose destination ends at `to`, as the lexer reads one. An image,
 * after a `!` no backslash escapes, is none, and a link without words or with a destination past its line keeps its
 * source: Live Preview can't hide marks across a line, and there would be no words to show.
 */
function linkAt(source: string, from: number, close: number, to: number): WordSpan | null {
    let escapes = 0;
    while (source[from - 2 - escapes] === '\\') escapes++;
    const image = source[from - 1] === '!' && escapes % 2 === 0;
    if (image || close === from + 1 || source.slice(close, to).includes('\n')) return null;
    const tokens = wordTokens(source.slice(from, to));
    const link = tokens.length === 1 ? tokens[0]! : null;
    if (link?.type !== 'link' || link.raw.length !== to - from || typeof link.href !== 'string') return null;
    // Marked already removed punctuation escapes while reading the href.
    return { from, to, wordsFrom: from + 1, wordsTo: close, href: decodeCharacterReferences(link.href) };
}

/**
 * The spans in one field's Markdown, at offsets into it, as the MarkdownPoint app reads them: never in code, HTML, a
 * reference definition or a link's destination, and inside another span or a link's words too, with the links in a
 * span's words and those whose words hold a span. A block that holds a code block anywhere keeps all of its source in
 * view.
 */
export function fieldSpans(source: string): WordSpan[] {
    if (!source.includes(']{')) return [];
    const tokens = blockTokens(source);
    if (tokens.map(token => token.raw).join('') !== source) return [];
    const spans: WordSpan[] = [];
    const links: WordSpan[] = [];
    const codes: { from: number; to: number; run: number }[] = [];
    let from = 0;
    for (const token of tokens) {
        const to = from + token.raw.length;
        // Offsets stay the field's, and nothing reads past the block's end.
        const block = source.slice(0, to);
        const opened: number[] = [];
        if (token.raw.includes(']{') && !keepsSource(token))
            for (let at = from; at < to;) {
                const end = literalEnd(block, at);
                if (end > at) {
                    // A run of backticks no run of its length closes is no code span.
                    const run = block[at] === '`' ? /^`+/.exec(block.slice(at))![0].length : 0;
                    if (run && end - at > run) codes.push({ from: at, to: end, run });
                    at = end;
                    continue;
                }
                if (block.startsWith('](', at)) {
                    const label = opened.pop();
                    const destination = destinationEnd(block, at + 1);
                    const link = label !== undefined && destination > at + 1 ? linkAt(block, label, at, destination) : null;
                    if (link) links.push(link);
                    at = Math.max(at + 1, destination);
                    continue;
                }
                if (block[at] === '[') {
                    opened.push(at);
                    const span = spanAt(block, at);
                    if (span) spans.push(span);
                } else if (block[at] === ']') opened.pop();
                at++;
            }
        from = to;
    }
    const within = (inner: WordSpan, outer: WordSpan): boolean => outer.wordsFrom <= inner.from && inner.to <= outer.wordsTo;
    for (const link of links) if (spans.some(span => within(link, span) || within(span, link))) spans.push(link);
    // Each code span's runs go with the innermost span whose words hold it, which starts its words last.
    const runs = new Map<WordSpan, { from: number; to: number }[]>();
    for (const code of codes) {
        let holder: WordSpan | undefined;
        for (const span of spans)
            if (span.wordsFrom <= code.from && code.to <= span.wordsTo && (!holder || span.wordsFrom > holder.wordsFrom)) holder = span;
        if (!holder) continue;
        if (!runs.has(holder)) runs.set(holder, []);
        runs.get(holder)!.push({ from: code.from, to: code.from + code.run }, { from: code.to - code.run, to: code.to });
    }
    return spans.map(span => (runs.has(span) ? { ...span, code: runs.get(span)! } : span)).sort((a, b) => a.from - b.from);
}
