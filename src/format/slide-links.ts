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

import { linkTokens } from './link-tokens.ts';
import type { Token, Tokens } from 'marked';
import { decodeHTMLStrict } from 'entities';

const punctuation = /\\([\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e])/g;
const decode = (value: string): string => decodeHTMLStrict(value.replace(punctuation, '$1'));

function columns(source: string): number {
    const line = source.trim();
    const separators: number[] = [];
    for (let index = 0; index < line.length; index++) {
        if (line[index] === '\\') index++;
        else if (line[index] === '|') separators.push(index);
    }
    return separators.length + 1 - Number(separators[0] === 0) - Number(separators.at(-1) === line.length - 1);
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
    const labels = [...source.matchAll(/\[(?:\\[\s\S]|[^[\]\\])*\]/g)].map(match => ({
        from: match.index,
        to: match.index + match[0].length
    }));
    let labelIndex = 0;
    const candidates: { from: number; to: number; probe: string; replacement: string }[] = [];
    for (const match of source.matchAll(/(?:\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]|[a-z0-9:;&#-])+/gi)) {
        while (labelIndex < labels.length && labels[labelIndex]!.to <= match.index) labelIndex++;
        const label = labels[labelIndex];
        if (label && label.from <= match.index && match.index < label.to) continue;
        const href = decode(match[0]);
        const next = href.startsWith('slide:') ? ids.get(href.slice(6)) : undefined;
        if (next === undefined || href === `slide:${next}`) continue;
        candidates.push({
            from: match.index,
            to: match.index + match[0].length,
            probe: `slide:mdp-copy-${serial}-${candidates.length}`,
            replacement: `slide:${next}`
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
    const tokens = linkTokens(schema === 'table' ? annotated.trim() : annotated);
    if (schema === 'table') {
        const blocks = tokens.filter(token => token.type !== 'space');
        const table = blocks[0];
        if (blocks.length !== 1 || table?.type !== 'table' || table.raw.trim() !== annotated.trim()) return source;
        const width = (table as Tokens.Table).header.length;
        if (
            !width ||
            annotated
                .trim()
                .split(/\r\n?|\n/)
                .some(line => columns(line) > width)
        )
            return source;
    }
    const found = new Set<string>();
    const probes = new Set(candidates.map(candidate => candidate.probe));
    const pending: Token[] = [...tokens];
    while (pending.length) {
        const token = pending.pop()!;
        if (token.type === 'link') {
            if (token.raw.startsWith('[') && token.raw.endsWith(')') && typeof token.href === 'string') {
                // Marked already removed punctuation escapes while reading the href.
                const target = decodeHTMLStrict(token.href);
                if (probes.has(target)) found.add(target);
            }
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
