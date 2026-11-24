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

/**
 * A JSON object's tree, its nodes at their offsets in `source`. A companion may start with a byte order mark, which
 * MarkdownPoint reads past and the tree leaves where it is.
 */
function objectTree(source: string, companion = false): Node | null {
    const errors: ParseError[] = [];
    const tree = parseTree(source, errors, { disallowComments: true, allowTrailingComma: false });
    const bom = companion && source.charCodeAt(0) === 0xfeff;
    return errors.every(error => bom && error.offset === 0 && error.length === 1) && tree?.type === 'object' ? tree : null;
}

export function isSlideRecordSource(source: string): boolean {
    return objectTree(source) !== null;
}

/** Update only known navigation/reference values, retaining every other source byte. */
export function remapRecordReferences(source: string, slides: ReadonlyMap<string, string>): string | null {
    const root = objectTree(source);
    if (!root) return null;
    // Match JSON's last-value semantics without serializing its unknown numbers,
    // properties or escapes. The original property spelling is never replaced.
    const field = (object: Node | undefined, name: string): Node | undefined =>
        object?.type === 'object'
            ? object.children?.filter(property => property.children?.[0]?.value === name).at(-1)?.children?.[1]
            : undefined;
    const edits: Edit[] = [];
    // A link names a slide as `slide:` and its id.
    const replace = (node: Node | undefined): void => {
        const value: unknown = node?.value;
        if (!node || node.type !== 'string' || typeof value !== 'string' || !value.startsWith('slide:')) return;
        const next = slides.get(value.slice('slide:'.length));
        if (next !== undefined && `slide:${next}` !== value)
            edits.push({ offset: node.offset, length: node.length, content: JSON.stringify(`slide:${next}`) });
    };
    const objects = field(root, 'objects');
    if (objects?.type === 'array') for (const object of objects.children ?? []) replace(field(object, 'link'));
    const overrides = field(root, 'overrides');
    if (overrides?.type === 'object') {
        const effective = new Map<unknown, Node | undefined>();
        for (const property of overrides.children ?? []) effective.set(property.children?.[0]?.value, property.children?.[1]);
        for (const override of effective.values()) replace(field(override, 'link'));
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

    static read(source: string): CompanionDocument | null {
        const root = objectTree(source, true);
        const maps = root?.children?.filter(property => property.children?.[0]?.value === 'slides');
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
            const previous = properties[start - 1];
            const last = properties[index - 1]!;
            const from = index === properties.length && previous ? previous.offset + previous.length : properties[start]!.offset;
            const to = properties[index]?.offset ?? last.offset + last.length;
            edits.push({ offset: from, length: to - from, content: '' });
        }
        // MarkdownPoint writes a map's records in the order of their ids (`<`), so an added record, as Undo of a delete
        // puts one back, goes before the first record left whose id follows its own, else after the last.
        const added = [...updates]
            .filter((entry): entry is [string, string] => entry[1] !== null && !this.records.has(entry[0]))
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        const gap = properties[0] ? source.slice(this.map.offset + 1, properties[0].offset) || ' ' : ' ';
        const kept = properties.flatMap((property, index) =>
            updates.get(names[index]!) === null ? [] : [{ property, name: names[index]! }]
        );
        const before = new Map<Node, string[]>();
        const after: string[] = [];
        // In id order, the first record left that follows an added one never comes earlier than the last one's did.
        let next = 0;
        for (const [id, value] of added) {
            while (next < kept.length && !(id < kept[next]!.name)) next++;
            const entry = `${JSON.stringify(id)}: ${value}`;
            const at = kept[next]?.property;
            if (!at) after.push(entry);
            else if (before.has(at)) before.get(at)!.push(entry);
            else before.set(at, [entry]);
        }
        for (const [at, entries] of before) edits.push({ offset: at.offset, length: 0, content: entries.join(',' + gap) + ',' + gap });
        if (after.length) {
            const last = properties.at(-1);
            edits.push({
                offset: last ? last.offset + last.length : this.map.offset + 1,
                length: 0,
                content: (remaining ? ',' + gap : '') + after.join(',' + gap)
            });
        }
        return applyInOnePass(source, edits);
    }
}

/**
 * Edits that never overlap, applied in one pass over the source: a large paste places records between many others, and
 * applying each edit to the whole text, as `applyEdits` does, rebuilds the companion once per place. At one offset, an
 * insertion goes before a removal, as `applyEdits` orders them.
 */
function applyInOnePass(source: string, edits: readonly Edit[]): string {
    const sorted = [...edits].sort((a, b) => a.offset - b.offset || a.length - b.length);
    let text = '';
    let at = 0;
    for (const edit of sorted) {
        text += source.slice(at, edit.offset) + edit.content;
        at = edit.offset + edit.length;
    }
    return text + source.slice(at);
}

export interface ReconciledSlideRecords {
    readonly companion: string;
    readonly remembered: ReadonlyMap<string, string>;
}

/** Only explicitly managed records follow their slides' markers through native undo. */
export function reconcileSlideRecords(
    companion: string,
    remembered: ReadonlyMap<string, string>,
    present: ReadonlySet<string>
): ReconciledSlideRecords | null {
    const document = CompanionDocument.read(companion);
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
