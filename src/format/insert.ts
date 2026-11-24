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
import { isStableId } from './recognition.ts';
import { terminateSourceBlock } from './payload.ts';

/** A complete slide with identities and references prepared for its destination. */
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
    const prefix = markdown.slice(0, at);
    const closed = separated(prefix);
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

/** Insert slides below the target, as one operation. */
export function planSlideInsertion(
    markdown: string,
    document: PresentationDocument,
    companion: string,
    slides: readonly PreparedPart[],
    afterSlideId: string | null,
    bodyStart: number
): SlideInsertion | null {
    if (!slides.length || new Set(slides.map(part => part.id)).size !== slides.length) return null;
    const after = afterSlideId === null ? null : document.slides.find(slide => slide.id === afterSlideId);
    if (afterSlideId === null ? document.slides.length > 0 : !after) return null;
    const data = CompanionDocument.read(companion);
    if (!data) return null;
    const occupied = new Set(document.slides.map(part => part.id));
    for (const part of slides) {
        if (!isStableId(part.id) || occupied.has(part.id)) return null;
        const indexed = indexPresentation(part.markdown, 0);
        if (
            !indexed ||
            indexed.slides.length !== 1 ||
            indexed.sections.length ||
            indexed.slides[0]!.id !== part.id ||
            indexed.slides[0]!.from !== 0
        )
            return null;
        // An exact record can still be on disk while a cut or undo save is pending.
        // Different external metadata must never be overwritten by that restoration.
        const current = data.records.get(part.id);
        if (current !== undefined && current !== part.record) return null;
    }
    const nextCompanion = data.change(new Map(slides.map(slide => [slide.id, slide.record])));
    if (nextCompanion === null) return null;
    const at = after?.to ?? document.sections.at(-1)?.to ?? markdown.length;
    const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
    const change = sourceInsertion(markdown, at, slides, newline);
    const proposed = markdown.slice(0, change.from) + change.insert + markdown.slice(change.to);
    const indexed = indexPresentation(proposed, bodyStart);
    const insertionIndex = after ? document.slides.indexOf(after) + 1 : 0;
    const expected = document.slides.map(slide => slide.id);
    expected.splice(insertionIndex, 0, ...slides.map(slide => slide.id));
    if (
        !indexed ||
        indexed.slides.map(slide => slide.id).join('\n') !== expected.join('\n') ||
        indexed.sections.map(section => section.id).join('\n') !== document.sections.map(section => section.id).join('\n')
    )
        return null;
    return { changes: [change], companion: nextCompanion, document: indexed };
}
