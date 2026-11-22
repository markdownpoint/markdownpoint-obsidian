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

import { indexPresentation } from '../format/document.ts';
import type { DocumentSlide, PresentationDocument } from '../format/document.ts';
import type { MissingPlaceholder } from './writing-fields.ts';

/**
 * Lines no block holds, where MarkdownPoint refuses words: before the first marker, and between a slide's or a
 * composition's marker and its first block.
 */
interface Opening {
    readonly part: DocumentSlide | null;
    readonly slide: boolean;
    readonly to: number;
}

/** Where a part's opening ends: at its first block, or at a later minor's block before it. */
function openingEnd(document: PresentationDocument, part: DocumentSlide): number {
    const later = document.laterMarkers.find(marker => marker.from >= part.markerTo && marker.from < part.to);
    return Math.min(part.blocks[0]?.from ?? part.to, later?.from ?? Infinity);
}

function openingAt(document: PresentationDocument, bodyStart: number, length: number, position: number): Opening | null {
    // An opening ends where the next marker's line starts, which takes no words, or at the end of the file, which does
    const within = (from: number, to: number) => position >= from && (position < to || (position === to && to === length));
    const holding = (parts: readonly DocumentSlide[]) => parts.find(part => position >= part.markerTo && position <= part.to);
    const slide = holding(document.slides);
    const part = slide ?? holding(document.compositions);
    if (part) {
        const to = openingEnd(document, part);
        return within(part.markerTo, to) ? { part, slide: part === slide, to } : null;
    }
    const first = Math.min(
        ...[document.slides, document.compositions, document.sections, document.laterMarkers].map(list => list[0]?.from ?? Infinity)
    );
    return first !== Infinity && within(bodyStart, first) ? { part: null, slide: false, to: first } : null;
}

/** Whether a position stands in an opening, where words stand in no block. */
export function inOpening(document: PresentationDocument, bodyStart: number, length: number, position: number): boolean {
    return openingAt(document, bodyStart, length, position) !== null;
}

/** The block written for words typed in an opening: `before`, its marker, goes at `at`. */
export interface OpeningWrite {
    readonly at: number;
    readonly before: string;
    /** The written block's marker, as `kind id`, and where it starts in `before`. */
    readonly block: string;
    readonly markerOffset: number;
    readonly partId: string;
    /** The slide whose presenter notes take the words, which the draft shows open. */
    readonly notesOf: string | null;
}

/**
 * Words typed on the line of a slide with no blocks, replacing `from`–`to`, go into the writing its draft shows
 * below: the layout's first unwritten placeholder, as choosing it does, else the slide's presenter notes. Its marker
 * is written at the start of the caret's line, so spaces typed there before the words stay with them, and native
 * history puts the caret back after the words. Null where no block can take them: before the first marker, or in a
 * slide whose opening the draft's caret passes over.
 */
export function openingWrite(
    markdown: string,
    document: PresentationDocument,
    bodyStart: number,
    missing: readonly MissingPlaceholder[],
    from: number,
    to: number
): OpeningWrite | null {
    const opening = openingAt(document, bodyStart, markdown.length, from);
    const part = opening?.part;
    if (!part || !opening.slide || part.blocks.length || opening.to !== part.to || to > opening.to) return null;
    const placeholder = missing.find(placeholder => placeholder.slideId === part.id);
    const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
    // The opening holds only spaces, so the caret's line starts after the last line break before it
    const at = Math.max(markdown.lastIndexOf('\n', from - 1) + 1, part.markerTo);
    const preceding = markdown.slice(0, at);
    const gap = preceding.endsWith(newline + newline) ? '' : preceding.endsWith(newline) ? newline : newline + newline;
    const marker = placeholder ? `<!-- text: ${placeholder.id} -->` : '<!-- notes -->';
    return {
        at,
        before: gap + marker + newline,
        block: placeholder ? `text ${placeholder.id}` : 'notes ',
        markerOffset: gap.length,
        partId: part.id,
        notesOf: placeholder ? null : part.id
    };
}

interface Marker {
    readonly from: number;
    readonly name: string;
}

function markers(markdown: string, document: PresentationDocument): Marker[] {
    return [
        ...document.slides.flatMap(slide => [
            { from: slide.from, name: `slide ${slide.id}` },
            ...slide.blocks.map(block => ({ from: block.from, name: `${block.kind} ${block.id ?? ''}` }))
        ]),
        ...document.compositions.flatMap(part => [
            { from: part.from, name: `composition ${part.id}` },
            ...part.blocks.map(block => ({ from: block.from, name: `${block.kind} ${block.id ?? ''}` }))
        ]),
        ...document.sections.map(section => ({ from: section.from, name: `section ${section.id}` })),
        ...document.laterMarkers.map(marker => ({ from: marker.from, name: markdown.slice(marker.from, marker.markerTo).trim() }))
    ].sort((a, b) => a.from - b.from);
}

/**
 * Whether the source with words written from an opening reads every marker it held at its place, and only the
 * written block's besides: words such as a fence's could otherwise take in a marker after them, or set one free.
 * `map` takes a position in the source before the edit to the one after it, and `at` is where the edit's text starts.
 */
export function keepsStructure(
    markdown: string,
    document: PresentationDocument,
    bodyStart: number,
    proposed: string,
    write: OpeningWrite,
    map: (position: number) => number,
    at: number
): boolean {
    const written = indexPresentation(proposed, bodyStart);
    if (!written) return false;
    const expected = [
        ...markers(markdown, document).map(marker => ({ ...marker, from: map(marker.from) })),
        { from: at + write.markerOffset, name: write.block }
    ].sort((a, b) => a.from - b.from);
    const found = markers(proposed, written);
    return (
        found.length === expected.length &&
        found.every((marker, index) => marker.from === expected[index]!.from && marker.name === expected[index]!.name)
    );
}
