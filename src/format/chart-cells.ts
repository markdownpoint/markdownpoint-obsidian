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
import { inlineText, wordTokens } from './link-tokens.ts';
import { isRecord } from './recognition.ts';
import { blockTable, rowCells } from './slide-links.ts';
import type { TextSchema } from './text-schemas.ts';

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
    schemas: ReadonlyMap<string, ReadonlyMap<string, TextSchema>>,
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
            if (block.kind !== 'text' || block.id === null || charts.get(block.id) !== 'chart') continue;
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
 * by MarkdownPoint's own rule. Any other cell, and words that are not one table, stay as written.
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

/**
 * A cell's Markdown with its number spelled by `to`, written as its words, as MarkdownPoint writes a chart's table: a
 * chart reads each cell as words, so marks around them mean nothing to it. A cell `from` reads no number in, or one
 * spelled alike by both, stays as written.
 */
function respellCell(source: string, from: ChartNumberRule, to: ChartNumberRule): string {
    // A table reads a cell's escaped pipes as pipes before its Markdown, a code span's included.
    const words = chartWords(wordTokens(source.replaceAll('\\|', '|'))).trim();
    const spelled = respellChartNumber(words, from, to);
    if (spelled === null || spelled === words) return source;
    const lead = source.length - source.trimStart().length;
    return source.slice(0, lead) + cellText(spelled) + source.slice(source.trimEnd().length);
}

/**
 * A cell's words as a chart reads them, as MarkdownPoint reads a table's cell: its marks set aside and a note left out,
 * and any other HTML, a picture and a break as the characters that write them.
 */
function chartWords(tokens: readonly unknown[]): string {
    return tokens
        .map(token => {
            if (!isRecord(token)) return '';
            const raw = typeof token.raw === 'string' ? token.raw : '';
            if (token.type === 'html') return raw.startsWith('<!--') ? '' : raw;
            if (token.type === 'image' || token.type === 'br') return raw;
            return Array.isArray(token.tokens) ? chartWords(token.tokens) : inlineText([token]);
        })
        .join('');
}

/** The punctuation a cell's inline Markdown always reads as words: no syntax and no address opens with it there. */
const WORD_MARKS = new Set([...'.,\'%()+-;/?"$#!>^']);

/**
 * Words as a table cell writes them, on one line, with a backslash before every ASCII punctuation mark that could open
 * Markdown, end the cell or make an address a link, as the dot after a www does: any other mark stands as it is.
 */
const cellText = (words: string): string =>
    words
        .replace(/[\r\n]+/g, ' ')
        .replace(/[!-/:-@[-`{-~]/g, mark => (WORD_MARKS.has(mark) ? mark : `\\${mark}`))
        .replace(/(?<=www)\./gi, '\\.');
