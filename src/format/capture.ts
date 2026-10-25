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

import { CompanionDocument } from "./companion.ts";
import type { PresentationDocument } from "./document.ts";
import { isRecord, isStableId } from "./recognition.ts";

/** Unchanged source, before destination identities, links or dependencies are prepared. */
export interface CapturedPart {
  readonly id: string;
  readonly markdown: string;
  readonly record: string;
}

export interface CapturedSlides {
  readonly slides: readonly CapturedPart[];
  readonly compositions: readonly CapturedPart[];
}

/** Only own composition instances introduce definition dependencies. */
export function compositionSources(record: unknown, inherits: boolean): readonly string[] | null {
  if (!isRecord(record) || (record.objects !== undefined && !Array.isArray(record.objects))) return null;
  const sources = new Set<string>();
  for (const object of record.objects ?? []) {
    if (typeof object === "string" && inherits && isStableId(object)) continue;
    if (!isRecord(object)) return null;
    if (object.type !== "composition") continue;
    if (!isStableId(object.source)) return null;
    sources.add(object.source);
  }
  return [...sources];
}

/** Capture whole slide source in document order, including every placed reusable definition. */
export function captureSlides(markdown: string, document: PresentationDocument, companion: string, ids: Iterable<string>): CapturedSlides | null {
  const selected = new Set(ids);
  const ordered = document.slides.filter(slide => selected.has(slide.id));
  if (!selected.size || ordered.length !== selected.size) return null;
  const data = CompanionDocument.read(companion);
  if (!data) return null;
  const slides: CapturedPart[] = [];
  for (const slide of ordered) {
    const record = data.records.get(slide.id);
    if (record === undefined) return null;
    slides.push({ id: slide.id, markdown: markdown.slice(slide.from, slide.to), record });
  }
  const definitions = new Map(document.compositions.map(part => [part.id, part]));
  const records = CompanionDocument.read(companion, "compositions");
  const compositions: CapturedPart[] = [];
  const seen = new Set<string>();
  // Iteration avoids a call-stack dependency on authored composition depth.
  const pending = [...slides];
  for (let index = 0; index < pending.length; index++) {
    const sources = compositionSources(JSON.parse(pending[index]!.record), selected.has(pending[index]!.id));
    if (!sources) return null;
    for (const id of sources) {
      if (seen.has(id)) continue;
      const part = definitions.get(id), record = records?.records.get(id);
      if (!part || record === undefined) return null;
      seen.add(id);
      const captured = { id, markdown: markdown.slice(part.from, part.to), record };
      compositions.push(captured);
      pending.push(captured);
    }
  }
  return { slides, compositions };
}
