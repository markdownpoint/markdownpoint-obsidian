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

import { decodeCharacterReferences, linkTokens } from './link-tokens.ts';
import type { Token, Tokens } from 'marked';

const punctuation = /\\([\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e])/g;
const decode = (value: string): string => decodeCharacterReferences(value.replace(punctuation, '$1'));

/** Each cell of a table row's line, by where it starts and ends in the line, the pipes at the row's ends set aside. */
export function rowCells(line: string): { from: number; to: number }[] {
    const from = line.length - line.trimStart().length;
    const to = line.trimEnd().length;
    const pipes: number[] = [];
    for (let index = from; index < to; index++) {
        if (line[index] === '\\') index++;
        else if (line[index] === '|') pipes.push(index);
    }
    const cuts = [from - 1, ...pipes, to];
    const cells = cuts.slice(1).map((cut, index) => ({ from: cuts[index]! + 1, to: cut }));
    return cells.slice(pipes[0] === from ? 1 : 0, pipes.at(-1) === to - 1 ? -1 : undefined);
}

/**
 * The one table a table block's words hold, no row wider than its header and no cell's words holding a line feed or a
 * carriage return by a character reference, or null when they hold anything else, as MarkdownPoint reads a table.
 */
export function blockTable(source: string): Tokens.Table | null {
    const trimmed = source.replace(/\r\n?/g, '\n').trim();
    const blocks = linkTokens(trimmed).filter(token => token.type !== 'space');
    const table = blocks[0] as Tokens.Table | undefined;
    if (blocks.length !== 1 || table?.type !== 'table' || table.raw.trim() !== trimmed) return null;
    const width = table.header.length;
    if (!width || trimmed.split('\n').some(line => rowCells(line).length > width)) return null;
    return [...table.header, ...table.rows.flat()].some(cell => breaksLine(cell.tokens)) ? null : table;
}

/**
 * Whether words hold a line feed or a carriage return by a character reference. MarkdownPoint reads references over each
 * run of plain words, a bare address among them, and never in code, an escaped character, a picture, an autolink or
 * HTML, which it keeps as written.
 */
function breaksLine(tokens: readonly Token[]): boolean {
    let words = '';
    const broken = (): boolean => /[\r\n]/.test(decodeCharacterReferences(words));
    for (const token of tokens) {
        const nested = 'tokens' in token && token.tokens?.length ? token.tokens : undefined;
        if ((token.type === 'text' && !nested) || (token.type === 'link' && !/^[[<]/.test(token.raw))) {
            words += token.type === 'text' ? ((token as Tokens.Text).text ?? token.raw) : token.raw;
            continue;
        }
        if (broken()) return true;
        words = '';
        if (nested && token.type !== 'image' && !token.raw.startsWith('<') && breaksLine(nested)) return true;
    }
    return broken();
}

/** Trace actual link destinations through a parse-only copy; saved source never receives probe text. */
export function remapMarkdownSlideLinks(
    source: string,
    ids: ReadonlyMap<string, string>,
    schema: 'rich-text' | 'table' = 'rich-text'
): string {
    if (!ids.size) return source;
    const used = new Set(decode(source).match(/mdp-copy-\d+-/g) ?? []);
    let serial = 0;
    while (used.has(`mdp-copy-${serial}-`)) serial++;
    // A flat bracket label is words or a reference identifier, not a stable-ID
    // destination. Keep labels intact so probes cannot break reference resolution.
    // With no reference definition in the words no label is one, and an autolink's
    // address in a label, which is a link there too, is probed as anywhere else.
    const definitions = source.includes(']:');
    const labels = [...source.matchAll(/\[(?:\\[\s\S]|[^[\]\\])*\]/g)].map(match => ({
        from: match.index,
        to: match.index + match[0].length
    }));
    let labelIndex = 0;
    const candidates: { from: number; to: number; probe: string; replacement: string; literal: boolean }[] = [];
    for (const match of source.matchAll(/(?:\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]|[a-z0-9:;&#-])+/gi)) {
        while (labelIndex < labels.length && labels[labelIndex]!.to <= match.index) labelIndex++;
        const label = labels[labelIndex];
        const autolink = source[match.index - 1] === '<' && source[match.index + match[0].length] === '>';
        if ((definitions || !autolink) && label && label.from <= match.index && match.index < label.to) continue;
        const href = decode(match[0]);
        const next = href.startsWith('slide:') ? ids.get(href.slice(6)) : undefined;
        if (next === undefined || href === `slide:${next}`) continue;
        candidates.push({
            from: match.index,
            to: match.index + match[0].length,
            probe: `slide:mdp-copy-${serial}-${candidates.length}`,
            replacement: `slide:${next}`,
            literal: href === match[0]
        });
    }
    if (!candidates.length) return source;
    const pieces: string[] = [];
    let position = 0;
    for (const candidate of candidates) {
        pieces.push(source.slice(position, candidate.from), candidate.probe);
        position = candidate.to;
    }
    pieces.push(source.slice(position));
    const annotated = pieces.join('').replace(/\r\n?/g, '\n');
    const table = schema === 'table' ? blockTable(annotated) : null;
    if (schema === 'table' && !table) return source;
    const tokens = table ? [table] : linkTokens(annotated);
    const found = new Set<string>();
    const probes = new Map(candidates.map(candidate => [candidate.probe, candidate]));
    const pending: Token[] = [...tokens];
    while (pending.length) {
        const token = pending.pop()!;
        if (token.type === 'link') {
            // An inline link, or an autolink, `<slide:…>`, which MarkdownPoint reads as a link too.
            const inline = token.raw.startsWith('[') && token.raw.endsWith(')');
            if ((inline || (token.raw.startsWith('<') && token.raw.endsWith('>'))) && typeof token.href === 'string') {
                // Marked already removed punctuation escapes while reading the href.
                const probe = probes.get(decodeCharacterReferences(token.href));
                // An autolink's address is read as written: an escaped or referenced one is words, which only its probe made a link.
                if (probe && (inline || probe.literal)) found.add(probe.probe);
            }
            // A link's words may hold another, which MarkdownPoint reads as the link of those words.
            if (inline) pending.push(...(token as Tokens.Link).tokens);
        } else if (token.type === 'table') {
            if (schema === 'table') {
                const table = token as Tokens.Table;
                for (const cell of [...table.header, ...table.rows.flat()]) pending.push(...cell.tokens);
            }
        } else if (token.type === 'list') {
            for (const item of (token as Tokens.List).items) pending.push(...item.tokens);
        } else if (['paragraph', 'heading', 'blockquote', 'strong', 'em', 'del', 'text'].includes(token.type)) {
            const nested = token as
                Tokens.Paragraph | Tokens.Heading | Tokens.Blockquote | Tokens.Strong | Tokens.Em | Tokens.Del | Tokens.Text;
            pending.push(...(nested.tokens ?? []));
        }
    }
    position = 0;
    const result: string[] = [];
    for (const candidate of candidates) {
        if (!found.has(candidate.probe)) continue;
        result.push(source.slice(position, candidate.from), candidate.replacement);
        position = candidate.to;
    }
    result.push(source.slice(position));
    return result.join('');
}
