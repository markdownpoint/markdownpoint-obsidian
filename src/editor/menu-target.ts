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

import { slideAtPosition } from '../format/document.ts';
import type { DocumentSlide, PresentationDocument } from '../format/document.ts';

/** Draft margins target the nearest slide; section contents do not. */
export function slideForMenu(document: PresentationDocument, position: number, markdown: string, bodyStart = 0): DocumentSlide | null {
    const first = document.slides[0];
    if (!first || position < bodyStart || position > markdown.length) return null;
    if (document.sections.some(section => position >= section.from && position < section.to)) return null;
    if (position < first.from) return markdown.slice(bodyStart, first.from).trim() === '' ? first : null;
    const last = document.slides.at(-1)!;
    if (position === markdown.length && last.to === markdown.length) return last;
    return slideAtPosition(document, position);
}

/**
 * The slide the gap above a slide's rule belongs to: the preceding one. The gap at the draft's top and one after a
 * section's heading, which no slide precedes, stay the slide's own.
 */
export function slideForGap(document: PresentationDocument, slide: DocumentSlide, markdown: string, bodyStart = 0): DocumentSlide {
    return (slide.from > bodyStart ? slideForMenu(document, slide.from - 1, markdown, bodyStart) : null) ?? slide;
}

/** Whether a point at `y` on a slide's boundary stands in the gap above its rule. */
export function aboveRule(boundary: HTMLElement, y: number): boolean {
    const number = boundary.querySelector('.markdownpoint-slide-number');
    return number !== null && y < number.getBoundingClientRect().top;
}
