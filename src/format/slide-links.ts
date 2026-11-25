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

import { decodeCharacterReferences, markdownLinks } from '../readers/markdownpoint-readers.js';

const punctuation = /\\([\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e])/g;
const decode = (value: string): string => decodeCharacterReferences(value.replace(punctuation, '$1'));

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
    const candidates: { from: number; to: number; probe: string; replacement: string }[] = [];
    for (const match of source.matchAll(/(?:\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]|[a-z0-9:;&#-])+/gi)) {
        while (labelIndex < labels.length && labels[labelIndex]!.to <= match.index) labelIndex++;
        const label = labels[labelIndex];
        const autolink = source[match.index - 1] === '<' && source[match.index + match[0].length] === '>';
        if ((definitions || !autolink) && label && label.from <= match.index && match.index < label.to) continue;
        const href = decode(match[0]);
        const next = href.startsWith('slide:') ? ids.get(href.slice(6)) : undefined;
        if (next === undefined || href === `slide:${next}`) continue;
        // An autolink's address follows as written, as MarkdownPoint's paste reads it, so one escaped or referenced stays:
        // its probe holds a space, which a link's destination in angle brackets reads and an autolink's address can't.
        const probe = `slide:mdp-copy-${serial}-${candidates.length}${autolink && href !== match[0] ? ' mdp' : ''}`;
        candidates.push({ from: match.index, to: match.index + match[0].length, probe, replacement: `slide:${next}` });
    }
    if (!candidates.length) return source;
    const pieces: string[] = [];
    let position = 0;
    for (const candidate of candidates) {
        pieces.push(source.slice(position, candidate.from), candidate.probe);
        position = candidate.to;
    }
    pieces.push(source.slice(position));
    // A probe MarkdownPoint reads as a link's destination is one, its words read as the app reads them.
    const found = new Set(markdownLinks(pieces.join(''), schema));
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
