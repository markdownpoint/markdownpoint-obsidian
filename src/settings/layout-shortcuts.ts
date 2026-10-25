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

import { isRecord, isStableId } from '../format/recognition.ts';

export const LAYOUT_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export type LayoutAssignments = Readonly<Record<string, string>>;
const defaults: LayoutAssignments = Object.fromEntries(
    ['section', 'one-liner', 'content', 'content-with-header', 'text-image', 'image-text', 'image', 'solid-color', 'blank'].map(
        (key, index) => [String(index + 1), key]
    )
);

export function readLayoutAssignments(value: unknown): LayoutAssignments {
    if (!isRecord(value)) return { ...defaults };
    const entries = Object.entries(value);
    if (
        entries.some(([digit, key]) => !/^[1-9]$/.test(digit) || !isStableId(key)) ||
        new Set(entries.map(([, key]) => key)).size !== entries.length
    )
        return { ...defaults };
    return Object.fromEntries(entries) as Record<string, string>;
}

export function assignLayoutDigit(value: LayoutAssignments, layout: string, digit: string | null): LayoutAssignments {
    if (!isStableId(layout) || (digit !== null && !/^[1-9]$/.test(digit))) return value;
    const next: Record<string, string> = {};
    for (const key of LAYOUT_DIGITS) if (key !== digit && value[key] && value[key] !== layout) next[key] = value[key];
    if (digit) next[digit] = layout;
    return next;
}

export function layoutDigit(value: LayoutAssignments, layout: string): string | null {
    return LAYOUT_DIGITS.find(digit => value[digit] === layout) ?? null;
}
