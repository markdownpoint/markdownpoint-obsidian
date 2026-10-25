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

import type { DocumentSlide } from './document.ts';
import { isRecord, isStableId } from './recognition.ts';

export interface TextSchemaTheme {
    readonly master: unknown;
    readonly layout: unknown;
    readonly layoutKey: string;
}

/** Read object types only. No geometry, styles, assets or rendering are evaluated. */
function applyTypes(types: Map<string, string>, record: Record<string, unknown>, inherits: boolean): boolean {
    const inherited = new Set(types.keys());
    if (record.overrides !== undefined) {
        if (!inherits || !isRecord(record.overrides)) return false;
        for (const [id, value] of Object.entries(record.overrides)) {
            if (!isStableId(id) || (value !== null && !isRecord(value))) return false;
            if (value === null) {
                if (types.get(id) !== 'camera' && types.get(id) !== 'world') types.delete(id);
            } else if (Object.hasOwn(value, 'type')) return false;
        }
    }
    if (record.objects === undefined) return true;
    if (!Array.isArray(record.objects)) return false;
    const seen = new Set<string>();
    for (const object of record.objects) {
        const id: unknown = typeof object === 'string' ? object : isRecord(object) ? object.id : undefined;
        if (!isStableId(id) || seen.has(id)) return false;
        seen.add(id);
        if (typeof object === 'string') {
            if (!inherits) return false;
            continue;
        }
        if (!isRecord(object) || typeof object.type !== 'string' || (isRecord(record.overrides) && Object.hasOwn(record.overrides, id)))
            return false;
        // The MarkdownPoint app keeps the inherited object when a lower level collides with its ID.
        if (!inherited.has(id)) types.set(id, object.type);
    }
    return true;
}

/** Resolve every text block's link grammar from the objects its part actually uses. */
export function copyTextSchemas(
    part: DocumentSlide,
    kind: 'slide' | 'composition',
    record: unknown,
    theme: TextSchemaTheme | null
): ReadonlyMap<string, 'rich-text' | 'table'> | null {
    if (!isRecord(record)) return null;
    const types = new Map<string, string>();
    if (kind === 'slide') {
        if (
            !theme ||
            !isRecord(theme.master) ||
            !isRecord(theme.layout) ||
            theme.master.markdownpoint !== 1 ||
            theme.master.kind !== 'master' ||
            theme.layout.markdownpoint !== 1 ||
            theme.layout.kind !== 'layout' ||
            typeof record.layout !== 'string' ||
            record.layout !== theme.layoutKey ||
            !applyTypes(types, theme.master, false) ||
            !applyTypes(types, theme.layout, true)
        )
            return null;
    }
    if (!applyTypes(types, record, kind === 'slide')) return null;
    const schemas = new Map<string, 'rich-text' | 'table'>();
    for (const block of part.blocks) {
        if (block.kind !== 'text' || block.id === null) continue;
        const type = types.get(block.id);
        // Instance controls and retained unbound blocks use rich text in the MarkdownPoint app too.
        schemas.set(block.id, type === 'table' || type === 'chart' ? 'table' : 'rich-text');
    }
    return schemas;
}
