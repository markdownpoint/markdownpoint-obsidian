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

import type { SlideStructure } from '../format/structure.ts';
import type { PresentationDocument } from '../format/document.ts';
import type { ListSelection } from '../selection/list-selection.ts';
import { textBindingName } from '../format/text-binding.ts';
import { sectionName, slideName } from '../readers/markdownpoint-readers.js';

export interface OutlineSlide {
    readonly id: string;
    readonly title: string;
    readonly line: number;
    readonly skipped: boolean;
    readonly structure?: SlideStructure | null;
}

export interface OutlineSection {
    readonly id: string;
    readonly title: string;
    readonly line: number;
}

/** A verified format adapter supplies this view model; the outline never discovers files itself. */
export interface OutlinePresentation {
    readonly id: string;
    readonly path: string;
    readonly slides: readonly OutlineSlide[];
    readonly sections: readonly OutlineSection[];
}

export interface OutlineState {
    readonly presentation: OutlinePresentation | null;
    readonly activeSlideId: string | null;
    readonly selection: ListSelection<string>;
}

/** Prefer authored Title text, then the first other text; notes never supply labels. */
export function outlineSlides(
    markdown: string,
    document: PresentationDocument,
    emptyTitle: string,
    skipped: ReadonlySet<string>
): OutlineSlide[] {
    return document.slides.map(slide => {
        let title = '';
        const text = slide.blocks.filter(block => block.kind === 'text');
        const titles = new Set(text.filter(block => block.id && textBindingName(block.id).name === 'title'));
        const blocks = [...titles, ...text.filter(block => !titles.has(block))];
        for (const block of blocks) {
            // As MarkdownPoint's slide list names a slide: the first line its words show.
            title = slideName(markdown.slice(block.contentFrom, block.to));
            if (title) break;
        }
        return { id: slide.id, title: title || emptyTitle, line: slide.line, skipped: skipped.has(slide.id) };
    });
}

/** Editable headings may be temporarily empty; that does not change slide structure. */
export function outlineSections(markdown: string, document: PresentationDocument): OutlineSection[] {
    const sections: OutlineSection[] = [];
    for (const section of document.sections) {
        // MarkdownPoint refuses a heading line with a comment, a paragraph id's included, or a tag: it names no section.
        sections.push({ id: section.id, title: sectionName(markdown.slice(section.markerTo, section.headingTo)), line: section.line });
    }
    return sections;
}

export interface OutlineRow {
    readonly kind: 'slide' | 'section';
    readonly id: string;
    readonly label: string;
}

/** Section headers never take a slide number; a skipped slide keeps its own, in parentheses, as MarkdownPoint's slide list shows it. */
export function outlineRows(presentation: OutlinePresentation, formatNumber: (number: number) => string): OutlineRow[] {
    const numbers = outlineSlideNumbers(presentation.slides, formatNumber);
    const slides = presentation.slides.map(slide => ({
        kind: 'slide' as const,
        id: slide.id,
        line: slide.line,
        label: `${numbers.get(slide.id)}${slide.skipped ? '' : '.'} ${slide.title}`
    }));
    const sections = presentation.sections.map(section => ({
        kind: 'section' as const,
        id: section.id,
        line: section.line,
        label: section.title
    }));
    return [...slides, ...sections].sort((a, b) => a.line - b.line);
}

export function outlineSlideNumbers(
    slides: readonly OutlineSlide[],
    formatNumber: (number: number) => string
): ReadonlyMap<string, string> {
    return new Map(slides.map((slide, index) => [slide.id, slide.skipped ? `(${formatNumber(index + 1)})` : formatNumber(index + 1)]));
}
