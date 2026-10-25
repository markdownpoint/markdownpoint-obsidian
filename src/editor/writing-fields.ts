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

import type { PresentationDocument } from '../format/document.ts';
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
