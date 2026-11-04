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
import { payloadContentEnd } from '../format/payload.ts';
import { textBindingLabel, textBindingName } from '../format/text-binding.ts';
import type { TextFieldLabels } from '../format/text-binding.ts';

export interface WritingField {
    readonly key: string;
    readonly opening: boolean;
    readonly role: 'title' | 'body' | 'eyebrow';
    readonly label: string;
    readonly from: number;
    readonly contentFrom: number;
    readonly contentTo: number;
    readonly to: number;
    readonly markerText: string;
    readonly populated: boolean;
}

export function compactFieldAt(fields: readonly WritingField[], position: number, length: number): WritingField | undefined {
    return fields.find(field => field.contentFrom === position && field.contentFrom === field.to && position < length);
}

/** Every authored text block keeps its identity and source order in the draft. */
export function writingFields(markdown: string, document: PresentationDocument, labels: TextFieldLabels): WritingField[] {
    const fields: WritingField[] = [];
    for (const slide of document.slides)
        for (const block of slide.blocks) {
            if (block.kind !== 'text' || !block.id) continue;
            const name = textBindingName(block.id);
            const role = name.name === 'title' || name.name === 'eyebrow' ? name.name : 'body';
            fields.push({
                key: `${slide.id}:text:${block.id}`,
                opening: block === slide.blocks[0],
                role,
                label: textBindingLabel(name, labels),
                from: block.from,
                contentFrom: block.contentFrom,
                to: block.to,
                contentTo: payloadContentEnd(markdown, block.contentFrom, block.to),
                markerText: markdown.slice(block.from, block.contentFrom),
                populated: markdown.slice(block.contentFrom, block.to).trim().length > 0
            });
        }
    return fields;
}

/** A layout's slot a slide gives no block yet: it shows as its empty field, and writing there writes its marker. */
export interface MissingSlot {
    readonly key: string;
    readonly slideId: string;
    readonly id: string;
    readonly role: WritingField['role'];
    readonly label: string;
    /** Where its block goes: in the layout's reading order among the slot blocks, else after the slide's words, before its notes. */
    readonly at: number;
    readonly opening: boolean;
}

function slotPosition(slide: DocumentSlide, order: readonly string[], index: number): number {
    const rank = (id: string | null) => (id === null ? -1 : order.indexOf(id));
    const words = slide.blocks.filter(block => block.kind !== 'notes');
    const before = words.filter(block => rank(block.id) >= 0 && rank(block.id) < index).at(-1);
    if (before) return before.to;
    const after = words.find(block => rank(block.id) > index);
    return after?.from ?? words.at(-1)?.to ?? slide.blocks[0]?.from ?? slide.to;
}

/** The slots each slide's layout gives it, `slots` by slide, that its source has no text block for. */
export function missingSlots(
    document: PresentationDocument,
    slots: ReadonlyMap<string, readonly string[]>,
    labels: TextFieldLabels
): MissingSlot[] {
    const missing: MissingSlot[] = [];
    for (const slide of document.slides) {
        const order = slots.get(slide.id) ?? [];
        const written = new Set(slide.blocks.flatMap(block => (block.kind === 'text' && block.id ? [block.id] : [])));
        for (const [index, id] of order.entries()) {
            if (written.has(id)) continue;
            const name = textBindingName(id);
            const at = slotPosition(slide, order, index);
            missing.push({
                key: `${slide.id}:text:${id}`,
                slideId: slide.id,
                id,
                role: name.name === 'title' || name.name === 'eyebrow' ? name.name : 'body',
                label: textBindingLabel(name, labels),
                at,
                opening: at === (slide.blocks[0]?.from ?? slide.to)
            });
        }
    }
    return missing;
}

export interface BlockInsertion {
    readonly from: number;
    readonly insert: string;
    readonly cursor: number;
}

/** A block's marker at `at`, its caret on the block's writable line; all existing bytes and the companion stay intact. */
export function blockInsertion(markdown: string, at: number, marker: string): BlockInsertion {
    const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
    // Keep a following source newline as the empty payload's writable line.
    // Redo then maps the insertion caret into the block, before the next marker.
    const from = at < markdown.length && markdown.slice(at - newline.length, at) === newline ? at - newline.length : at;
    const before = markdown.slice(0, from);
    const gap = before.endsWith(newline + newline) ? '' : before.endsWith(newline) ? newline : newline + newline;
    const prefix = gap + marker + newline;
    return { from, insert: prefix, cursor: from + prefix.length };
}

/** The marker a missing slot gets when the author starts writing there, checked against the whole source. */
export function validatedSlotInsertion(markdown: string, document: PresentationDocument, slot: MissingSlot): BlockInsertion | null {
    const slide = document.slides.find(slide => slide.id === slot.slideId);
    if (!slide || slide.blocks.some(block => block.kind === 'text' && block.id === slot.id)) return null;
    const insertion = blockInsertion(markdown, slot.at, `<!-- text: ${slot.id} -->`);
    const proposed = markdown.slice(0, insertion.from) + insertion.insert + markdown.slice(insertion.from);
    const start = Math.min(document.slides[0]?.from ?? 0, document.sections[0]?.from ?? Infinity);
    const indexed = indexPresentation(proposed, start);
    const blocks = indexed?.slides
        .find(slide => slide.id === slot.slideId)
        ?.blocks.filter(block => block.kind === 'text' && block.id === slot.id);
    return blocks?.length === 1 && blocks[0]!.contentFrom === insertion.cursor ? insertion : null;
}
