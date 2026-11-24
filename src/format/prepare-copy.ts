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
import { escapeMarkerShapedNotes, indexPresentation, spellBlocks } from './document.ts';
import { isStableId } from './recognition.ts';
import { remapMarkdownSlideLinks } from './slide-links.ts';
import { blockField, type PartTextSchemas } from './text-schemas.ts';

/**
 * Prepare one complete captured slide using destination IDs and verified text
 * schemas, each block's words read in its block's grammar and its marker-shaped
 * notes escaped, as MarkdownPoint writes them in every file. Identity allocation
 * and clipboard validation belong to the caller.
 */
export function prepareCopiedPart(
    part: CapturedPart,
    slides: ReadonlyMap<string, string>,
    textSchemas: PartTextSchemas
): CapturedPart | null {
    const document = indexPresentation(part.markdown, 0);
    const indexed = document?.slides[0];
    if (!document || document.slides.length !== 1 || document.sections.length || !indexed || indexed.from !== 0 || indexed.id !== part.id)
        return null;
    const id = slides.get(part.id) ?? part.id;
    if (!isStableId(id)) return null;
    const record = remapRecordReferences(part.record, slides);
    if (record === null) return null;
    const marker = part.markdown.slice(0, indexed.markerTo);
    const match = /^([ \t]*<!--[ \t]*slide:[ \t]*)([^\s]+)([ \t]*-->[ \t]*(?:\r\n|\r|\n))$/.exec(marker);
    if (!match || match[2] !== part.id) return null;
    const words = spellBlocks(part.markdown, indexed, (words, block) => {
        const schema = textSchemas.get(blockField(block));
        return schema === undefined ? null : remapMarkdownSlideLinks(escapeMarkerShapedNotes(words), slides, schema);
    });
    if (words === null) return null;
    return { id, markdown: match[1]! + id + match[3]! + words, record };
}
