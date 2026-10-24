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

import { applyEdits, parseTree } from "jsonc-parser";
import type { Edit, ParseError } from "jsonc-parser";
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

  const errors: ParseError[] = [];
  const root = parseTree(companion, errors, { disallowComments: true, allowTrailingComma: false });
  if (errors.length || root?.type !== "object") return null;
  const maps = root.children?.filter(property => property.children?.[0]?.value === "slides");
  const map = maps?.length === 1 ? maps[0]?.children?.[1] : undefined;
  if (map?.type !== "object") return null;
  const properties = map.children ?? [];
  const names = properties.map(property => {
    const name: unknown = property.children?.[0]?.value;
    return typeof name === "string" ? name : "";
  });
  const known = new Set(names);
  if (known.size !== names.length || [...selected].some(id => !known.has(id))) return null;
  if (properties.some((property, index) => selected.has(names[index]!) && property.children?.[1]?.type !== "object")) return null;

  // Remove contiguous property runs with their separating comma. Parse once so
  // Select all remains linear and surviving values keep their exact source bytes.
  const edits: Edit[] = [];
  for (let index = 0; index < properties.length;) {
    if (!selected.has(names[index]!)) { index++; continue; }
    const start = index;
    while (index < properties.length && selected.has(names[index]!)) index++;
    const previous = properties[start - 1], last = properties[index - 1]!;
    const from = index === properties.length && previous ? previous.offset + previous.length : properties[start]!.offset;
    const to = properties[index]?.offset ?? last.offset + last.length;
    edits.push({ offset: from, length: to - from, content: "" });
  }
  const changes = slides.map(slide => ({ from: slide.from, to: slide.to, insert: "" }));
  const proposed = applyEdits(markdown, changes.map(change => ({ offset: change.from, length: change.to - change.from, content: change.insert })));
  const bodyStart = Math.min(document.slides[0]!.from, document.sections[0]?.from ?? Infinity);
  const indexed = indexPresentation(proposed, bodyStart);
  if (!indexed || indexed.slides.map(slide => slide.id).join("\n") !== document.slides.filter(slide => !selected.has(slide.id)).map(slide => slide.id).join("\n") ||
    indexed.sections.map(section => section.id).join("\n") !== document.sections.map(section => section.id).join("\n")) return null;
  return { changes, companion: applyEdits(companion, edits), document: indexed };
}
