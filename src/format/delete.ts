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

import { applyEdits } from "jsonc-parser";
import { CompanionDocument } from "./companion.ts";
import { indexPresentation } from "./document.ts";
import type { PresentationDocument } from "./document.ts";

export interface SlideDeletion {
  readonly changes: readonly { from: number; to: number; insert: string }[];
  readonly companion: string;
  readonly document: PresentationDocument;
}

/** Plan both sides of a deletion; applying and undoing the pair belongs to the editor. */
export function planSlideDeletion(markdown: string, document: PresentationDocument, companion: string, slideIds: Iterable<string>): SlideDeletion | null {
  const selected = new Set(slideIds);
  const slides = document.slides.filter(slide => selected.has(slide.id));
  if (!selected.size || slides.length !== selected.size) return null;

  const data = CompanionDocument.read(companion);
  if (!data || [...selected].some(id => !data.records.has(id))) return null;
  const nextCompanion = data.change(new Map([...selected].map(id => [id, null])));
  if (nextCompanion === null) return null;
  const changes = slides.map(slide => ({ from: slide.from, to: slide.to, insert: "" }));
  const proposed = applyEdits(markdown, changes.map(change => ({ offset: change.from, length: change.to - change.from, content: change.insert })));
  const bodyStart = Math.min(document.slides[0]!.from, document.sections[0]?.from ?? Infinity);
  const indexed = indexPresentation(proposed, bodyStart);
  if (!indexed || indexed.slides.map(slide => slide.id).join("\n") !== document.slides.filter(slide => !selected.has(slide.id)).map(slide => slide.id).join("\n") ||
    indexed.sections.map(section => section.id).join("\n") !== document.sections.map(section => section.id).join("\n")) return null;
  return { changes, companion: nextCompanion, document: indexed };
}
