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
import { formatStanding } from './format-version.ts';
import { isRecord } from './recognition.ts';
import { columnCountAsRead, heldAnchor, ownAnchor, pointMoved, standingFrame, TEXT_POINT_KEYS } from './text-growth.ts';

export interface StructureRegion {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
    /** The point it turns about: its anchor point on its frame, or the frame's center. */
    readonly pivot: { readonly x: number; readonly y: number };
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

// The longest side a slide has, in canvas units.
const MAX_SLIDE_SIDE = 8192;

/**
 * The slide size a master gives, as MarkdownPoint reads it, or null where MarkdownPoint refuses it. A master that
 * declares no size gives 1920 × 1080. Each side is read to the millionth and must then be a whole number from 1 to
 * 8192, width first. A version the plugin reads fully refuses any other side and any key beside width and height. A
 * newer minor gives 1920 × 1080 for the whole size from the first side outside that range, and passes other keys over.
 * Every version refuses a size that isn't a record and a side that is left out or isn't a finite number.
 */
function masterSlideSize(master: Record<string, unknown>): { width: number; height: number } | null {
    const size = master.size;
    if (size === undefined) return { width: 1920, height: 1080 };
    if (!isRecord(size) || !Object.hasOwn(size, 'width') || !Object.hasOwn(size, 'height')) return null;
    const newerMinor = formatStanding(master.markdownpoint) === 'newer-minor';
    if (!newerMinor && Object.keys(size).some(key => key !== 'width' && key !== 'height')) return null;
    const sides: number[] = [];
    for (const side of [size.width, size.height]) {
        if (!finite(side)) return null;
        // To the millionth, as MarkdownPoint keeps every number a file holds.
        const value = Number(side.toFixed(6));
        if (!Number.isInteger(value) || value < 1 || value > MAX_SLIDE_SIDE) return newerMinor ? { width: 1920, height: 1080 } : null;
        sides.push(value);
    }
    const [width = 0, height = 0] = sides;
    return { width, height };
}

/**
 * A text's override as MarkdownPoint applies it: one that changes what decides the point its frame's x and y name, and
 * moves a part it leaves out, waits, so the text keeps the keys it inherits. MarkdownPoint may still apply such a key
 * alone where it moves nothing; the schematic shows the box its level gives it.
 */
function heldPoint(
    base: Record<string, unknown>,
    override: Record<string, unknown>,
    merged: Record<string, unknown>
): Record<string, unknown> {
    const changed = Object.keys(override).filter(key => TEXT_POINT_KEYS.has(key));
    if (base.type !== 'text' || changed.length === 0) return merged;
    const moved = pointMoved(base, merged);
    const frame = isRecord(override.frame) ? override.frame : {};
    if (!(moved.x && !Object.hasOwn(frame, 'x')) && !(moved.y && !Object.hasOwn(frame, 'y'))) return merged;
    const held = { ...merged };
    for (const key of changed) {
        if (Object.hasOwn(base, key)) held[key] = base[key];
        else delete held[key];
    }
    return held;
}

/** Resolve only directly framed, flat objects. Unknown geometry stays out of the schematic. */
export function slideStructure(record: unknown, theme: EmbeddedTheme | null): SlideStructure | null {
    if (!theme || !isRecord(record) || typeof record.layout !== 'string') return null;
    const master = theme.master.value;
    const layout = theme.layouts.get(record.layout)?.value;
    const size = masterSlideSize(master);
    if (!layout || !size) return null;
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
                    objects.set(
                        id,
                        heldPoint(base, override, {
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
                                  : base.scale,
                            // A level's parts of an anchor point stand over the one the box turns about without
                            // them, as the level's other keys, such as its auto-size, leave it.
                            'anchor-point': isRecord(override['anchor-point'])
                                ? {
                                      ...heldAnchor({ ...base, ...override, 'anchor-point': base['anchor-point'] }),
                                      ...override['anchor-point']
                                  }
                                : Object.hasOwn(override, 'anchor-point')
                                  ? override['anchor-point']
                                  : base['anchor-point']
                        })
                    );
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
        // A text that grows to its words holds no height: it stands a line tall, as the app stands it until it measures them.
        const frame = standingFrame(object);
        // Hierarchy, animation, auto layout and 3D require the MarkdownPoint app's renderer. Keep this
        // a source schematic instead of presenting guessed resolved positions.
        if (
            object.visible === false ||
            object.parent ||
            object['auto-layout'] ||
            object.repeater ||
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
        if (!text && !['image', 'video', 'web-video', 'instance'].includes(object.type)) continue;
        // A text style has no columns: an object states its own.
        const count = object['column-count'] ?? 1;
        const gap = object['column-gutter'] ?? 48;
        const columns = object.type === 'text' ? columnCountAsRead(count) : 1;
        // Dense column grids cannot be distinguished at thumbnail scale.
        if (!finite(columns) || !Number.isInteger(columns) || columns < 1 || columns > 12) continue;
        const gutter = finite(gap) && gap >= 0 ? gap : 48;
        if (frame.width <= gutter * (columns - 1)) continue;
        // Without an anchor point it turns about its center, a text that grows about the point it grows from, which its frame already holds.
        const anchor = ownAnchor(object) ?? { x: 0.5, y: 0.5 };
        regions.push({
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height,
            rotation: finite(object.rotation) ? object.rotation : 0,
            pivot: { x: frame.x + anchor.x * frame.width, y: frame.y + anchor.y * frame.height },
            kind: text ? 'text' : 'media',
            columns,
            gutter
        });
    }
    const geometry = { width: size.width, height: size.height, regions };
    return { ...geometry, key: JSON.stringify(geometry) };
}
