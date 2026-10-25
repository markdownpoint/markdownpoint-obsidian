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

import type { CapturedPart } from './capture.ts';
import { remapRecordReferences } from './companion.ts';
import { indexPresentation } from './document.ts';
import { isStableId } from './recognition.ts';
import { remapMarkdownSlideLinks } from './slide-links.ts';

/**
 * Prepare one complete captured part using destination IDs and verified text
 * schemas. Identity allocation, dependency reuse and clipboard validation belong
 * to the caller. Notes and control defaults are always rich text.
 */
export function prepareCopiedPart(
    part: CapturedPart,
    kind: 'slide' | 'composition',
    slides: ReadonlyMap<string, string>,
    compositions: ReadonlyMap<string, string>,
    textSchemas: ReadonlyMap<string, 'rich-text' | 'table'>
): CapturedPart | null {
    const document = indexPresentation(part.markdown, 0);
    const parts = kind === 'slide' ? document?.slides : document?.compositions;
    const other = kind === 'slide' ? document?.compositions : document?.slides;
    const indexed = parts?.[0];
    if (
        !document ||
        parts?.length !== 1 ||
        other?.length ||
        document.sections.length ||
        !indexed ||
        indexed.from !== 0 ||
        indexed.id !== part.id
    )
        return null;
    const id = (kind === 'slide' ? slides : compositions).get(part.id) ?? part.id;
    if (!isStableId(id)) return null;
    const record = remapRecordReferences(part.record, slides, compositions);
    if (record === null) return null;
    const marker = part.markdown.slice(0, indexed.markerTo);
    const match = /^(<!--\s*(?:slide|composition):\s*)([^\s]+)(\s*-->[ \t]*\r?\n)$/.exec(marker);
    if (!match || match[2] !== part.id) return null;
    const pieces = [match[1]! + id + match[3]!];
    let position = indexed.markerTo;
    for (const block of indexed.blocks) {
        const schema = block.kind === 'text' ? textSchemas.get(block.id!) : 'rich-text';
        if (schema === undefined) return null;
        pieces.push(
            part.markdown.slice(position, block.contentFrom),
            remapMarkdownSlideLinks(part.markdown.slice(block.contentFrom, block.to), slides, schema)
        );
        position = block.to;
    }
    pieces.push(part.markdown.slice(position));
    return { id, markdown: pieces.join(''), record };
}
