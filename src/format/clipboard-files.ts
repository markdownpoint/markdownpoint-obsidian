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

import { applyEdits, findNodeAtLocation, parseTree } from 'jsonc-parser';
import type { Edit } from 'jsonc-parser';
import type { CapturedPart } from './capture.ts';
import { isPresentationFilePath } from './file-paths.ts';
import { readJsonObject } from './json.ts';
import { isRecord } from './recognition.ts';

const mediaExtension = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp|mp4|m4v|mov|webm|ogv|mp3|m4a|wav|ogg|flac|glb)$/i;

/** Only presentation-owned media paths may authorize a cross-presentation file read. */
export function isPresentationMediaPath(value: string): boolean {
    return mediaExtension.test(value) && isPresentationFilePath(value);
}

interface Location {
    readonly path: readonly (string | number)[];
    readonly value: string;
}
export interface ClipboardFiles {
    readonly files: readonly string[];
    remap(names: ReadonlyMap<string, string>): readonly CapturedPart[] | null;
}

/** Record paths keep ordinary words, links, unknown metadata and numeric source precision untouched. */
export function planClipboardFiles(captured: readonly CapturedPart[]): ClipboardFiles | null {
    const files = new Set<string>();
    const edits = new Map<CapturedPart, { offset: number; length: number; value: string }[]>();
    for (const part of captured) {
        const record = readJsonObject(part.record);
        const tree = parseTree(part.record);
        if (!record || !tree) return null;
        const locations: Location[] = [];
        const add = (value: unknown, path: readonly (string | number)[]) => {
            if (typeof value === 'string' && value !== '') locations.push({ path, value });
        };
        const nested = (value: unknown, name: string): unknown => (isRecord(value) ? value[name] : undefined);
        // A restyle's original comes with its picture, as MarkdownPoint brings it, so Remove Restyle shows it again.
        const backgroundImage = nested(record.background, 'image');
        if (isRecord(backgroundImage)) {
            add(backgroundImage.file, ['background', 'image', 'file']);
            add(backgroundImage['restyled-from'], ['background', 'image', 'restyled-from']);
        }
        const objects: [Record<string, unknown>, (string | number)[]][] = [];
        if (Array.isArray(record.objects))
            record.objects.forEach((object: unknown, index) => {
                if (isRecord(object)) objects.push([object, ['objects', index]]);
            });
        if (isRecord(record.overrides))
            for (const [id, object] of Object.entries(record.overrides)) if (isRecord(object)) objects.push([object, ['overrides', id]]);
        for (const [object, base] of objects) {
            add(object.file, [...base, 'file']);
            add(object.poster, [...base, 'poster']);
            add(object['restyled-from'], [...base, 'restyled-from']);
            add(nested(object.model, 'file'), [...base, 'model', 'file']);
        }
        const replacements: { offset: number; length: number; value: string }[] = [];
        for (const location of locations) {
            if (!isPresentationMediaPath(location.value)) return null;
            const node = findNodeAtLocation(tree, [...location.path]);
            if (!node || node.type !== 'string' || node.value !== location.value) return null;
            files.add(location.value);
            replacements.push({ offset: node.offset, length: node.length, value: location.value });
        }
        edits.set(part, replacements);
    }
    return {
        files: [...files],
        remap: names => {
            if ([...files].some(file => !isPresentationMediaPath(names.get(file) ?? ''))) return null;
            const changed = (part: CapturedPart): CapturedPart => {
                const changes: Edit[] = edits
                    .get(part)!
                    .filter(edit => names.get(edit.value) !== edit.value)
                    .map(edit => ({ offset: edit.offset, length: edit.length, content: JSON.stringify(names.get(edit.value)!) }));
                return { ...part, record: changes.length ? applyEdits(part.record, changes) : part.record };
            };
            return captured.map(changed);
        }
    };
}
