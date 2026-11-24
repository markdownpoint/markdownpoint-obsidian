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

import { CompanionDocument } from './companion.ts';
import type { PresentationDocument } from './document.ts';

/** Unchanged source, before destination identities or links are prepared. */
export interface CapturedPart {
    readonly id: string;
    readonly markdown: string;
    readonly record: string;
}

/** Capture whole slide source in document order. */
export function captureSlides(
    markdown: string,
    document: PresentationDocument,
    companion: string,
    ids: Iterable<string>
): readonly CapturedPart[] | null {
    const selected = new Set(ids);
    const ordered = document.slides.filter(slide => selected.has(slide.id));
    if (!selected.size || ordered.length !== selected.size) return null;
    const data = CompanionDocument.read(companion);
    if (!data) return null;
    const slides: CapturedPart[] = [];
    for (const slide of ordered) {
        const record = data.records.get(slide.id);
        if (record === undefined) return null;
        slides.push({ id: slide.id, markdown: markdown.slice(slide.from, slide.to), record });
    }
    return slides;
}
