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

const NS = 'http://www.w3.org/2000/svg';

/** A quiet source schematic, shared by the outline and editor controls. */
export function renderThumbnail(container: HTMLElement, structure: SlideStructure | null | undefined): void {
    const key = structure?.key ?? '';
    if (container.dataset.structure === key) return;
    container.dataset.structure = key;
    container.empty();
    container.toggleClass('is-unavailable', !structure);
    if (!structure) return;
    const document = container.ownerDocument,
        svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${structure.width} ${structure.height}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    for (const region of structure.regions) {
        const group = document.createElementNS(NS, 'g');
        group.setAttribute('transform', `rotate(${region.rotation} ${region.x + region.width / 2} ${region.y + region.height / 2})`);
        const width = (region.width - region.gutter * (region.columns - 1)) / region.columns;
        for (let column = 0; column < region.columns; column++) {
            const rect = document.createElementNS(NS, 'rect');
            for (const [name, value] of Object.entries({
                x: region.x + column * (width + region.gutter),
                y: region.y,
                width,
                height: region.height
            }))
                rect.setAttribute(name, String(value));
            rect.setAttribute('class', `markdownpoint-thumbnail-region is-${region.kind}`);
            group.append(rect);
        }
        svg.append(group);
    }
    container.append(svg);
}
