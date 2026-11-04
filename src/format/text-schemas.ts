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
import { opensFormatVersion } from './format-version.ts';
import { isRecord, isStableId } from './recognition.ts';

export interface TextSchemaTheme {
    readonly master: unknown;
    readonly layout: unknown;
    readonly layoutKey: string;
}

/**
 * How a text block's words read: rich text, a table, or a part's own chart, a table whose value cells hold numbers in
 * its presentation's language, where a theme's chart writes them in en-US.
 */
export type TextSchema = 'rich-text' | 'table' | 'chart';

/**
 * Read object types only. No geometry, styles, assets or rendering are evaluated. Returns the IDs of the objects this
 * record adds, its own, or null when it doesn't read.
 */
function applyTypes(types: Map<string, string>, record: Record<string, unknown>, inherits: boolean): Set<string> | null {
    const inherited = new Set(types.keys());
    const own = new Set<string>();
    if (record.overrides !== undefined) {
        if (!inherits || !isRecord(record.overrides)) return null;
        for (const [id, value] of Object.entries(record.overrides)) {
            if (!isStableId(id) || (value !== null && !isRecord(value))) return null;
            if (value === null) {
                if (types.get(id) !== 'camera' && types.get(id) !== 'world') types.delete(id);
            } else if (Object.hasOwn(value, 'type')) return null;
        }
    }
    if (record.objects === undefined) return own;
    if (!Array.isArray(record.objects)) return null;
    const seen = new Set<string>();
    for (const object of record.objects) {
        const id: unknown = typeof object === 'string' ? object : isRecord(object) ? object.id : undefined;
        if (!isStableId(id) || seen.has(id)) return null;
        seen.add(id);
        if (typeof object === 'string') {
            if (!inherits) return null;
            continue;
        }
        if (!isRecord(object) || typeof object.type !== 'string' || (isRecord(record.overrides) && Object.hasOwn(record.overrides, id)))
            return null;
        // The MarkdownPoint app keeps the inherited object when a lower level collides with its ID.
        if (!inherited.has(id)) {
            types.set(id, object.type);
            own.add(id);
        }
    }
    return own;
}

/** Resolve how every text block's words read, its link grammar among it, from the objects its part actually uses. */
export function copyTextSchemas(
    part: DocumentSlide,
    kind: 'slide' | 'composition',
    record: unknown,
    theme: TextSchemaTheme | null
): ReadonlyMap<string, TextSchema> | null {
    if (!isRecord(record)) return null;
    const types = new Map<string, string>();
    if (kind === 'slide') {
        if (
            !theme ||
            !isRecord(theme.master) ||
            !isRecord(theme.layout) ||
            !opensFormatVersion(theme.master.markdownpoint) ||
            theme.master.kind !== 'master' ||
            !opensFormatVersion(theme.layout.markdownpoint) ||
            theme.layout.kind !== 'layout' ||
            typeof record.layout !== 'string' ||
            record.layout !== theme.layoutKey ||
            !applyTypes(types, theme.master, false) ||
            !applyTypes(types, theme.layout, true)
        )
            return null;
    }
    const own = applyTypes(types, record, kind === 'slide');
    if (!own) return null;
    const schemas = new Map<string, TextSchema>();
    for (const block of part.blocks) {
        if (block.kind !== 'text' || block.id === null) continue;
        const type = types.get(block.id);
        // Instance controls and retained unbound blocks use rich text in the MarkdownPoint app too.
        schemas.set(
            block.id,
            type === 'chart' && own.has(block.id) ? 'chart' : type === 'table' || type === 'chart' ? 'table' : 'rich-text'
        );
    }
    return schemas;
}
