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

import { Annotation } from '@codemirror/state';
import type { Transaction } from '@codemirror/state';

/** Only explicit, validated slide operations use this annotation. */
export const slideStructureChange = Annotation.define<boolean>();

export interface BoundaryRange {
    readonly from: number;
    readonly markerTo: number;
}

/** Reject the whole edit when any change crosses or enters a structural marker. */
export function boundaryChangesAllowed(transaction: Transaction, markers: readonly BoundaryRange[]): boolean {
    if (transaction.annotation(slideStructureChange) === true) return true;
    // Obsidian reloads files through unannotated editor transactions. Protect
    // user input, deletion and movement while allowing those native reloads.
    if (!['input', 'delete', 'move'].some(event => transaction.isUserEvent(event))) return true;
    let allowed = true;
    transaction.changes.iterChangedRanges((from, to) => {
        for (const marker of markers) {
            const start = Math.max(0, marker.from - 1);
            if (
                from === to ? (from > start && from < marker.markerTo) || (start === 0 && from === 0) : from < marker.markerTo && to > start
            ) {
                allowed = false;
                break;
            }
        }
    });
    return allowed;
}
