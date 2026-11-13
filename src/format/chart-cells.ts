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

import { chartNumberRule, respellChartNumber, sameRule } from '../core/chart-numbers.ts';
import type { ChartNumberRule } from '../core/chart-numbers.ts';
import type { CapturedPart, CapturedSlides } from './capture.ts';
import { indexPresentation } from './document.ts';
import { inlineText, tokenRuns, wordTokens } from './link-tokens.ts';
import { isRecord } from './recognition.ts';
import { blockTable, rowCells } from './slide-links.ts';
import { blockField, type PartTextSchemas } from './text-schemas.ts';

/**
 * The language a presentation's own chart cells are written in, as the MarkdownPoint app reads its `locale`: in its
 * canonical form, and en-US where it names none. A tag no language reads is one the app refuses the presentation for.
 */
export function presentationLocale(presentation: Readonly<Record<string, unknown>>): string {
    if (typeof presentation.locale !== 'string') return 'en-US';
    try {
        return Intl.getCanonicalLocales(presentation.locale)[0] ?? 'en-US';
    } catch {
        return 'en-US';
    }
}

/**
 * Copied slides and definitions from a presentation written in `from`, with each own chart's value cells spelled as a
 * presentation in `to` writes them, as the MarkdownPoint app pastes slides between two languages: each number counts as
 * it did in the presentation it came from.
 */
export function respellCopiedCharts(
    captured: CapturedSlides,
    schemas: ReadonlyMap<string, PartTextSchemas>,
    from: string,
    to: string
): CapturedSlides {
    const written = chartNumberRule(from);
    const read = chartNumberRule(to);
    if (sameRule(written, read)) return captured;
    const respell = (part: CapturedPart): CapturedPart => {
        const document = indexPresentation(part.markdown, 0);
        const indexed = document?.slides[0] ?? document?.compositions[0];
        const charts = schemas.get(part.id);
        if (!indexed || !charts) return part;
        let markdown = part.markdown;
        // From the last block, so each earlier block keeps its place.
        for (const block of [...indexed.blocks].reverse()) {
            if (!charts.get(blockField(block))?.includes('chart')) continue;
            const words = markdown.slice(block.contentFrom, block.to);
            markdown = markdown.slice(0, block.contentFrom) + respellChartCells(words, written, read) + markdown.slice(block.to);
        }
        return markdown === part.markdown ? part : { ...part, markdown };
    };
    return { slides: captured.slides.map(respell), compositions: captured.compositions.map(respell) };
}

/**
 * A chart's table with each value cell's number spelled by `to` where `from` reads one: the body rows' cells past the
 * first column, which the chart reads as values. A cell's number is read from its words, as a table cell's words read,
 * by MarkdownPoint's own rule, and spelled anew in the cell's own runs, its marks kept. Any other cell, and words that
 * are not one table, stay as written.
 */
export function respellChartCells(words: string, from: ChartNumberRule, to: ChartNumberRule): string {
    if (!blockTable(words)) return words;
    const pieces: string[] = [];
    let row = 0;
    for (const line of words.split(/(?<=\n|\r(?!\n))/)) {
        const text = line.replace(/\r?\n$|\r$/, '');
        // A table holds no blank line: its first line names the series and its second aligns the columns.
        if (!text.trim() || row++ < 2) {
            pieces.push(line);
            continue;
        }
        let position = 0;
        for (const [column, cell] of rowCells(text).entries()) {
            if (column === 0) continue;
            pieces.push(text.slice(position, cell.from), respellCell(text.slice(cell.from, cell.to), from, to));
            position = cell.to;
        }
        pieces.push(line.slice(position));
    }
    return pieces.join('');
}

/** The Markdown written around a cell's words, such as `**`, `[` and `](address)`, or a code span's fences. */
interface Container {
    open: string;
    close: string;
    /** A code span's: its words are written as they are, with no escape. */
    code: boolean;
}

/** One of a cell's runs in reading order: its words as a chart reads them, the Markdown that writes them, and its marks. */
interface Leaf {
    text: string;
    raw: string;
    containers: readonly Container[];
}

/**
 * A cell's Markdown with its number spelled by `to`, as MarkdownPoint respells a chart's cell: the number's digits, signs
 * and words stay in the runs that hold them, with the marks and links around and among them, and only the marks between
 * its digits change. A cell `from` reads no number in, or one spelled alike by both, stays as written; one whose runs
 * would read otherwise once respelled is written as its words.
 */
function respellCell(source: string, from: ChartNumberRule, to: ChartNumberRule): string {
    // A table reads a cell's escaped pipes as pipes before its Markdown, a code span's included.
    const leaves = cellLeaves(wordTokens(source.replaceAll('\\|', '|')));
    const plain = leaves.map(leaf => leaf.text).join('');
    const words = plain.trim();
    const spelled = respellChartNumber(words, from, to);
    if (spelled === null || spelled === words) return source;
    const lead = plain.length - plain.trimStart().length;
    const written = respelledLeaves(leaves, plain.slice(0, lead) + spelled + plain.slice(lead + words.length));
    if (written !== null) return written.replaceAll('|', '\\|');
    const edge = source.length - source.trimStart().length;
    return source.slice(0, edge) + markdownText(spelled).replaceAll('|', '\\|') + source.slice(source.trimEnd().length);
}

/**
 * Leaves' Markdown with their words spelled as `spelled`, each run holding what it held, or null when the runs can't
 * spell them so or their Markdown would read otherwise.
 */
function respelledLeaves(leaves: readonly Leaf[], spelled: string): string | null {
    const mapped = alignedDigits(leaves.map(leaf => leaf.text).join(''), spelled);
    if (!mapped) return null;
    const respelled: Leaf[] = [];
    let at = 0;
    for (const leaf of leaves) {
        const text = mapped.slice(at, (at += leaf.text.length)).join('');
        if (text === leaf.text) respelled.push(leaf);
        else if (text) respelled.push({ ...leaf, text, raw: leaf.containers.at(-1)?.code ? text : markdownText(text) });
    }
    const written = writtenLeaves(respelled, 0);
    const read = cellLeaves(wordTokens(written));
    const words = read.map(leaf => leaf.text).join('');
    return words.trim() === spelled.trim() && sameReading(read, respelled) ? written : null;
}

/**
 * A cell's runs in reading order, as a chart reads its words (`chartWords`): its words, escapes and code under the marks,
 * spans and links around them, while an address written as itself, HTML and a picture are each a run of the characters
 * that write them, and a note a run of none; but where a character reference spans an address and the words after it,
 * they are one run (`tokenRuns`).
 */
function cellLeaves(tokens: readonly unknown[], containers: readonly Container[] = []): Leaf[] {
    return tokenRuns(tokens).flatMap((part): Leaf[] => {
        // A run of plain words is a leaf a piece, two tokens a reference spans one.
        if ('words' in part) return part.pieces.map(piece => ({ text: piece.words, raw: piece.raw, containers }));
        const { token } = part;
        if (!isRecord(token) || typeof token.raw !== 'string') return [];
        const { raw } = token;
        const code = token.type === 'codespan' ? chartWords([token]) : '';
        const fence = token.type === 'codespan' ? codeFence(raw, code) : null;
        if (fence) return [{ text: code, raw: code, containers: [...containers, fence] }];
        const children = Array.isArray(token.tokens) ? (token.tokens as unknown[]) : [];
        const container = markContainer(token.type, raw, children);
        // A mark inside the same mark adds nothing to its words, as `_*1*_` reads `*1*`.
        const within = !container || containers.some(outer => sameContainer(outer, container)) ? containers : [...containers, container];
        const inner = container ? cellLeaves(children, within) : [];
        return inner.length ? inner : [{ text: chartWords([token]), raw, containers }];
    });
}

/** A code span's fences, each with the space its words are read without, or null when its words are not its Markdown. */
function codeFence(raw: string, text: string): Container | null {
    const fence = /^`+/.exec(raw)?.[0] ?? '';
    const inner = raw.slice(fence.length, raw.length - fence.length);
    const pad = inner === text ? '' : inner === ` ${text} ` ? ' ' : null;
    return fence && pad !== null ? { open: fence + pad, close: pad + fence, code: true } : null;
}

/**
 * The Markdown a mark, a span or a link writes around its words, a star in place of an underscore, as MarkdownPoint
 * writes them, since a star opens and closes beside punctuation; null for any other part, and for an address written as
 * itself, whose words are its address.
 */
function markContainer(type: unknown, raw: string, tokens: readonly unknown[]): Container | null {
    if (type !== 'strong' && type !== 'em' && !(type === 'link' && raw.startsWith('['))) return null;
    const inner = tokens.map(token => (isRecord(token) && typeof token.raw === 'string' ? token.raw : '')).join('');
    const at = raw.indexOf(inner, 1);
    if (at < 0) return null;
    const close = raw.slice(at + inner.length);
    return raw.startsWith('_')
        ? { open: '*'.repeat(at), close: '*'.repeat(close.length), code: false }
        : { open: raw.slice(0, at), close, code: false };
}

/**
 * Leaves written as Markdown, each run beside another under the same marks written under them once, as
 * `**1**,**234**` respelled reads `**1 234**`, and the spaces at an emphasis's edges outside its delimiters, which
 * open or close nothing beside a space; a link's, a span's and a code span's stay inside.
 */
function writtenLeaves(leaves: readonly Leaf[], depth: number): string {
    let written = '';
    for (let at = 0; at < leaves.length;) {
        const container = leaves[at]!.containers[depth];
        if (!container) {
            written += leaves[at++]!.raw;
            continue;
        }
        let end = at + 1;
        while (end < leaves.length && sameContainer(leaves[end]!.containers[depth], container)) end++;
        const inner = writtenLeaves(leaves.slice(at, end), depth + 1);
        at = end;
        const body = inner.trim();
        const lead = inner.length - inner.trimStart().length;
        if (!/^[*=~]+$/.test(container.open)) written += container.open + inner + container.close;
        else if (!body) written += inner;
        else written += inner.slice(0, lead) + container.open + body + container.close + inner.slice(lead + body.length);
    }
    return written;
}

const sameContainer = (one: Container | undefined, other: Container): boolean =>
    one?.open === other.open && one.close === other.close && one.code === other.code;

/** Whether two cells' leaves read alike: each character but a space under the same marks, wherever their runs split. */
function sameReading(one: readonly Leaf[], other: readonly Leaf[]): boolean {
    // Each mark is numbered once, as the runs under it share it, so a long link address is read once a mark.
    const keys = new Map<string, number>();
    const numbers = new WeakMap<Container, number>();
    const numbered = (container: Container): number => {
        let found = numbers.get(container);
        if (found === undefined) {
            const key = `${container.code}\n${container.open}\n${container.close}`;
            found = keys.get(key) ?? keys.size;
            keys.set(key, found);
            numbers.set(container, found);
        }
        return found;
    };
    const reading = (leaves: readonly Leaf[]) =>
        leaves.flatMap(leaf => {
            const marks = leaf.containers.map(numbered).join(',');
            return [...leaf.text.replace(/\s/g, '')].map(character => `${marks}:${character}`);
        });
    const [first, second] = [reading(one), reading(other)];
    return first.length === second.length && first.every((character, index) => character === second[index]);
}

/**
 * What each character of `before` becomes in `after`, which spells the same digits, signs and words with other marks
 * among the digits: a mark of the old spelling becomes nothing, and a mark of the new one goes with the digit it leads
 * to, so a run that holds the digit holds the mark. Null when the two don't spell the same characters in order.
 * MarkdownPoint core's own, `scene/chart-respelling.ts`.
 */
function alignedDigits(before: string, after: string): string[] | null {
    const digit = (character: string | undefined): boolean => character !== undefined && /\d/.test(character);
    const mapped: string[] = [];
    let at = 0;
    // By UTF-16 unit, as runs are measured, so a character outside the Basic Multilingual Plane maps whole.
    for (const character of before.split('')) {
        if (digit(character)) {
            let piece = '';
            while (at < after.length && !digit(after[at])) piece += after[at++];
            if (after[at] !== character) return null;
            mapped.push(piece + character);
            at += 1;
        } else if (after[at] === character) {
            mapped.push(character);
            at += 1;
        } else mapped.push('');
    }
    return at === after.length ? mapped : null;
}

/**
 * A cell's words as a chart reads them, as MarkdownPoint reads a table's cell: its marks set aside and a note left out,
 * and any other HTML, a picture and a break as the characters that write them.
 */
function chartWords(tokens: readonly unknown[]): string {
    return tokenRuns(tokens)
        .map(part => {
            if ('words' in part) return part.words;
            const { token } = part;
            if (!isRecord(token)) return '';
            const raw = typeof token.raw === 'string' ? token.raw : '';
            if (token.type === 'html') return raw.startsWith('<!--') ? '' : raw;
            if (token.type === 'image' || token.type === 'br') return raw;
            return Array.isArray(token.tokens) ? chartWords(token.tokens) : inlineText([token]);
        })
        .join('');
}

/** The punctuation a cell's inline Markdown always reads as words: no syntax and no address opens with it there. */
const WORD_MARKS = new Set([...'.,\'%()+-;/?"$#!>^|']);

/**
 * Words as Markdown writes them, on one line, with a backslash before every ASCII punctuation mark that could open
 * Markdown or make an address a link, as the dot after a www does: any other mark stands as it is. A table cell writes
 * each pipe escaped besides.
 */
const markdownText = (words: string): string =>
    words
        .replace(/[\r\n]+/g, ' ')
        .replace(/[!-/:-@[-`{-~]/g, mark => (WORD_MARKS.has(mark) ? mark : `\\${mark}`))
        .replace(/(?<=www)\./gi, '\\.');
