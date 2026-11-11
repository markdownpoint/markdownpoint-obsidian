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

import { isRecord } from './recognition.ts';

/** The height MarkdownPoint stands a text box that grows to its words at until it has measured them: a line and its inset. */
const UNMEASURED_TEXT_HEIGHT = 48;
/** The width MarkdownPoint stands a text box whose width follows its words at until it has measured them. */
const UNMEASURED_TEXT_WIDTH = 48;
/** The most columns a text takes: a column count past it reads as none. */
const MAX_COLUMN_COUNT = 65_535;

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * A text's column count as MarkdownPoint reads it, to the millionth, as its files keep every number: 2.0000004 is two
 * columns. Undefined where the count is no number.
 */
export function columnCountAsRead(value: unknown): number | undefined {
    if (!finite(value)) return undefined;
    if (Number.isInteger(value) || Math.round(value * 1e6) / 1e6 === value) return value;
    const read = Number(value.toFixed(6));
    return read === 0 ? 0 : read;
}

/**
 * The sides of a text record's frame its words give it, as MarkdownPoint reads them, which its file holds no length of:
 * its width with Auto width or both, on no path and in one column; its height with Auto height or both, on no path.
 */
function grownSides(record: Readonly<Record<string, unknown>>): { width: boolean; height: boolean } {
    if (record.type !== 'text' || record['text-path'] != null) return { width: false, height: false };
    const fit = record['auto-size'];
    const columns = columnCountAsRead(record['column-count']);
    const columned = columns !== undefined && Number.isInteger(columns) && columns > 1 && columns <= MAX_COLUMN_COUNT;
    return { width: (fit === 'width' || fit === 'both') && !columned, height: fit === 'height' || fit === 'both' };
}

/**
 * The share of a text's width its alignment holds as its words resize it: 0 set left, a half centered, 1 set right, and
 * a justified or unaligned text's the side its lines start on, the right in a right-to-left text.
 */
function keptFraction(record: Readonly<Record<string, unknown>>): number {
    const start = record['text-direction'] === 'rtl' ? 'right' : 'left';
    const side = record.align === 'left' || record.align === 'center' || record.align === 'right' ? record.align : start;
    return side === 'center' ? 0.5 : side === 'right' ? 1 : 0;
}

/**
 * The anchor point a record turns and scales about, as MarkdownPoint reads it: its own, which has both parts; or with
 * none, a text that grows's point it grows from, the point its alignment holds along a width that grows and the top along
 * a height that grows, and any other object's center.
 */
export function heldAnchor(record: Readonly<Record<string, unknown>>): { x: number; y: number } {
    const own = record['anchor-point'];
    if (isRecord(own) && finite(own.x) && finite(own.y)) return { x: own.x, y: own.y };
    const grows = grownSides(record);
    return { x: grows.width ? keptFraction(record) : 0.5, y: grows.height ? 0 : 0.5 };
}

/**
 * A record's frame as MarkdownPoint stands it before it measures any words. A text whose words give its frame a side
 * holds no length of it: its x and y place the box with none, and the box grows from that box's center, the point its
 * turn and scale pivot on unless it has an anchor point, to a line tall and a width no page measured yet, or its least
 * height where that is taller. With an anchor point it grows in its own frame, and turns and scales about the anchor.
 * That point is its alignment's at mid-height for a width that grows, the middle of its top for a height, and its
 * alignment's on its top for both. Any other frame as written.
 */
export function standingFrame(record: Readonly<Record<string, unknown>>): unknown {
    const frame = record.frame;
    const grows = grownSides(record);
    if (!isRecord(frame) || (!grows.width && !grows.height) || !finite(frame.x) || !finite(frame.y)) return frame;
    const least = record['min-height'];
    const width = grows.width ? UNMEASURED_TEXT_WIDTH : frame.width;
    const height = grows.height ? (finite(least) && least > UNMEASURED_TEXT_HEIGHT ? least : UNMEASURED_TEXT_HEIGHT) : frame.height;
    if (!finite(width) || !finite(height)) return { ...frame, width, height };
    // The point the growth holds is the center of the frame the file stores, which has no length along a growing side.
    const point = { x: frame.x + (grows.width ? 0 : width / 2), y: frame.y + (grows.height ? 0 : height / 2) };
    const held = heldOffset(record, width, height);
    return { ...frame, x: point.x - held.x - width / 2, y: point.y - held.y - height / 2, width, height };
}

/**
 * Where the point a text's growth holds stands from the center of a box it draws `width` by `height`, carried by its turn
 * and scale; with an anchor point, which its turn and scale pivot on instead, by neither.
 */
function heldOffset(record: Readonly<Record<string, unknown>>, width: number, height: number): { x: number; y: number } {
    const grows = grownSides(record);
    // Where that point stands on the box, from its center, before the box's turn and scale carry it.
    const dx = grows.width ? (keptFraction(record) - 0.5) * width : 0;
    const dy = grows.height ? -height / 2 : 0;
    if (isRecord(record['anchor-point'])) return { x: dx, y: dy };
    const scale = isRecord(record.scale) ? record.scale : {};
    const ox = dx * (finite(scale.x) ? scale.x : 1);
    const oy = dy * (finite(scale.y) ? scale.y : 1);
    const turn = ((finite(record.rotation) ? record.rotation : 0) * Math.PI) / 180;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    return { x: ox * cos - oy * sin, y: ox * sin + oy * cos };
}

/** The keys of a text record that decide which point its frame's x and y name: which sides grow, the point their growth holds, the turn and scale it pivots on, and the anchor point that sets them aside. */
export const TEXT_POINT_KEYS: ReadonlySet<string> = new Set([
    'auto-size',
    'align',
    'text-direction',
    'column-count',
    'text-path',
    'rotation',
    'scale',
    'anchor-point'
]);

/** Two lengths a side that grows to its words is judged at: a point is linear in each length, so two decide it for all. */
const JUDGED_LENGTHS = [1000, 2000];

/** Where a text record's frame x and y stand from the center of a box it draws `width` by `height`, its growth, turn and scale read as MarkdownPoint reads them. */
function pointFromCenter(record: Readonly<Record<string, unknown>>, width: number, height: number): { x: number; y: number } {
    const grows = grownSides(record);
    const held = heldOffset(record, width, height);
    return { x: held.x - (grows.width ? 0 : width / 2), y: held.y - (grows.height ? 0 : height / 2) };
}

/**
 * Which of an inherited text record's frame x and y name another point under `merged`'s keys, as MarkdownPoint judges a
 * level's change of its growth, alignment, direction, columns, path, turn, scale or anchor point: at every length its words could
 * give a side that grows. A level states each that moves; one it leaves out keeps what the record inherits.
 */
export function pointMoved(
    inherited: Readonly<Record<string, unknown>>,
    merged: Readonly<Record<string, unknown>>
): { x: boolean; y: boolean } {
    const grows = grownSides(inherited);
    const frame = isRecord(inherited.frame) ? inherited.frame : {};
    let x = false;
    let y = false;
    for (const width of grows.width ? JUDGED_LENGTHS : [finite(frame.width) ? frame.width : 0])
        for (const height of grows.height ? JUDGED_LENGTHS : [finite(frame.height) ? frame.height : 0]) {
            const was = pointFromCenter(inherited, width, height);
            const is = pointFromCenter(merged, width, height);
            // MarkdownPoint holds a point to the millionth, so the same point can round a millionth apart along two paths.
            x ||= Math.abs(was.x - is.x) > 1.5e-6;
            y ||= Math.abs(was.y - is.y) > 1.5e-6;
        }
    return { x, y };
}
