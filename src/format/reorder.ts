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

import { gatheredOrder, steppedOrder } from '../selection/list-selection.ts';
import { indexPresentation } from './document.ts';
import type { PresentationDocument } from './document.ts';
import { terminateSourceBlock } from './payload.ts';

export interface SourceChange {
    readonly from: number;
    readonly to: number;
    readonly insert: string;
    readonly document: PresentationDocument;
}

export type SlideDropTarget =
    { readonly kind: 'slide'; readonly id: string; readonly edge: 'before' | 'after' } | { readonly kind: 'section'; readonly id: string };

export type SlideReorder =
    { readonly kind: 'step'; readonly direction: 'up' | 'down' } | { readonly kind: 'drop'; readonly target: SlideDropTarget };

/**
 * Plan one Markdown replacement from the current shared source index. Complete
 * slide slices carry every field, note, and unknown word. The companion is not
 * part of ordering. A section start is one step; the first section stays first.
 */
export function reorderSlideSource(
    markdown: string,
    document: PresentationDocument,
    slideIds: Iterable<string>,
    action: SlideReorder
): SourceChange | null {
    const chosen = new Set(slideIds);
    const known = new Set(document.slides.map(slide => slide.id));
    if (!chosen.size || [...chosen].some(id => !known.has(id))) return null;
    const blocks = [
        ...document.slides.map(slide => ({ kind: 'slide' as const, id: slide.id, from: slide.from, to: slide.to })),
        ...document.sections.map(section => ({ kind: 'section' as const, id: section.id, from: section.from, to: section.to }))
    ].sort((a, b) => a.from - b.from);
    if (
        !blocks.length ||
        (document.sections.length > 0 && blocks[0]!.kind !== 'section') ||
        blocks.some((block, index) => index > 0 && blocks[index - 1]!.to !== block.from)
    )
        return null;
    const selected = blocks.filter(block => block.kind === 'slide' && chosen.has(block.id));
    const target =
        action.kind === 'drop' ? blocks.find(block => block.kind === action.target.kind && block.id === action.target.id) : undefined;
    const next =
        action.kind === 'step'
            ? steppedOrder(blocks, blocks[0]!.kind === 'section' ? blocks.slice(1) : blocks, selected, action.direction)
            : target
              ? gatheredOrder(blocks, selected, target, action.target.kind === 'section' ? 'after' : action.target.edge)
              : null;
    if (!next || (blocks[0]!.kind === 'section' && next[0] !== blocks[0])) return null;
    let first = 0;
    let last = blocks.length - 1;
    while (next[first] === blocks[first]) first++;
    while (next[last] === blocks[last]) last--;
    const from = blocks[first]!.from;
    const to = blocks[last]!.to;
    const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
    const insert = next
        .slice(first, last + 1)
        .map((block, index) => {
            const raw = markdown.slice(block.from, block.to);
            const followed = first + index < next.length - 1 || to < markdown.length;
            return followed ? terminateSourceBlock(raw, newline) : raw;
        })
        .join('');
    const proposed = markdown.slice(0, from) + insert + markdown.slice(to);
    // In particular, a final unfinished code fence cannot swallow a slide when
    // moved earlier. Validate once per explicit move, never during idle rendering.
    const indexed = indexPresentation(proposed, blocks[0]!.from);
    if (
        !indexed ||
        indexed.slides.map(slide => slide.id).join('\n') !==
            next
                .filter(block => block.kind === 'slide')
                .map(block => block.id)
                .join('\n') ||
        indexed.sections.map(section => section.id).join('\n') !== document.sections.map(section => section.id).join('\n')
    )
        return null;
    return { from, to, insert, document: indexed };
}
