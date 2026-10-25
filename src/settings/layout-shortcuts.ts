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

import { isRecord, isStableId } from "../format/recognition.ts";

export const LAYOUT_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
export type LayoutAssignments = Readonly<Record<string, string>>;
const defaults: LayoutAssignments = Object.fromEntries(["section", "one-liner", "content", "content-with-header", "text-image", "image-text", "image", "solid-color", "blank"]
  .map((key, index) => [String(index + 1), key]));

export function readLayoutAssignments(value: unknown): LayoutAssignments {
  if (!isRecord(value)) return { ...defaults };
  const entries = Object.entries(value);
  if (entries.some(([digit, key]) => !/^[1-9]$/.test(digit) || !isStableId(key)) || new Set(entries.map(([, key]) => key)).size !== entries.length) return { ...defaults };
  return Object.fromEntries(entries) as Record<string, string>;
}

export function assignLayoutDigit(value: LayoutAssignments, layout: string, digit: string | null): LayoutAssignments {
  if (!isStableId(layout) || (digit !== null && !/^[1-9]$/.test(digit))) return value;
  const next: Record<string, string> = {};
  for (const key of LAYOUT_DIGITS) if (key !== digit && value[key] && value[key] !== layout) next[key] = value[key];
  if (digit) next[digit] = layout;
  return next;
}

export function layoutDigit(value: LayoutAssignments, layout: string): string | null {
  return LAYOUT_DIGITS.find(digit => value[digit] === layout) ?? null;
}

interface SettingsHost { loadData(): Promise<unknown>; saveData(data: unknown): Promise<void> }

/** Shared plugin settings; sidebar state remains in its separate local store. */
export class LayoutShortcuts {
  private readonly host: SettingsHost;
  private data: Record<string, unknown> = {};
  private writes: Promise<void> = Promise.resolve();
  private revision = 0;
  value: LayoutAssignments = { ...defaults };
  ready: Promise<void>;

  constructor(host: SettingsHost) {
    this.host = host;
    this.ready = this.read();
    void this.ready.catch((error: unknown) => console.error(error));
  }

  private async read(): Promise<void> {
    const revision = ++this.revision, loaded = await this.host.loadData();
    if (revision !== this.revision) return;
    this.data = isRecord(loaded) ? loaded : {};
    this.value = readLayoutAssignments(this.data.layoutShortcuts);
  }

  reload(): Promise<void> {
    this.ready = this.writes.then(() => this.read());
    return this.ready;
  }

  assign(layout: string, digit: string | null): Promise<void> {
    const ready = this.ready;
    const saving = this.writes.then(async () => {
      await ready;
      const value = assignLayoutDigit(this.value, layout, digit), data = { ...this.data, layoutShortcuts: value };
      await this.host.saveData(data);
      this.revision++;
      this.data = data; this.value = value;
    });
    this.writes = saving.catch(() => undefined);
    return saving;
  }
}
