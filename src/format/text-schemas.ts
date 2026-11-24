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

import type { DocumentBlock, DocumentSlide } from './document.ts';
import { opensFormatVersion } from './format-version.ts';
import { isRecord, isStableId } from './recognition.ts';

export interface TextSchemaTheme {
    readonly master: unknown;
    readonly layout: unknown;
    readonly layoutKey: string;
}

/** How a text block's words read: rich text, or a table, which a table's and a chart's words are. */
export type TextSchema = 'rich-text' | 'table';

/** How each block of a slide reads, by its kind and id (`blockField`): the grammar its words are read in. */
export type PartTextSchemas = ReadonlyMap<string, TextSchema>;

/** A block's key among its slide's blocks, its kind and id, such as `text:body` or `notes:`. */
export function blockField(block: Pick<DocumentBlock, 'kind' | 'id'>): string {
    return `${block.kind}:${block.id ?? ''}`;
}

/**
 * Read object types only. No geometry, styles, files or rendering are evaluated. Returns the IDs of the objects this
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

/**
 * Resolve how every block's words read, its link grammar among it: an object's from the objects its slide actually
 * uses, and notes as rich text.
 */
export function copyTextSchemas(slide: DocumentSlide, record: unknown, theme: TextSchemaTheme | null): PartTextSchemas | null {
    if (!isRecord(record)) return null;
    const types = new Map<string, string>();
    if (
        !theme ||
        !isRecord(theme.master) ||
        !isRecord(theme.layout) ||
        !opensFormatVersion(theme.master.markdownpoint) ||
        theme.master.type !== 'master' ||
        !opensFormatVersion(theme.layout.markdownpoint) ||
        theme.layout.type !== 'layout' ||
        typeof record.layout !== 'string' ||
        record.layout !== theme.layoutKey ||
        !applyTypes(types, theme.master, false) ||
        !applyTypes(types, theme.layout, true) ||
        !applyTypes(types, record, true)
    )
        return null;
    const schemaOf = (block: DocumentBlock): TextSchema => {
        if (block.kind === 'notes' || block.id === null) return 'rich-text';
        // Retained unbound blocks use rich text in the MarkdownPoint app too.
        const type = types.get(block.id);
        return type === 'table' || type === 'chart' ? 'table' : 'rich-text';
    };
    return new Map(slide.blocks.map(block => [blockField(block), schemaOf(block)]));
}
