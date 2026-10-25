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

import type { EmbeddedTheme } from './embedded-theme.ts';
import { isRecord } from './recognition.ts';

export interface StructureRegion {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
    readonly kind: 'text' | 'media';
    readonly columns: number;
    readonly gutter: number;
}
export interface SlideStructure {
    readonly width: number;
    readonly height: number;
    readonly regions: readonly StructureRegion[];
    readonly key: string;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Resolve only directly framed, flat objects. Unknown geometry stays out of the schematic. */
export function slideStructure(record: unknown, theme: EmbeddedTheme | null): SlideStructure | null {
    if (!theme || !isRecord(record) || typeof record.layout !== 'string') return null;
    const master = theme.master.value;
    const layout = theme.layouts.get(record.layout)?.value;
    const size = master.size;
    if (!layout || !isRecord(size) || !finite(size.width) || !finite(size.height) || size.width <= 0 || size.height <= 0) return null;
    const objects = new Map<string, Record<string, unknown>>();
    const ownIds = new Set<string>();
    for (const level of [master, layout, record]) {
        const inherited = new Set(objects.keys());
        if (isRecord(level.overrides))
            for (const [id, override] of Object.entries(level.overrides)) {
                const base = objects.get(id);
                if (!base) continue;
                if (override === null) {
                    objects.delete(id);
                } else if (isRecord(override))
                    objects.set(id, {
                        ...base,
                        ...override,
                        type: base.type,
                        frame:
                            isRecord(base.frame) && isRecord(override.frame)
                                ? { ...base.frame, ...override.frame }
                                : (override.frame ?? base.frame),
                        scale: isRecord(override.scale)
                            ? { x: 1, y: 1, ...(isRecord(base.scale) ? base.scale : {}), ...override.scale }
                            : Object.hasOwn(override, 'scale')
                              ? override.scale
                              : base.scale
                    });
            }
        if (Array.isArray(level.objects))
            for (const object of level.objects) {
                if (!isRecord(object) || typeof object.id !== 'string' || inherited.has(object.id)) continue;
                objects.set(object.id, object);
                if (level === record) ownIds.add(object.id);
            }
    }
    const regions: StructureRegion[] = [];
    for (const object of objects.values()) {
        const frame = object.frame;
        // Hierarchy, animation, auto layout and 3D require the MarkdownPoint app's renderer. Keep this
        // a source schematic instead of presenting guessed resolved positions.
        if (
            object.hidden === true ||
            object.parent ||
            object['auto-layout'] ||
            object.repeat ||
            (object.scale != null && (!isRecord(object.scale) || object.scale.x !== 1 || object.scale.y !== 1)) ||
            !isRecord(frame) ||
            !finite(frame.x) ||
            !finite(frame.y) ||
            !finite(frame.width) ||
            !finite(frame.height) ||
            frame.width <= 0 ||
            frame.height <= 0 ||
            (object.rotation != null && !finite(object.rotation))
        )
            continue;
        if (typeof object.type !== 'string') continue;
        const text = ['text', 'table', 'chart'].includes(object.type);
        // Theme labels and decorative shapes do not describe the slide's writing areas.
        // Slide-owned text remains editable even without the theme placeholder flag.
        if (text && object.placeholder !== true && !ownIds.has(String(object.id))) continue;
        if (!text && !['image', 'video', 'web-video', 'composition'].includes(object.type)) continue;
        const styles = master['text-styles'];
        const style = isRecord(styles) && typeof object['text-style'] === 'string' ? styles[object['text-style']] : undefined;
        const count = object['column-count'] ?? (isRecord(style) ? style['column-count'] : undefined) ?? 1;
        const gap = object['column-gutter'] ?? (isRecord(style) ? style['column-gutter'] : undefined) ?? 48;
        const columns = object.type === 'text' ? count : 1;
        // Dense column grids cannot be distinguished at thumbnail scale.
        if (!finite(columns) || !Number.isInteger(columns) || columns < 1 || columns > 12) continue;
        const gutter = finite(gap) && gap >= 0 ? gap : 48;
        if (frame.width <= gutter * (columns - 1)) continue;
        regions.push({
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height,
            rotation: finite(object.rotation) ? object.rotation : 0,
            kind: text ? 'text' : 'media',
            columns,
            gutter
        });
    }
    const geometry = { width: size.width, height: size.height, regions };
    return { ...geometry, key: JSON.stringify(geometry) };
}
