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

// A control's name is the author's words, so a control marker, and an instance's text marker after its first dot, name
// words: one line, one space between them, no control character and no `-->`, as MarkdownPoint reads them.
const marker = /^<!--\s*(slide|composition|section|text|control|notes)(?::\s*((?:(?!-->).)+?))?\s*-->[ \t]*$/;
const controlName = /^(?!.*-->)[^\s\p{Cc}]+(?: [^\s\p{Cc}]+)*$/u;

/** A marker's id as its kind reads it: a control's name, an instance's id and its text control's name, or a stable id. */
function markerId(kind: string, id: string): boolean {
    if (kind === 'control') return controlName.test(id);
    const dot = id.indexOf('.');
    if (kind !== 'text' || dot < 0) return isStableId(id);
    return isStableId(id.slice(0, dot)) && controlName.test(id.slice(dot + 1));
}
const markerLike = /^<!--\s*(?:slide|composition|section|text|control|notes)(?=[:\s]|-->|$)(?:\s*:?\s*[^\s<>]*)?\s*(?:-->|$)/i;

/**
 * A candidate directive consumed by a code token is content, not a slide boundary. `start` is where that code block
 * begins in the field's normalized text.
 */
function containingCode(markdown: string, line: string) {
    const source = markdown.replace(/\r\n?/g, '\n');
    const last = blockTokens(source).at(-1);
    if (last?.type !== 'code' || !last.raw.trimEnd().endsWith(line.trimEnd())) return undefined;
    const start = source.length - last.raw.length;
    return { raw: last.raw, start, leading: source.slice(0, start).trim().length === 0 };
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
        // As MarkdownPoint reads a line: a control marker, or a text marker naming an instance's control, is a marker
        // whatever its words, and words it can't name refuse the file; another line of words, as `text: ask Anna`, is a comment.
        const found = marker.exec(line);
        const claimed = found !== null && (found[1] === 'control' || (found[1] === 'text' && /^[a-z][a-z0-9-]*\./.test(found[2] ?? '')));
        const match = found && (found[2] === undefined || claimed || markerId(found[1]!, found[2])) ? found : null;
        if (match || markerLike.test(line)) {
            const code = hasFence ? containingCode(markdown.slice(payloadFrom, end), line) : undefined;
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
                if (!container || (kind === 'control' && container !== 'composition')) return null;
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
