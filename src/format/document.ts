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

import type { Token } from 'marked';
import { blockTokens } from './block-grammar.ts';
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

const marker = /^<!--\s*(slide|composition|section|text|control|notes)(?::\s*((?:(?!-->).)+?))?\s*-->[ \t]*$/;

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
 * A candidate directive consumed by a fenced code token is content, not a slide boundary. `start` is where the block
 * holding that code begins in the field's normalized text. An indented line may continue a list item, and the fenced
 * code that ends it. Indented code holds no marker, since MarkdownPoint reads a marker however far it is indented.
 */
function containingCode(markdown: string, line: string) {
    const source = markdown.replace(/\r\n?/g, '\n');
    const top = blockTokens(source).at(-1);
    let last = top;
    while (last?.type === 'list' || last?.type === 'list_item' || last?.type === 'blockquote') {
        // A list holds its items, and an item or a quote its blocks.
        const { items, tokens } = last as { items?: Token[]; tokens?: Token[] };
        last = (items ?? tokens)?.filter(token => token.type !== 'space').at(-1);
    }
    if (!top || last?.type !== 'code' || last.codeBlockStyle === 'indented' || !last.raw.trimEnd().endsWith(line.trimEnd()))
        return undefined;
    const start = source.length - top.raw.length;
    return { raw: last.raw, start, leading: last === top && source.slice(0, start).trim().length === 0 };
}

/** Ask the same grammar using a bounded probe, not the growing document prefix. */
function closesFence(fence: string, line: string): boolean {
    if (!line.trimStart().startsWith(fence[0]!)) return false;
    const token = blockTokens(`${fence}\n${line}\n`)[0];
    return token?.type === 'code' && token.text === '';
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
    const seen = new Set<string>();
    const sectionIds = new Set<string>();
    let part: DocumentSlide | null = null;
    let section: DocumentSection | null = null;
    let block: DocumentBlock | null = null;
    let container: 'slide' | 'composition' | null = null;
    let payloadFrom = bodyStart;
    let hasFence = false;
    // Where, in the current field's normalized text, the code block that last took in a marker begins
    let swallowedFrom: number | null = null;
    let openFence: string | null = null;
    // Bare CR can introduce lexer lines inside one source line. Keep full context there.
    const scanFences = !/\r(?!\n)/.test(markdown);
    let offset = bodyStart;
    let lineNumber = markdown.slice(0, bodyStart).split('\n').length - 1;

    while (offset < markdown.length) {
        const newline = markdown.indexOf('\n', offset);
        const end = newline < 0 ? markdown.length : newline + 1;
        const line = markdown.slice(offset, newline < 0 ? end : newline).replace(/\r$/, '');
        // A leading fence cannot later become part of a preceding link definition.
        // Once Marked identifies it, scan to its closing line once.
        // Retokenizing its growing payload at every example marker is quadratic.
        if (openFence) {
            if (closesFence(openFence, line)) {
                openFence = null;
                payloadFrom = end;
                hasFence = false;
                swallowedFrom = null;
            }
            offset = end;
            lineNumber++;
            continue;
        }
        hasFence ||= line.includes('```') || line.includes('~~~');
        // Each field is its own Markdown block. HTML or a fence-like line in one
        // field must not change how the next field is interpreted.
        // As MarkdownPoint reads a line: a marker names its block by ids, a line shaped as one with a word that is no id
        // refuses the file, and a line of more words, as `text: ask Anna`, is a comment.
        // A marker is read without the spaces or tabs before it, as after it.
        const bare = line.replace(/^[ \t]+/, '');
        const found = marker.exec(bare);
        const match = found && (found[2] === undefined || markerId(found[1]!, found[2])) ? found : null;
        if (match || markerLike.test(bare)) {
            const code = hasFence ? containingCode(markdown.slice(payloadFrom, end), bare) : undefined;
            if (code) {
                swallowedFrom = code.start;
                const fence = /^ {0,3}(`{3,}|~{3,})/.exec(code.raw)?.[1];
                if (fence && code.leading && scanFences) openFence = fence;
                offset = end;
                lineNumber++;
                continue;
            }
            if (!match || newline < 0) return null;
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
            payloadFrom = end;
            hasFence = false;
            swallowedFrom = null;
        }
        offset = end;
        lineNumber++;
    }
    if (openFence) return null;
    // A code block that takes in a marker and never closes holds the rest of the file, so its slides would go missing.
    // Another fence left open at the end only holds that field's words, as the MarkdownPoint app reads it.
    if (swallowedFrom !== null) {
        const source = markdown.slice(payloadFrom).replace(/\r\n?/g, '\n');
        const last = blockTokens(source).at(-1);
        if (last?.type === 'code' && source.length - last.raw.length === swallowedFrom) {
            const fence = /^ {0,3}(`{3,}|~{3,})/.exec(last.raw)?.[1];
            const closing = last.raw.replace(/\n+$/, '').split('\n').at(-1) ?? '';
            if (fence && !closesFence(fence, closing)) return null;
        }
    }
    return { slides, compositions, sections };
}
