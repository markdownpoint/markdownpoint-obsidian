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

import { decodeCharacterReferences, markdownTokens } from '../readers/markdownpoint-readers.js';
import type { MarkdownToken } from '../readers/markdownpoint-readers.js';

/**
 * A span, `[words]{color=accent}`: words with a color, a weight or both, or a group with neither, `[words]{}`, which the
 * MarkdownPoint app writes for each run whose style changes inside a word, such as `[**Mark**]{}[***do***]{}[*wn*]{}`.
 * `wordsFrom` and `wordsTo` bound its words, inside its brackets. A link in a span's words, `[words](https://example.com)`,
 * reads as one too, with its destination as `href`: Obsidian takes the span's brackets for a link of their own and the
 * link for words. So does a link whose words hold a span, `[[*a*]{}b](slide:one)`: Obsidian's link ends at the first
 * `]`, the span's.
 */
export interface WordSpan {
    readonly from: number;
    readonly to: number;
    readonly wordsFrom: number;
    readonly wordsTo: number;
    readonly href?: string;
    /**
     * The marks of its own words, not of a span or a link inside them. Obsidian keeps every mark inside brackets it reads
     * as an unresolved link in view while it draws the style it reads, and inside brackets inside brackets it reads none.
     */
    readonly marks?: readonly SpanMark[];
}

/**
 * Emphasis, a highlight, a strikethrough or code in a span's words, as the MarkdownPoint app reads them: its delimiters
 * run from `from` to `wordsFrom` and from `wordsTo` to `to`, and `style` names the look they give the words between, by
 * Obsidian's class for it, `cm-em` for `*`.
 */
export interface SpanMark {
    readonly from: number;
    readonly to: number;
    readonly wordsFrom: number;
    readonly wordsTo: number;
    readonly style: SpanStyle;
}

export type SpanStyle = 'em' | 'strong' | 'highlight' | 'strikethrough' | 'inline-code';

/** The look of each token that marks words, by its type. */
const markStyles: Readonly<Record<string, SpanStyle>> = {
    em: 'em',
    strong: 'strong',
    mp_highlight: 'highlight',
    mp_strike: 'strikethrough',
    codespan: 'inline-code'
};

/** Code, HTML and a reference definition keep their characters as written; so does a block that holds one. */
function keepsSource(token: MarkdownToken): boolean {
    if (token.type === 'code' || token.type === 'html' || token.type === 'def') return true;
    if (token.type === 'blockquote') return (token.tokens ?? []).some(keepsSource);
    return token.type === 'list' && (token.items ?? []).some(item => (item.tokens ?? []).some(keepsSource));
}

const linesIn = (raw: string): number => raw.split('\n').length - 1;

/** Where a token's words stand in the field, by their offset in the words the token reads. */
type Place = (at: number) => number;

/** Words as the field writes them: a table cell's words write each pipe as `\|`, which GFM reads as `|`. */
type Spell = (words: string) => string;

const asWritten: Spell = words => words;
const cellWords: Spell = words => words.replaceAll('|', '\\|');

/**
 * Where the words `text` of a block whose lines are `raw`'s stand, from the field's line `line`: each line of `raw` ends
 * where its line of the source does, a quote's marks and an item's indent taken off its start, and each line of `text`
 * where its line of `raw` does, its indent taken off as the lexer may take it. A blank line of `text` where `raw` has
 * words is one the lexer added, and stands at the end of the line before. Null where a line isn't one of the source's
 * own.
 */
function linePlace(source: Field, line: number, raw: string, text = raw): Place | null {
    const lines = raw.split('\n');
    const bases: number[] = [];
    const columns: number[] = [];
    let base = 0;
    let index = 0;
    for (const words of text.split('\n')) {
        if (!words.trim() && lines[index]?.trim() && bases.length) {
            bases.push(base);
            columns.push(columns.at(-1)! + base - 1 - bases.at(-2)!);
        } else {
            const own = source.lines[line + index];
            const end = own?.trimEnd().length ?? -1;
            if (own === undefined || !own.slice(0, end).endsWith(words.trim())) return null;
            bases.push(base);
            columns.push(source.starts[line + index]! + end - words.trim().length - (words.length - words.trimStart().length));
            index++;
        }
        base += words.length + 1;
    }
    return index === lines.length
        ? at => {
              // The last line that starts at or before `at`.
              let low = 0;
              for (let high = bases.length - 1; low < high;) {
                  const middle = (low + high + 1) >> 1;
                  if (bases[middle]! <= at) low = middle;
                  else high = middle - 1;
              }
              return columns[low]! + at - bases[low]!;
          }
        : null;
}

/** A field's Markdown, by its lines and where each starts. */
interface Field {
    readonly text: string;
    readonly lines: readonly string[];
    readonly starts: readonly number[];
}

/** Whether `raw` stands from `from` to `to` in the field: its first line where it starts, its last where it ends. */
function placed(field: Field, raw: string, from: number, to: number): boolean {
    const lines = raw.split('\n');
    const last = lines.length > 1 ? lines.at(-1)!.trimStart() : lines[0]!;
    return from <= to && field.text.startsWith(lines[0]!, from) && field.text.slice(to - last.length, to) === last;
}

/** Where a token's own words start in its Markdown, or -1: after a span's or a link's `[`, a tag, or a delimiter run. */
function wordsStart(token: MarkdownToken): number {
    const text = token.text ?? '';
    const at =
        token.type === 'mp_baseline' ? token.raw.indexOf('>') + 1 : token.raw.startsWith('[') ? 1 : (token.raw.length - text.length) / 2;
    return Number.isInteger(at) && at > 0 && token.raw.startsWith(text, at) ? at : -1;
}

/** A span or a link found in a field, its marks gathered as its words are read. */
interface Found extends WordSpan {
    readonly marks: SpanMark[];
}

/** What a field's words hold: its spans, and the links in their words or whose words hold one. */
interface Reading {
    readonly field: Field;
    readonly spans: Found[];
    readonly links: Found[];
}

/**
 * Reads words whose tokens start at `start` in the words `place` places: their spans and links, inside one another too,
 * and the marks of each one's own words, in `owner`'s while they stand in no span or link of their own.
 */
function readWords(reading: Reading, tokens: readonly MarkdownToken[], start: number, place: Place, spell: Spell, owner?: Found): void {
    let at = start;
    for (const token of tokens) {
        const begin = at;
        at += token.raw.length;
        const from = place(begin);
        const to = place(at);
        if (!placed(reading.field, spell(token.raw), from, to)) continue;
        const text = token.text ?? '';
        const inner = wordsStart(token);
        const style = markStyles[token.type];
        if (token.type === 'mp_span' && inner > 0) {
            const span: Found = { from, to, wordsFrom: place(begin + 1), wordsTo: place(begin + 1 + text.length), marks: [] };
            reading.spans.push(span);
            readWords(reading, token.tokens ?? [], begin + 1, place, spell, span);
        } else if (token.type === 'link' && inner > 0) {
            // An inline link's words and destination on one line, where Live Preview can hide its marks: never a reference.
            const destination = token.raw.slice(1 + text.length);
            const link: Found | undefined =
                text && destination.startsWith('](') && !destination.includes('\n') && typeof token.href === 'string'
                    ? {
                          from,
                          to,
                          wordsFrom: place(begin + 1),
                          wordsTo: place(begin + 1 + text.length),
                          href: decodeCharacterReferences(token.href),
                          marks: []
                      }
                    : undefined;
            if (link) reading.links.push(link);
            readWords(reading, token.tokens ?? [], begin + 1, place, spell, link ?? owner);
        } else if (style === 'inline-code') {
            const run = /^`+/.exec(token.raw)?.[0].length ?? 0;
            if (owner && run) owner.marks.push({ from, to, wordsFrom: place(begin + run), wordsTo: place(at - run), style });
        } else if ((style || token.type === 'mp_baseline') && inner > 0) {
            if (owner && style)
                owner.marks.push({ from, to, wordsFrom: place(begin + inner), wordsTo: place(begin + inner + text.length), style });
            readWords(reading, token.tokens ?? [], begin + inner, place, spell, owner);
        }
    }
}

/**
 * Reads the words of a table's cells, each found in its row's line, where each pipe of its words is written `\|`: a row
 * stops at a cell its line doesn't spell so.
 */
function readTable(reading: Reading, table: MarkdownToken, line: number): void {
    const rows = [table.header ?? [], ...(table.rows ?? [])];
    for (const [index, cells] of rows.entries()) {
        const row = index ? line + index + 1 : line;
        const text = reading.field.lines[row] ?? '';
        let cursor = 0;
        for (const cell of cells) {
            const spelled = cellWords(cell.text);
            const at = text.indexOf(spelled, cursor);
            if (at < 0) break;
            cursor = at + spelled.length;
            // Where each place in the words is written, each pipe before it with its backslash.
            const places: number[] = [reading.field.starts[row]! + at];
            for (let char = 0; char < cell.text.length; char++) places.push(places[char]! + (cell.text[char] === '|' ? 2 : 1));
            readWords(reading, cell.tokens, 0, offset => places[offset]!, cellWords);
        }
    }
}

/**
 * Reads the blocks of words `tokens` hold from the field's line `line`: each heading's, paragraph's and list item's, in
 * quotes and lists too, and each table cell's.
 */
function readBlocks(reading: Reading, tokens: readonly MarkdownToken[], line: number): void {
    for (const token of tokens) {
        if (token.type === 'heading') {
            const raw = token.raw.replace(/\n+$/, '');
            // Its words follow its opening `#` run, or open its first line under a `===` or `---` underline.
            const words = raw.indexOf(token.text ?? '', /^ {0,3}#{1,6}(?=[ \t]|$)/.exec(raw)?.[0].length ?? 0);
            const place = words < 0 ? null : linePlace(reading.field, line, raw);
            if (place) readWords(reading, token.tokens ?? [], 0, at => place(words + at), asWritten);
        } else if (token.type === 'paragraph' || token.type === 'text') {
            // Its words as the lexer reads them: a line's indent may be taken off, as a quote's lazy line's is.
            const place = linePlace(reading.field, line, token.raw.replace(/\n+$/, ''), (token.text ?? '').replace(/\n+$/, ''));
            if (place) readWords(reading, token.tokens ?? [], 0, place, asWritten);
        } else if (token.type === 'blockquote') readBlocks(reading, token.tokens ?? [], line);
        else if (token.type === 'list') {
            let item = line;
            for (const each of token.items ?? []) {
                readBlocks(reading, each.tokens ?? [], item);
                item += linesIn(each.raw);
            }
        } else if (token.type === 'table') readTable(reading, token, line);
        line += linesIn(token.raw);
    }
}

/**
 * The spans in one field's Markdown, at offsets into it, as the MarkdownPoint app reads them: never in code, HTML, a
 * reference definition or a link's destination, and inside another span or a link's words too, with the links in a
 * span's words and those whose words hold a span. A block that holds a code block anywhere keeps all of its source in
 * view.
 */
export function fieldSpans(source: string): WordSpan[] {
    if (!source.includes(']{')) return [];
    const tokens = markdownTokens(source);
    if (tokens.map(token => token.raw).join('') !== source) return [];
    const lines = source.split('\n');
    const starts: number[] = [];
    for (let at = 0, index = 0; index < lines.length; at += lines[index++]!.length + 1) starts.push(at);
    const reading: Reading = { field: { text: source, lines, starts }, spans: [], links: [] };
    let line = 0;
    for (const token of tokens) {
        if (token.raw.includes(']{') && !keepsSource(token)) readBlocks(reading, [token], line);
        line += linesIn(token.raw);
    }
    const within = (inner: WordSpan, outer: WordSpan): boolean => outer.wordsFrom <= inner.from && inner.to <= outer.wordsTo;
    const spans: WordSpan[] = [
        ...reading.spans,
        ...reading.links.filter(link => reading.spans.some(span => within(link, span) || within(span, link)))
    ];
    return spans.map(({ marks, ...span }) => (marks?.length ? { ...span, marks } : span)).sort((a, b) => a.from - b.from);
}
