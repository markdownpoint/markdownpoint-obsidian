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
import { isSlideRecordSource } from './companion.ts';
import { prepareCopiedPart } from './prepare-copy.ts';
import { isStableId } from './recognition.ts';
import type { PartTextSchemas } from './text-schemas.ts';

/**
 * Prepare a copied group without touching the destination. Schemas describe the
 * source fields; occupied includes standing, orphaned and recoverable IDs.
 */
export function prepareSlideCopies(
    captured: readonly CapturedPart[],
    occupied: ReadonlySet<string>,
    schemas: ReadonlyMap<string, PartTextSchemas>,
    mint: (used: ReadonlySet<string>) => string,
    preserveSlideIds = false
): readonly CapturedPart[] | null {
    if (!captured.length || new Set(captured.map(part => part.id)).size !== captured.length) return null;
    const used = new Set([...occupied, ...captured.map(part => part.id)]);
    const fresh = (): string | null => {
        const id = mint(used);
        if (!isStableId(id) || used.has(id)) return null;
        used.add(id);
        return id;
    };
    const slideIds = new Map<string, string>();
    for (const part of captured) {
        if (!isSlideRecordSource(part.record) || (preserveSlideIds && occupied.has(part.id))) return null;
        const id = preserveSlideIds ? part.id : fresh();
        if (id === null) return null;
        slideIds.set(part.id, id);
    }
    const slides: CapturedPart[] = [];
    for (const part of captured) {
        const fields = schemas.get(part.id);
        const prepared = fields && prepareCopiedPart(part, slideIds, fields);
        if (!prepared) return null;
        slides.push(prepared);
    }
    return slides;
}
