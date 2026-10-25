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

import { CompanionDocument } from './companion.ts';
import { indexPresentation } from './document.ts';
import type { PresentationDocument } from './document.ts';
import { isRecord, isStableId } from './recognition.ts';
import { terminateSourceBlock } from './payload.ts';

/** A complete slide or definition with identities and references prepared for its destination. */
export interface PreparedPart {
    readonly id: string;
    readonly markdown: string;
    readonly record: string;
}

export interface SlideInsertion {
    readonly changes: readonly { from: number; to: number; insert: string }[];
    readonly document: PresentationDocument;
    readonly companion: string;
}

function sourceInsertion(markdown: string, at: number, parts: readonly PreparedPart[], newline: string) {
    const separated = (source: string) => {
        const closed = terminateSourceBlock(source, newline);
        return !closed || /\n[ \t]*\r?\n$/.test(closed) ? closed : closed + newline;
    };
    const prefix = markdown.slice(0, at),
        closed = separated(prefix);
    let from = at;
    if (closed !== prefix) {
        from = 0;
        while (from < at && closed[from] === prefix[from]) from++;
    }
    const insert =
        closed.slice(from) +
        parts.map((part, index) => (index < parts.length - 1 || at < markdown.length ? separated(part.markdown) : part.markdown)).join('');
    return { from, to: at, insert };
}

/** Insert slides below the target and new definitions at the source tail, as one operation. */
export function planSlideInsertion(
    markdown: string,
    document: PresentationDocument,
    companion: string,
    slides: readonly PreparedPart[],
    afterSlideId: string | null,
    bodyStart: number,
    compositions: readonly PreparedPart[] = []
): SlideInsertion | null {
    const incoming = [...slides, ...compositions];
    if (!slides.length || new Set(incoming.map(part => part.id)).size !== incoming.length) return null;
    const after = afterSlideId === null ? null : document.slides.find(slide => slide.id === afterSlideId);
    if (afterSlideId === null ? document.slides.length > 0 : !after) return null;
    const data = CompanionDocument.read(companion);
    if (!data) return null;
    const metadata: unknown = JSON.parse(companion);
    if (!isRecord(metadata) || (metadata.compositions !== undefined && !isRecord(metadata.compositions))) return null;
    const definitions = CompanionDocument.read(companion, 'compositions');
    if (metadata.compositions !== undefined && !definitions) return null;
    const occupied = new Set([...document.slides, ...document.compositions].map(part => part.id));
    for (const [kind, parts, own, other] of [
        ['slides', slides, data, definitions],
        ['compositions', compositions, definitions, data]
    ] as const)
        for (const part of parts) {
            if (!isStableId(part.id) || occupied.has(part.id) || other?.records.has(part.id)) return null;
            const indexed = indexPresentation(part.markdown, 0);
            if (
                !indexed ||
                indexed[kind].length !== 1 ||
                indexed.sections.length ||
                indexed[kind === 'slides' ? 'compositions' : 'slides'].length ||
                indexed[kind][0]!.id !== part.id ||
                indexed[kind][0]!.from !== 0
            )
                return null;
            // An exact record can still be on disk while a cut or undo save is pending.
            // Different external metadata must never be overwritten by that restoration.
            const current = own?.records.get(part.id);
            if (current !== undefined && current !== part.record) return null;
        }
    let nextCompanion = data.change(new Map(slides.map(slide => [slide.id, slide.record])));
    if (nextCompanion === null) return null;
    if (compositions.length) {
        nextCompanion =
            CompanionDocument.ensure(nextCompanion, 'compositions')?.change(new Map(compositions.map(part => [part.id, part.record]))) ??
            null;
        if (nextCompanion === null) return null;
    }
    const at = after?.to ?? document.sections.at(-1)?.to ?? document.compositions[0]?.from ?? markdown.length;
    const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
    const changes =
        at === markdown.length
            ? [sourceInsertion(markdown, at, incoming, newline)]
            : [
                  sourceInsertion(markdown, at, slides, newline),
                  ...(compositions.length ? [sourceInsertion(markdown, markdown.length, compositions, newline)] : [])
              ];
    const proposed = [...changes]
        .reverse()
        .reduce((source, change) => source.slice(0, change.from) + change.insert + source.slice(change.to), markdown);
    const indexed = indexPresentation(proposed, bodyStart);
    const insertionIndex = after ? document.slides.indexOf(after) + 1 : 0;
    const expected = document.slides.map(slide => slide.id);
    expected.splice(insertionIndex, 0, ...slides.map(slide => slide.id));
    if (
        !indexed ||
        indexed.slides.map(slide => slide.id).join('\n') !== expected.join('\n') ||
        indexed.sections.map(section => section.id).join('\n') !== document.sections.map(section => section.id).join('\n') ||
        indexed.compositions.map(part => part.id).join('\n') !== [...document.compositions, ...compositions].map(part => part.id).join('\n')
    )
        return null;
    return { changes, companion: nextCompanion, document: indexed };
}
