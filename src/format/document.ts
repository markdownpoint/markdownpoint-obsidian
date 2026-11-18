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
import { formatStanding, statedMarkdownVersion } from './format-version.ts';
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

// An id holds no whitespace, so the pattern reads a line in time in line with its length. Only spaces and tabs stand
// inside a marker, as around it; a line with other white space there is `markerLike`'s.
const marker = /^<!--[ \t]*(slide|composition|section|text|control|notes)(?::[ \t]*(\S+?))?[ \t]*-->[ \t]*$/;

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

/** A comment line shaped as a marker, spaces or tabs after it: one lowercase word, or one, a colon and an id. */
const markerShaped = /^<!--\s*([a-z]+(?:-[a-z]+)*)(?::\s*[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)?)?\s*-->[ \t]*$/;
/** The words a marker-shaped line of this minor may start with and stay what it is: its markers' and a paragraph id's. */
const knownMarkerWords: ReadonlySet<string> = new Set(['section', 'slide', 'composition', 'text', 'control', 'notes', 'id']);

/**
 * Whether a line, read without the spaces or tabs before it, has a later minor's marker's shape: marker-shaped, with a
 * word none of this minor's markers has. In a newer minor's file it is that minor's marker; in this minor's, a note.
 */
function laterMarkerShaped(bare: string): boolean {
    if (!bare.startsWith('<!--')) return false;
    const word = markerShaped.exec(bare)?.[1];
    return word !== undefined && !knownMarkerWords.has(word);
}

/**
 * A block's words as MarkdownPoint writes them in every file it saves: a backslash after the `<!--` of each line outside
 * code that a later minor reads as its marker, so every minor reads it as the note it is. An escaped line has no marker's
 * shape, and stays as written.
 */
export function escapeMarkerShapedNotes(words: string): string {
    if (!words.includes('<!--')) return words;
    const code = markdownFenceReader();
    let escaped = '';
    for (let offset = 0; offset < words.length;) {
        const ending = lineEnd(words, offset);
        const end = ending?.next ?? words.length;
        const line = words.slice(offset, ending?.at ?? end);
        const bare = line.replace(/^[ \t]+/, '');
        const opening = offset + line.length - bare.length + '<!--'.length;
        // Every line is read for the code blocks, so a fence opened on one closes on the right one
        const note = !code.line(line) && laterMarkerShaped(bare);
        escaped += note ? `${words.slice(offset, opening)}\\${words.slice(opening, end)}` : words.slice(offset, end);
        offset = end;
    }
    return escaped;
}

/**
 * A part's source after its marker, each block's words as `spell` gives them, and null where it gives none: what stands
 * between the blocks stays as written.
 */
export function spellBlocks(
    markdown: string,
    part: DocumentSlide,
    spell: (words: string, block: DocumentBlock) => string | null
): string | null {
    const pieces: string[] = [];
    let position = part.markerTo;
    for (const block of part.blocks) {
        const words = spell(markdown.slice(block.contentFrom, block.to), block);
        if (words === null) return null;
        pieces.push(markdown.slice(position, block.contentFrom), words);
        position = block.to;
    }
    pieces.push(markdown.slice(position, part.to));
    return pieces.join('');
}

/**
 * Indexes source ranges without rewriting or rendering Markdown. bodyStart is the
 * first offset after the already recognized frontmatter. Invalid structural
 * directives return null so consumers cannot navigate or decorate stale ranges.
 */
export function indexPresentation(markdown: string, bodyStart: number): PresentationDocument | null {
    const slides: DocumentSlide[] = [];
    const compositions: DocumentSlide[] = [];
    const sections: DocumentSection[] = [];
    const laterMarkers: { from: number; markerTo: number }[] = [];
    const seen = new Set<string>();
    const sectionIds = new Set<string>();
    let part: DocumentSlide | null = null;
    let section: DocumentSection | null = null;
    // The section whose heading the lines read stand in
    let heading: DocumentSection | null = null;
    let block: DocumentBlock | null = null;
    let container: 'slide' | 'composition' | null = null;
    // Which lines stand in a fenced code block, read as MarkdownPoint reads them, a field at a time: each field is its own
    // Markdown block, so HTML or a fence-like line in one never changes how the next is read.
    let code = markdownFenceReader();
    // Where, in the field's lines as the reader counts them, the top-level code block that took in a marker's line opened
    let swallowed: number | null = null;
    let offset = bodyStart;
    let lineNumber = markdown.slice(0, bodyStart).split(LINE_END).length - 1;
    const newerMinor = formatStanding(statedMarkdownVersion(markdown)) === 'newer-minor';

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
        // In a newer minor's file, a later minor's marker opens a block of that minor's, which MarkdownPoint keeps as written
        const later = newerMinor && laterMarkerShaped(bare);
        const structural = later || match !== null || markerLike.test(bare);
        // A line in a fenced code block is the code's words, a marker's shape among them. A block at the top level takes
        // in the rest of the file while it stays open; one in a list item or a quote ends with them.
        if (code.line(line)) {
            if (structural) swallowed = code.open()?.start ?? swallowed;
            offset = end;
            lineNumber++;
            continue;
        }
        if (structural) {
            // Each marker ends the words and the heading before it. A later minor's block stands where it is, in a page or
            // after a section's heading, so the page or the section goes on past it.
            if (block) block.to = offset;
            block = null;
            if (heading) heading.headingTo = offset;
            heading = null;
            code = markdownFenceReader();
            swallowed = null;
        }
        if (later) laterMarkers.push({ from: offset, markerTo: end });
        if (structural && !later) {
            if (!match || !ending) return null;
            const kind = match[1];
            const id = match[2];
            if (kind === 'notes' ? id !== undefined : !id || !markerId(kind!, id)) return null;

            if (section) section.to = offset;
            section = null;
            if (kind === 'slide' || kind === 'composition' || kind === 'section') {
                if (part) part.to = offset;
                part = null;
                container = kind === 'section' ? null : kind;
                if (kind === 'section' && id) {
                    if (sectionIds.has(id)) return null;
                    sectionIds.add(id);
                    section = { id, from: offset, markerTo: end, line: lineNumber, headingTo: markdown.length, to: markdown.length };
                    heading = section;
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
        }
        offset = end;
        lineNumber++;
    }
    // A code block that takes in a marker and never closes holds the rest of the file, so its slides would go missing.
    // Another fence left open at the end only holds that field's words, as the MarkdownPoint app reads it.
    if (swallowed !== null && code.open()?.start === swallowed) return null;
    return { slides, compositions, sections, laterMarkers };
}
