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

import { markdownFenceReader } from '../readers/markdownpoint-readers.js';
import { isStableId } from './recognition.ts';

export interface DocumentBlock {
    readonly kind: 'text' | 'notes' | 'control';
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
    /** Reusable definitions share the source shape, but never enter slide navigation. */
    readonly compositions: readonly DocumentSlide[];
    readonly sections: readonly DocumentSection[];
}

export interface DocumentSection {
    readonly id: string;
    readonly from: number;
    readonly markerTo: number;
    readonly line: number;
    to: number;
}

/** Section headings and reusable compositions are outside slide ranges. */
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

// An id holds no whitespace, so the pattern reads a line in time in line with its length.
const marker = /^<!--\s*(slide|composition|section|text|control|notes)(?::\s*(\S+?))?\s*-->[ \t]*$/;

/** A marker's id as its kind reads it: a stable id, or for a text marker an instance's id, a dot and its text control's id. */
function markerId(kind: string, id: string): boolean {
    const parts = kind === 'text' ? id.split('.') : [id];
    return parts.length <= 2 && parts.every(isStableId);
}
/**
 * A line that reads as one of the markers, misspelled or closing, which MarkdownPoint refuses rather than keeps as words: a
 * marker's word, after a slash or not, with at most one word after it, colon or not, and words after its `-->` included,
 * as `<!-- /slide -->`, `<!-- slide: a<b -->` or `<!-- notes --> Say hi`. A comment with more words is the author's.
 */
const markerLike = /^<!--\s*\/?(?:section|slide|composition|text|control|notes)(?=[:\s]|-->|$):?\s*(?:\S+?\s*)?(?:-->.*)?$/i;

/**
 * Indexes source ranges without rewriting or rendering Markdown. bodyStart is the
 * first offset after the already recognized frontmatter. Invalid structural
 * directives return null so consumers cannot navigate or decorate stale ranges.
 */
export function indexPresentation(markdown: string, bodyStart: number): PresentationDocument | null {
    const slides: DocumentSlide[] = [];
    const compositions: DocumentSlide[] = [];
    const sections: DocumentSection[] = [];
    const seen = new Set<string>();
    const sectionIds = new Set<string>();
    let part: DocumentSlide | null = null;
    let section: DocumentSection | null = null;
    let block: DocumentBlock | null = null;
    let container: 'slide' | 'composition' | null = null;
    // Which lines stand in a fenced code block, read as MarkdownPoint reads them, a field at a time: each field is its own
    // Markdown block, so HTML or a fence-like line in one never changes how the next is read.
    let code = markdownFenceReader();
    // Where, in the field's lines as the reader counts them, the top-level code block that took in a marker's line opened
    let swallowed: number | null = null;
    let offset = bodyStart;
    let lineNumber = markdown.slice(0, bodyStart).split(LINE_END).length - 1;

    while (offset < markdown.length) {
        const ending = lineEnd(markdown, offset);
        const end = ending?.next ?? markdown.length;
        const line = markdown.slice(offset, ending?.at ?? end);
        // As MarkdownPoint reads a line: a marker names its block by ids, a line shaped as one with a word that is no id
        // refuses the file, and a line of more words, as `text: ask Anna`, is a comment.
        // A marker is read without the spaces or tabs before it, as after it.
        const bare = line.replace(/^[ \t]+/, '');
        const found = marker.exec(bare);
        const match = found && (found[2] === undefined || markerId(found[1]!, found[2])) ? found : null;
        const structural = match !== null || markerLike.test(bare);
        // A line in a fenced code block is the code's words, a marker's shape among them. A block at the top level takes
        // in the rest of the file while it stays open; one in a list item or a quote ends with them.
        if (code.line(line)) {
            if (structural) swallowed = code.open()?.start ?? swallowed;
            offset = end;
            lineNumber++;
            continue;
        }
        if (structural) {
            if (!match || !ending) return null;
            const kind = match[1];
            const id = match[2];
            if (kind === 'notes' ? id !== undefined : !id || !markerId(kind!, id)) return null;

            if (block) block.to = offset;
            block = null;
            if (section) section.to = offset;
            section = null;
            if (kind === 'slide' || kind === 'composition' || kind === 'section') {
                if (part) part.to = offset;
                part = null;
                container = kind === 'section' ? null : kind;
                if (kind === 'section' && id) {
                    if (sectionIds.has(id)) return null;
                    sectionIds.add(id);
                    section = { id, from: offset, markerTo: end, line: lineNumber, to: markdown.length };
                    sections.push(section);
                }
                if ((kind === 'slide' || kind === 'composition') && id) {
                    if (seen.has(id)) return null;
                    seen.add(id);
                    part = { id, from: offset, markerTo: end, line: lineNumber, to: markdown.length, blocks: [] };
                    (kind === 'slide' ? slides : compositions).push(part);
                }
            } else {
                // A control's default words under a slide are words no object shows, which MarkdownPoint keeps and warns about.
                if (!container) return null;
                if (part && (kind === 'text' || kind === 'notes' || kind === 'control')) {
                    block = { kind, id: id ?? null, from: offset, contentFrom: end, to: markdown.length };
                    part.blocks.push(block);
                }
            }
            code = markdownFenceReader();
            swallowed = null;
        }
        offset = end;
        lineNumber++;
    }
    // A code block that takes in a marker and never closes holds the rest of the file, so its slides would go missing.
    // Another fence left open at the end only holds that field's words, as the MarkdownPoint app reads it.
    if (swallowed !== null && code.open()?.start === swallowed) return null;
    return { slides, compositions, sections };
}
