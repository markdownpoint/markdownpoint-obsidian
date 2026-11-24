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
import type { MissingPlaceholder, WritingField } from './writing-fields.ts';

/**
 * Lines no block holds, where MarkdownPoint refuses words: before the first marker, and between a slide's marker and its
 * first block.
 */
interface Opening {
    readonly slide: DocumentSlide | null;
    readonly to: number;
}

/** Where a slide's opening ends: at its first block, or at a later minor's block before it. */
function openingEnd(document: PresentationDocument, slide: DocumentSlide): number {
    const later = document.laterMarkers.find(marker => marker.from >= slide.markerTo && marker.from < slide.to);
    return Math.min(slide.blocks[0]?.from ?? slide.to, later?.from ?? Infinity);
}

function openingAt(document: PresentationDocument, bodyStart: number, length: number, position: number): Opening | null {
    // An opening ends where the next marker's line starts, which takes no words, or at the end of the file, which does
    const within = (from: number, to: number) => position >= from && (position < to || (position === to && to === length));
    const slide = document.slides.find(slide => position >= slide.markerTo && position <= slide.to);
    if (slide) {
        const to = openingEnd(document, slide);
        return within(slide.markerTo, to) ? { slide, to } : null;
    }
    const first = Math.min(...[document.slides, document.sections, document.laterMarkers].map(list => list[0]?.from ?? Infinity));
    return first !== Infinity && within(bodyStart, first) ? { slide: null, to: first } : null;
}

/** Whether a position stands in an opening, where words stand in no block. */
export function inOpening(document: PresentationDocument, bodyStart: number, length: number, position: number): boolean {
    return openingAt(document, bodyStart, length, position) !== null;
}

type Selection = readonly { readonly anchor: number; readonly head: number }[];

/**
 * The slides whose boundary holds their opening, by id, with where its line ends. The one blank line MarkdownPoint
 * writes between a slide's marker and its first block holds no words, so the draft draws it inside the boundary, and
 * the caret passes over it as over a field's marker. A slide with no blocks keeps its line, where words write its
 * first writing; an opening of more lines keeps them, for the author to delete, and so does one a later minor's block
 * ends, since that block's words are shown as written.
 */
export function heldOpenings(markdown: string, document: PresentationDocument, selection: Selection = []): Map<string, number> {
    const held = new Map<string, number>();
    for (const slide of document.slides) {
        const first = slide.blocks[0];
        if (first && holdsOpening(markdown, slide.markerTo, first.from, selection)) held.set(slide.id, first.from - 1);
    }
    return held;
}

/**
 * Whether `from`–`to` is one blank line with its line break, which a boundary holds: no words, a later minor's marker
 * included. A line a selection's end stands on, as an edit can leave one, stays until it leaves, so the caret shown is
 * where the author writes; a selection that only passes over it leaves it held.
 */
export function holdsOpening(markdown: string, from: number, to: number, selection: Selection): boolean {
    const on = (position: number) => position >= from && position < to;
    return /^[ \t]*\n$/.test(markdown.slice(from, to)) && !selection.some(range => on(range.anchor) || on(range.head));
}

/** A slide's first writing, which a press on its boundary enters. */
export type OpeningEntry =
    | { readonly kind: 'line'; readonly at: number }
    | { readonly kind: 'placeholder'; readonly key: string }
    | { readonly kind: 'field'; readonly field: WritingField };

/**
 * The first writing a slide's draft shows below its boundary: a slide with no blocks has its line, where typed words
 * write its first writing; otherwise an unwritten placeholder above the first block, or the first block's field, its
 * notes' included. `fields` are the draft's writing fields with every slide's notes. Null when a later minor's block
 * comes first, whose words are shown as written, or when nothing there takes the caret.
 */
export function openingEntry(
    document: PresentationDocument,
    slide: DocumentSlide,
    missing: readonly MissingPlaceholder[],
    fields: readonly WritingField[],
    length: number
): OpeningEntry | null {
    const first = slide.blocks[0];
    if (openingEnd(document, slide) < (first?.from ?? slide.to)) return null;
    if (!first && (slide.markerTo < slide.to || slide.to === length)) return { kind: 'line', at: slide.markerTo };
    const placeholder = missing.find(placeholder => placeholder.slideId === slide.id && placeholder.opening);
    if (placeholder) return { kind: 'placeholder', key: placeholder.key };
    const field = first && fields.find(field => field.from === first.from);
    return field ? { kind: 'field', field } : null;
}

/** The block written for words typed in an opening: `before`, its marker, goes at `at`. */
export interface OpeningWrite {
    readonly at: number;
    readonly before: string;
    /** The written block's marker, as `kind id`, and where it starts in `before`. */
    readonly block: string;
    readonly markerOffset: number;
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
    const slide = opening?.slide;
    if (!slide || slide.blocks.length || opening.to !== slide.to || to > opening.to) return null;
    const placeholder = missing.find(placeholder => placeholder.slideId === slide.id);
    const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
    // The opening holds only spaces, so the caret's line starts after the last line break before it
    const at = Math.max(markdown.lastIndexOf('\n', from - 1) + 1, slide.markerTo);
    const preceding = markdown.slice(0, at);
    const gap = preceding.endsWith(newline + newline) ? '' : preceding.endsWith(newline) ? newline : newline + newline;
    const marker = placeholder ? `<!-- text: ${placeholder.id} -->` : '<!-- notes -->';
    return {
        at,
        before: gap + marker + newline,
        block: placeholder ? `text ${placeholder.id}` : 'notes ',
        markerOffset: gap.length,
        notesOf: placeholder ? null : slide.id
    };
}

/**
 * The block an input method's key writes on the line of a slide with no blocks before its composition starts, since
 * composed words that moved would be typed twice: the writing typed words take there, its marker at the caret, where
 * the composition then starts, so native history joins the two into one step. Spaces before the caret stay on their
 * line. Null where typed words would find no block.
 */
export function compositionWrite(
    markdown: string,
    document: PresentationDocument,
    bodyStart: number,
    missing: readonly MissingPlaceholder[],
    head: number
): OpeningWrite | null {
    const write = openingWrite(markdown, document, bodyStart, missing, head, head);
    if (!write || head === write.at) return write;
    // A line break ends the spaces' line, which then stands as the blank line before the marker
    const gap = markdown.includes('\r\n') ? '\r\n' : '\n';
    return { ...write, at: head, before: gap + write.before.slice(write.markerOffset), markerOffset: gap.length };
}

/**
 * What a block written for a composition gives back once no composition is under way: `from`–`to` in `proposed`, the
 * source then, holds the block's marker and what the author's input wrote after it. Nothing while that holds words;
 * the marker alone when it holds none, so spaces the input method wrote stay on the line as typed spaces do; and all of
 * it when its words would move or set free a marker, as typing such words is refused. It is read against the source
 * without it, so an edit that came meanwhile, such as the file reloading with a slide added, stays as it came.
 */
export function compositionTakeBack(
    proposed: string,
    bodyStart: number,
    write: OpeningWrite,
    from: number,
    to: number
): { readonly from: number; readonly to: number } | null {
    const words = from + write.before.length;
    if (to < words || proposed.slice(from, words) !== write.before) return null;
    const markdown = proposed.slice(0, from) + proposed.slice(to);
    const document = indexPresentation(markdown, bodyStart);
    // A source another edit left unreadable is no doing of the composition's, and taking it back would mend nothing
    if (!document) return null;
    const map = (position: number) => (position >= from ? position + to - from : position);
    if (!keepsStructure(markdown, document, bodyStart, proposed, write, map, from)) return { from, to };
    return proposed.slice(words, to).trim() ? null : { from, to: words };
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
