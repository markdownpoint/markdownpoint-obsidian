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

import { markdownMarkers } from '../readers/markdownpoint-readers.js';

export interface DocumentBlock {
    readonly kind: 'text' | 'notes';
    readonly id: string | null;
    readonly from: number;
    readonly contentFrom: number;
    to: number;
}

export interface DocumentSlide {
    readonly id: string;
    readonly from: number;
    readonly markerTo: number;
    readonly line: number;
    to: number;
    readonly blocks: DocumentBlock[];
}

export interface PresentationDocument {
    readonly slides: readonly DocumentSlide[];
    readonly sections: readonly DocumentSection[];
    /** A newer minor's file's markers of a later minor, each a block MarkdownPoint keeps as written: their lines. */
    readonly laterMarkers: readonly { readonly from: number; readonly markerTo: number }[];
}

export interface DocumentSection {
    readonly id: string;
    readonly from: number;
    readonly markerTo: number;
    readonly line: number;
    /** Where its heading's words end: at the next marker, a later minor's included. */
    headingTo: number;
    /** Where it ends, at its first page: a later minor's block after its heading stands in it. */
    to: number;
}

/** Section headings are outside slide ranges. */
export function slideAtPosition(document: PresentationDocument, position: number): DocumentSlide | null {
    return document.slides.find(slide => position >= slide.from && position < slide.to) ?? null;
}

/** A line end as MarkdownPoint reads one: CRLF, a bare LF or a bare CR. */
const LINE_END = /\r\n|\r|\n/g;

/** The first line end at or after `from` in the source as written: where it starts and where the next line starts. */
export function lineEnd(source: string, from: number): { at: number; next: number } | null {
    LINE_END.lastIndex = from;
    const found = LINE_END.exec(source);
    return found ? { at: found.index, next: found.index + found[0].length } : null;
}

/**
 * A slide's source after its marker, each block's words as `spell` gives them, and null where it gives none: what stands
 * between the blocks stays as written.
 */
export function spellBlocks(
    markdown: string,
    slide: DocumentSlide,
    spell: (words: string, block: DocumentBlock) => string | null
): string | null {
    const pieces: string[] = [];
    let position = slide.markerTo;
    for (const block of slide.blocks) {
        const words = spell(markdown.slice(block.contentFrom, block.to), block);
        if (words === null) return null;
        pieces.push(markdown.slice(position, block.contentFrom), words);
        position = block.to;
    }
    pieces.push(markdown.slice(position, slide.to));
    return pieces.join('');
}

/**
 * Indexes source ranges without rewriting or rendering Markdown, from the markers MarkdownPoint reads: a block runs to the
 * next marker, its blank lines included. bodyStart is the first offset after the already recognized frontmatter. A body
 * MarkdownPoint refuses returns null, so consumers cannot navigate or decorate a file it refuses.
 */
export function indexPresentation(markdown: string, bodyStart: number): PresentationDocument | null {
    const markers = markdownMarkers(markdown, bodyStart);
    if (!markers) return null;
    const slides: DocumentSlide[] = [];
    const sections: DocumentSection[] = [];
    const laterMarkers: { from: number; markerTo: number }[] = [];
    let slide: DocumentSlide | null = null;
    let section: DocumentSection | null = null;
    // The section whose heading runs to the next marker
    let heading: DocumentSection | null = null;
    let block: DocumentBlock | null = null;
    for (const { kind, id, from, to, line: lineFromOne } of markers) {
        // Counted from 0, as the editor counts lines
        const line = lineFromOne - 1;
        // Each marker ends the words and the heading before it. A later minor's block stands where it is, in a page or after
        // a section's heading, so the page or the section goes on past it.
        if (block) block.to = from;
        block = null;
        if (heading) heading.headingTo = from;
        heading = null;
        if (kind === 'later') {
            laterMarkers.push({ from, markerTo: to });
            continue;
        }
        if (section) section.to = from;
        section = null;
        if (kind === 'text' || kind === 'notes') {
            // MarkdownPoint refuses a block's marker outside a page
            block = { kind, id: id ?? null, from, contentFrom: to, to: markdown.length };
            slide!.blocks.push(block);
            continue;
        }
        if (slide) slide.to = from;
        slide = null;
        if (kind === 'section') {
            section = { id: id!, from, markerTo: to, line, headingTo: markdown.length, to: markdown.length };
            heading = section;
            sections.push(section);
        } else {
            slide = { id: id!, from, markerTo: to, line, to: markdown.length, blocks: [] };
            slides.push(slide);
        }
    }
    return { slides, sections, laterMarkers };
}
