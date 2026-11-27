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

import type { Line, RangeSet, RangeValue, Text } from '@codemirror/state';
import { indexPresentation } from '../format/document.ts';
import type { PresentationDocument } from '../format/document.ts';
import { payloadContentEnd } from '../format/payload.ts';
import { blockInsertion } from './writing-fields.ts';
import type { BlockInsertion, WritingField } from './writing-fields.ts';

export interface SlideNotes {
    readonly slideId: string;
    readonly at: number;
    readonly field: WritingField | null;
}

/** Missing notes are interface slots until the author enters the writing area. */
export function slideNotes(markdown: string, document: PresentationDocument, placeholder: string): SlideNotes[] {
    const notes: SlideNotes[] = [];
    for (const slide of document.slides) {
        const block = slide.blocks.find(block => block.kind === 'notes');
        notes.push({
            slideId: slide.id,
            at: block?.from ?? slide.to,
            field: block
                ? {
                      key: `${slide.id}:notes`,
                      opening: false,
                      role: 'body',
                      label: placeholder,
                      from: block.from,
                      contentFrom: block.contentFrom,
                      to: block.to,
                      contentTo: payloadContentEnd(markdown, block.contentFrom, block.to),
                      markerText: markdown.slice(block.from, block.contentFrom),
                      populated: markdown.slice(block.contentFrom, block.to).trim().length > 0
                  }
                : null
        });
    }
    return notes;
}

/**
 * Where a caret the author's keys or pointer put past the last line shown stops while the last slide's notes, which
 * run to the end of the file, are closed: at the end of that line, as at any document's last line, since closed notes
 * and the hidden lines above them hold no caret, and the line below their row shows none. `hiding` are the ranges
 * that hide source, the draft's and the editor's folds; an empty line is hidden only by a range that runs past its
 * start. A compact field shows its ghost's line where no source does, entered at its place in `entries`. Null while
 * the end of the file is shown, or nothing after `bodyStart` is.
 */
export function closedNotesEnd(
    doc: Text,
    notes: readonly SlideNotes[],
    opened: ReadonlySet<string>,
    hiding: readonly RangeSet<RangeValue>[],
    bodyStart: number,
    entries: readonly number[]
): number | null {
    const last = notes.find(slot => slot.field?.to === doc.length && !opened.has(slot.slideId));
    if (!last) return null;
    // Where the range that hides `line` starts, so a fold of many lines is passed in one step; null while it shows
    const hiddenFrom = (line: Line) => {
        let start: number | null = null;
        for (const set of hiding)
            set.between(line.from, line.to, (from, to) => {
                if (from > line.from || (line.from < line.to ? to < line.to : to <= line.from)) return undefined;
                start = Math.min(start ?? from, from);
                return undefined;
            });
        return start;
    };
    const entry = Math.max(-1, ...entries.filter(at => at <= last.at));
    let line = doc.lineAt(last.at - 1);
    while (line.from >= bodyStart && line.to >= entry) {
        const from = hiddenFrom(line);
        if (from === null) return line.to;
        if (line.from === 0) break;
        line = doc.lineAt(from < line.from ? from : line.from - 1);
    }
    return entry >= bodyStart ? entry : null;
}

/** A minimal source insertion; all existing bytes and the companion stay intact. */
export function notesInsertion(markdown: string, at: number): BlockInsertion {
    return blockInsertion(markdown, at, '<!-- notes -->');
}

/** Validate once on activation, including unfinished Markdown at the final field. */
export function validatedNotesInsertion(markdown: string, document: PresentationDocument, slideId: string): BlockInsertion | null {
    const slide = document.slides.find(slide => slide.id === slideId);
    if (!slide || slide.blocks.some(block => block.kind === 'notes')) return null;
    const insertion = notesInsertion(markdown, slide.to);
    const proposed = markdown.slice(0, insertion.from) + insertion.insert + markdown.slice(insertion.from);
    const start = Math.min(document.slides[0]?.from ?? 0, document.sections[0]?.from ?? Infinity);
    const indexed = indexPresentation(proposed, start);
    const notes = indexed?.slides.find(slide => slide.id === slideId)?.blocks.filter(block => block.kind === 'notes');
    return notes?.length === 1 && notes[0]!.contentFrom === insertion.cursor ? insertion : null;
}
