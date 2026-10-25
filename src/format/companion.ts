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

import { applyEdits, parseTree } from 'jsonc-parser';
import type { Edit, Node, ParseError } from 'jsonc-parser';

export type CompanionMap = 'slides' | 'compositions';

function objectTree(source: string): Node | null {
    const errors: ParseError[] = [];
    const tree = parseTree(source, errors, { disallowComments: true, allowTrailingComma: false });
    return !errors.length && tree?.type === 'object' ? tree : null;
}

export function isSlideRecordSource(source: string): boolean {
    return objectTree(source) !== null;
}

/** Update only known navigation/reference values, retaining every other source byte. */
export function remapRecordReferences(
    source: string,
    slides: ReadonlyMap<string, string>,
    compositions: ReadonlyMap<string, string>
): string | null {
    const root = objectTree(source);
    if (!root) return null;
    // Match JSON's last-value semantics without serializing its unknown numbers,
    // properties or escapes. The original property spelling is never replaced.
    const field = (object: Node | undefined, name: string): Node | undefined =>
        object?.type === 'object'
            ? object.children?.filter(property => property.children?.[0]?.value === name).at(-1)?.children?.[1]
            : undefined;
    const edits: Edit[] = [];
    const replace = (node: Node | undefined, ids: ReadonlyMap<string, string>, prefix = ''): void => {
        const value: unknown = node?.value;
        if (!node || node.type !== 'string' || typeof value !== 'string' || !value.startsWith(prefix)) return;
        const next = ids.get(value.slice(prefix.length));
        if (next !== undefined && prefix + next !== value)
            edits.push({ offset: node.offset, length: node.length, content: JSON.stringify(prefix + next) });
    };
    const objects = field(root, 'objects');
    if (objects?.type === 'array')
        for (const object of objects.children ?? []) {
            replace(field(object, 'link'), slides, 'slide:');
            if (field(object, 'type')?.value === 'composition') replace(field(object, 'source'), compositions);
        }
    const overrides = field(root, 'overrides');
    if (overrides?.type === 'object') {
        const effective = new Map<unknown, Node | undefined>();
        for (const property of overrides.children ?? []) effective.set(property.children?.[0]?.value, property.children?.[1]);
        for (const override of effective.values()) replace(field(override, 'link'), slides, 'slide:');
    }
    return applyEdits(source, edits);
}

/** Complete record source keeps unknown properties, escapes and number precision. */
export class CompanionDocument {
    readonly records: ReadonlyMap<string, string>;
    private readonly source: string;
    private readonly map: Node;
    private readonly properties: readonly Node[];
    private readonly names: readonly string[];

    private constructor(source: string, map: Node, properties: readonly Node[], names: readonly string[]) {
        this.source = source;
        this.map = map;
        this.properties = properties;
        this.names = names;
        this.records = new Map(
            properties.map((property, index) => {
                const value = property.children![1]!;
                return [names[index]!, source.slice(value.offset, value.offset + value.length)];
            })
        );
    }

    static read(source: string, mapName: CompanionMap = 'slides'): CompanionDocument | null {
        const root = objectTree(source);
        const maps = root?.children?.filter(property => property.children?.[0]?.value === mapName);
        const map = maps?.length === 1 ? maps[0]?.children?.[1] : undefined;
        if (map?.type !== 'object') return null;
        const properties = map.children ?? [];
        const names: string[] = [];
        for (const property of properties) {
            const name: unknown = property.children?.[0]?.value;
            if (typeof name !== 'string' || property.children?.[1]?.type !== 'object') return null;
            names.push(name);
        }
        return new Set(names).size === names.length ? new CompanionDocument(source, map, properties, names) : null;
    }

    /** Prepare an absent map without overwriting a malformed or duplicate one. */
    static ensure(source: string, mapName: CompanionMap): CompanionDocument | null {
        const existing = CompanionDocument.read(source, mapName);
        if (existing) return existing;
        const root = objectTree(source);
        if (!root || root.children?.some(property => property.children?.[0]?.value === mapName)) return null;
        const first = root.children?.[0],
            last = root.children?.at(-1);
        const gap = first ? source.slice(root.offset + 1, first.offset) || ' ' : ' ';
        const changed = applyEdits(source, [
            {
                offset: last ? last.offset + last.length : root.offset + 1,
                length: 0,
                content: (last ? ',' : '') + gap + JSON.stringify(mapName) + ': {}'
            }
        ]);
        return CompanionDocument.read(changed, mapName);
    }

    /** Null removes a record. A string inserts/replaces its complete JSON object. */
    change(updates: ReadonlyMap<string, string | null>): string | null {
        for (const value of updates.values()) if (value !== null && !objectTree(value)) return null;
        const edits: Edit[] = [];
        const { properties, names, source } = this;
        let remaining = properties.length;
        for (let index = 0; index < properties.length;) {
            const update = updates.get(names[index]!);
            if (update !== null) {
                if (update !== undefined && update !== this.records.get(names[index]!)) {
                    const value = properties[index]!.children![1]!;
                    edits.push({ offset: value.offset, length: value.length, content: update });
                }
                index++;
                continue;
            }
            const start = index;
            while (index < properties.length && updates.get(names[index]!) === null) index++;
            remaining -= index - start;
            const previous = properties[start - 1],
                last = properties[index - 1]!;
            const from = index === properties.length && previous ? previous.offset + previous.length : properties[start]!.offset;
            const to = properties[index]?.offset ?? last.offset + last.length;
            edits.push({ offset: from, length: to - from, content: '' });
        }
        const added = [...updates].filter(([id, value]) => value !== null && !this.records.has(id));
        if (added.length) {
            const last = properties.at(-1);
            const gap = properties[0] ? source.slice(this.map.offset + 1, properties[0].offset) || ' ' : ' ';
            const content = added.map(([id, value]) => `${JSON.stringify(id)}: ${value}`).join(',' + gap);
            edits.push({
                offset: last ? last.offset + last.length : this.map.offset + 1,
                length: 0,
                content: (remaining ? ',' + gap : '') + content
            });
        }
        return applyEdits(source, edits);
    }
}

export interface ReconciledSlideRecords {
    readonly companion: string;
    readonly remembered: ReadonlyMap<string, string>;
}

/** Only explicitly managed records follow markers of their own kind through native undo. */
export function reconcileSlideRecords(
    companion: string,
    remembered: ReadonlyMap<string, string>,
    present: ReadonlySet<string>,
    mapName: CompanionMap = 'slides'
): ReconciledSlideRecords | null {
    const document = mapName === 'compositions' ? CompanionDocument.ensure(companion, mapName) : CompanionDocument.read(companion, mapName);
    if (!document) return null;
    const next = new Map(remembered);
    const changes = new Map<string, string | null>();
    for (const [id, saved] of remembered) {
        const current = document.records.get(id);
        if (current !== undefined) next.set(id, current);
        if (!present.has(id)) {
            if (current !== undefined) changes.set(id, null);
        } else if (current === undefined) changes.set(id, saved);
    }
    const changed = changes.size ? document.change(changes) : companion;
    return changed === null ? null : { companion: changed, remembered: next };
}
