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

import { isRecord } from './recognition.ts';

// Keys spelled differently before format 1.0, inside an object and inside its nested values.
// The MarkdownPoint app refuses a file that still holds one, so the plugin reads no theme document and copies or
// restores no record that does.
const NESTED: Readonly<Record<string, string>> = { 'image-result': 'source', model: 'asset', bind: 'asset' };

/** Whether an object or override still holds a key in the words before 1.0: `asset`, or a composition's `source`. */
function objectHoldsOldWords(object: Record<string, unknown>): boolean {
    if (Object.hasOwn(object, 'asset')) return true;
    if (object.type === 'composition' && Object.hasOwn(object, 'source')) return true;
    return Object.entries(NESTED).some(([key, name]) => {
        const value = object[key];
        return isRecord(value) && Object.hasOwn(value, name);
    });
}

/** Whether a background's image result still names its picture's original as `source`. */
function backgroundHoldsOldWords(background: unknown): boolean {
    const result = isRecord(background) ? background['image-result'] : undefined;
    return isRecord(result) && Object.hasOwn(result, 'source');
}

/**
 * Whether a slide or composition record, or a theme's master or layout, still holds a key in the words before 1.0, in its
 * background, its objects or its overrides.
 */
export function holdsOldWords(document: Record<string, unknown>): boolean {
    const own: readonly unknown[] = Array.isArray(document.objects) ? document.objects : [];
    const overrides: readonly unknown[] = isRecord(document.overrides) ? Object.values(document.overrides) : [];
    return (
        backgroundHoldsOldWords(document.background) ||
        [...own, ...overrides].some(object => isRecord(object) && objectHoldsOldWords(object))
    );
}
