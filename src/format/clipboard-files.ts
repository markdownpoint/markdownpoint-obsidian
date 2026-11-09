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
import type { CapturedPart, CapturedSlides } from './capture.ts';
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
    /**
     * Each generation record the slides' pictures name, by its id, with the file of the picture it made: it comes beside
     * that picture's copy, naming it, as MarkdownPoint brings a record with a pasted picture.
     */
    readonly records: ReadonlyMap<string, string>;
    remap(names: ReadonlyMap<string, string>): CapturedSlides | null;
}

/** A generation record's id, the lowercase UUID its file `generated/<id>.json` is named by. */
const RECORD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A generation record's text naming `file` as where its picture is, every other word as written; null where it names no picture. */
export function recordNaming(text: string, file: string): string | null {
    const tree = parseTree(text);
    const node = tree && findNodeAtLocation(tree, ['output', 'file']);
    if (!node || node.type !== 'string') return null;
    return applyEdits(text, [{ offset: node.offset, length: node.length, content: JSON.stringify(file) }]);
}

/** Record paths keep ordinary words, links, unknown metadata and numeric source precision untouched. */
export function planClipboardFiles(captured: CapturedSlides): ClipboardFiles | null {
    const definitions = new Map<string, Record<string, unknown>>();
    for (const part of captured.compositions) {
        const record = readJsonObject(part.record);
        if (!record) return null;
        definitions.set(part.id, record);
    }
    const files = new Set<string>();
    const records = new Map<string, string>();
    const edits = new Map<CapturedPart, { offset: number; length: number; value: string }[]>();
    for (const part of [...captured.slides, ...captured.compositions]) {
        const record = definitions.get(part.id) ?? readJsonObject(part.record);
        const tree = parseTree(part.record);
        if (!record || !tree) return null;
        const locations: Location[] = [];
        const add = (value: unknown, path: readonly (string | number)[]) => {
            if (typeof value === 'string' && value !== '' && value !== 'none') locations.push({ path, value });
        };
        const nested = (value: unknown, name: string): unknown => (isRecord(value) ? value[name] : undefined);
        // A picture's record, and a restyle's original's, each by the file of the picture it made.
        const made = (generation: unknown, picture: unknown) => {
            const name = (id: unknown, file: unknown) => {
                if (typeof id === 'string' && RECORD_ID.test(id) && typeof file === 'string' && !records.has(id)) records.set(id, file);
            };
            name(nested(generation, 'id'), picture);
            name(nested(nested(nested(generation, 'original'), 'generation'), 'id'), nested(nested(generation, 'original'), 'file'));
        };
        if (isRecord(record.background)) {
            add(record.background.image, ['background', 'image']);
            add(nested(nested(record.background.generation, 'original'), 'file'), ['background', 'generation', 'original', 'file']);
            made(record.background.generation, record.background.image);
        }
        if (definitions.has(part.id) && Array.isArray(record.controls))
            record.controls.forEach((control: unknown, index) => {
                if (isRecord(control) && control.type === 'media') add(control.default, ['controls', index, 'default']);
            });
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
            add(nested(nested(object.generation, 'original'), 'file'), [...base, 'generation', 'original', 'file']);
            made(object.generation, object.file);
            add(nested(object.model, 'file'), [...base, 'model', 'file']);
            if (
                base[0] === 'objects' &&
                object.type === 'instance' &&
                typeof object.composition === 'string' &&
                isRecord(object['control-values'])
            ) {
                const controls = definitions.get(object.composition)?.controls;
                if (!Array.isArray(controls)) continue;
                for (const [id, value] of Object.entries(object['control-values'])) {
                    const declaration: unknown = controls.find((control: unknown) => isRecord(control) && control.id === id);
                    if (isRecord(declaration) && declaration.type === 'media') add(value, [...base, 'control-values', id]);
                }
            }
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
        // A record whose picture comes in no copy, as one an override names over a layout's picture, stays behind.
        records: new Map([...records].filter(([, picture]) => files.has(picture))),
        remap: names => {
            if ([...files].some(file => !isPresentationMediaPath(names.get(file) ?? ''))) return null;
            const changed = (part: CapturedPart): CapturedPart => {
                const changes: Edit[] = edits
                    .get(part)!
                    .filter(edit => names.get(edit.value) !== edit.value)
                    .map(edit => ({ offset: edit.offset, length: edit.length, content: JSON.stringify(names.get(edit.value)!) }));
                return { ...part, record: changes.length ? applyEdits(part.record, changes) : part.record };
            };
            return { slides: captured.slides.map(changed), compositions: captured.compositions.map(changed) };
        }
    };
}
