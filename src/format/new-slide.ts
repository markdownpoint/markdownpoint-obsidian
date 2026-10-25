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

import type { EmbeddedTheme } from "./embedded-theme.ts";
import type { PreparedPart } from "./insert.ts";
import { isRecord, isStableId } from "./recognition.ts";

export function layoutName(key: string, value: Record<string, unknown>): string {
  if (typeof value.name === "string" && value.name.trim()) return value.name.trim();
  const words = key.replace(/[-_]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function orderedLayouts(theme: EmbeddedTheme): string[] {
  const order = theme.master.value["layout-order"];
  const first = Array.isArray(order) ? order.filter((key): key is string => typeof key === "string" && theme.layouts.has(key)) : [];
  return [...new Set([...first, ...theme.layouts.keys()])];
}

interface NewField { id: string; frame: { x: number; y: number; width: number; height: number } | null }

/** Whole columns read before their neighbors; spanning headers precede the columns below them. */
function writingOrder(fields: readonly NewField[]): NewField[] {
  const positioned = fields.filter((field): field is NewField & { frame: NonNullable<NewField["frame"]> } => field.frame !== null);
  const incoming = positioned.map(() => 0), following = positioned.map(() => [] as number[]);
  for (let before = 0; before < positioned.length; before++) for (let after = 0; after < positioned.length; after++) {
    if (before === after) continue;
    const a = positioned[before]!.frame, b = positioned[after]!.frame;
    if (a.y + a.height / 2 <= b.y && Math.max(a.x, b.x) < Math.min(a.x + a.width, b.x + b.width)) {
      following[before]!.push(after); incoming[after]!++;
    }
  }
  const ready = positioned.flatMap((_, index) => incoming[index] === 0 ? [index] : []), result: NewField[] = [];
  while (ready.length) {
    ready.sort((a, b) => {
      const left = positioned[a]!, right = positioned[b]!;
      return left.frame.x - right.frame.x || left.frame.y - right.frame.y || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    });
    const index = ready.shift()!;
    result.push(positioned[index]!);
    for (const next of following[index]!) if (--incoming[next]! === 0) ready.push(next);
  }
  return [...result, ...fields.filter(field => field.frame === null)];
}

/** A new slide owns empty layout text slots; sample words remain in the theme. */
export function prepareNewSlide(theme: EmbeddedTheme, layoutKey: string, id: string): PreparedPart | null {
  const layout = theme.layouts.get(layoutKey)?.value;
  if (!isStableId(id) || !layout) return null;
  const objects = layout.objects ?? [];
  if (!Array.isArray(objects)) return null;
  const inherited = new Set(Array.isArray(theme.master.value.objects)
    ? theme.master.value.objects.flatMap(object => isRecord(object) && typeof object.id === "string" ? [object.id] : []) : []);
  const fields: NewField[] = [];
  for (const object of objects) {
    if (!isRecord(object) || object.type !== "text" || object.placeholder !== true || (typeof object.id === "string" && inherited.has(object.id))) continue;
    if (!isStableId(object.id) || fields.some(field => field.id === object.id)) return null;
    const frame = isRecord(object.frame) ? object.frame : {};
    const box = !object.parent && typeof frame.x === "number" && typeof frame.y === "number" && typeof frame.width === "number" && typeof frame.height === "number" &&
      [frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) && frame.width > 0 && frame.height > 0
      ? { x: frame.x, y: frame.y, width: frame.width, height: frame.height } : null;
    fields.push({ id: object.id, frame: box });
  }
  return { id, record: JSON.stringify({ layout: layoutKey }),
    markdown: [`<!-- slide: ${id} -->`, ...writingOrder(fields).map(field => `<!-- text: ${field.id} -->`)].join("\n\n") + "\n" };
}
