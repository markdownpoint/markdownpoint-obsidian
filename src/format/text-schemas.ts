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

/**
 * How a text block's words read: rich text, a table, or a part's own chart, a table whose value cells hold numbers in
 * its presentation's language, where a theme's chart writes them in en-US.
 */
export type TextSchema = 'rich-text' | 'table' | 'chart';

/**
 * How each block of a part reads, by its kind and id (`blockField`): the grammars its words are read in, each in turn.
 * A composition's text control can be shown by a table and a text at once, and its words then read as each.
 */
export type PartTextSchemas = ReadonlyMap<string, readonly TextSchema[]>;

/** A block's key among its part's blocks, its kind and id, such as `text:body`, `control:caption` or `notes:`. */
export function blockField(block: Pick<DocumentBlock, 'kind' | 'id'>): string {
    return `${block.kind}:${block.id ?? ''}`;
}

/**
 * How each composition's text controls' words read, by the composition's id and the control's: as each member bound to
 * show them reads its own words, a table's as a table, or as rich text when no member shows them. A chart's words can't
 * be a control's, and only a part's own chart reads its cells by its presentation's language.
 */
export type ControlTextSchemas = ReadonlyMap<string, ReadonlyMap<string, readonly TextSchema[]>>;

export function controlTextSchemas(definitions: ReadonlyMap<string, Record<string, unknown>>): ControlTextSchemas {
    const schemas = new Map<string, ReadonlyMap<string, readonly TextSchema[]>>();
    for (const [id, record] of definitions) {
        const controls = new Map<string, TextSchema[]>();
        for (const control of Array.isArray(record.controls) ? record.controls : [])
            if (isRecord(control) && control.type === 'text' && typeof control.id === 'string') controls.set(control.id, []);
        for (const member of Array.isArray(record.objects) ? record.objects : []) {
            const name = isRecord(member) && isRecord(member.bindings) ? member.bindings.text : undefined;
            const shown = typeof name === 'string' ? controls.get(name) : undefined;
            const schema = isRecord(member) && (member.type === 'table' || member.type === 'chart') ? 'table' : 'rich-text';
            if (shown && !shown.includes(schema)) shown.push(schema);
        }
        schemas.set(id, new Map([...controls].map(([name, shown]) => [name, shown.length ? shown : RICH_TEXT])));
    }
    return schemas;
}

const RICH_TEXT: readonly TextSchema[] = ['rich-text'];

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
 * Resolve how every block's words read, its link grammar among it: an object's from the objects its part actually uses,
 * a composition's text control's, its default and an instance's value, from the members bound to show it, and notes as
 * rich text.
 */
export function copyTextSchemas(
    part: DocumentSlide,
    kind: 'slide' | 'composition',
    record: unknown,
    theme: TextSchemaTheme | null,
    controls: ControlTextSchemas
): PartTextSchemas | null {
    if (!isRecord(record)) return null;
    const types = new Map<string, string>();
    if (kind === 'slide') {
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
            !applyTypes(types, theme.layout, true)
        )
            return null;
    }
    const own = applyTypes(types, record, kind === 'slide');
    if (!own) return null;
    // The composition each of the part's instances places, by the instance's id, for the words it gives its controls.
    const placed = new Map<string, string>();
    for (const object of Array.isArray(record.objects) ? record.objects : [])
        if (isRecord(object) && object.type === 'instance' && typeof object.id === 'string' && typeof object.composition === 'string')
            placed.set(object.id, object.composition);
    const schemasOf = (block: DocumentBlock): readonly TextSchema[] => {
        if (block.kind === 'notes' || block.id === null) return RICH_TEXT;
        if (block.kind === 'control') return controls.get(part.id)?.get(block.id) ?? RICH_TEXT;
        const [id = '', control] = block.id.split('.');
        if (control !== undefined) {
            const composition = placed.get(id);
            return (composition === undefined ? undefined : controls.get(composition)?.get(control)) ?? RICH_TEXT;
        }
        // Retained unbound blocks use rich text in the MarkdownPoint app too.
        const type = types.get(id);
        return [type === 'chart' && own.has(id) ? 'chart' : type === 'table' || type === 'chart' ? 'table' : 'rich-text'];
    };
    return new Map(part.blocks.map(block => [blockField(block), schemasOf(block)]));
}
