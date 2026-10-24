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

import { steppedOrder } from "../selection/list-selection.ts";
import { indexPresentation } from "./document.ts";
import type { PresentationDocument } from "./document.ts";

export interface SourceChange {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
  readonly document: PresentationDocument;
}

/**
 * Plan one Markdown replacement from the current shared source index. Complete
 * slide slices carry every field, note, and unknown word. The companion is not
 * part of ordering. A section start is one step; the first section stays first.
 */
export function stepSlideSource(markdown: string, document: PresentationDocument, slideIds: Iterable<string>, direction: "up" | "down"): SourceChange | null {
  const chosen = new Set(slideIds);
  const known = new Set(document.slides.map(slide => slide.id));
  if (!chosen.size || [...chosen].some(id => !known.has(id))) return null;
  const blocks = [
    ...document.slides.map(slide => ({ kind: "slide" as const, id: slide.id, from: slide.from, to: slide.to })),
    ...document.sections.map(section => ({ kind: "section" as const, id: section.id, from: section.from, to: section.to })),
  ].sort((a, b) => a.from - b.from);
  if (!blocks.length || (document.sections.length > 0 && blocks[0]!.kind !== "section") ||
    blocks.some((block, index) => index > 0 && blocks[index - 1]!.to !== block.from)) return null;
  const movable = blocks[0]!.kind === "section" ? blocks.slice(1) : blocks;
  const next = steppedOrder(blocks, movable, blocks.filter(block => block.kind === "slide" && chosen.has(block.id)), direction);
  if (!next) return null;
  let first = 0, last = blocks.length - 1;
  while (next[first] === blocks[first]) first++;
  while (next[last] === blocks[last]) last--;
  const from = blocks[first]!.from, to = blocks[last]!.to;
  const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
  const insert = next.slice(first, last + 1).map((block, index) => {
    const raw = markdown.slice(block.from, block.to);
    const followed = first + index < next.length - 1 || to < markdown.length;
    if (!followed || raw.endsWith("\n")) return raw;
    // Fold an unterminated whitespace-only tail into the existing organizational
    // blank line. Adding a new line there would turn the old one into authored
    // space. Otherwise a single newline separates the words from their neighbor.
    const closed = raw.replace(/(^|\n)([ \t]*)(\r?\n)([ \t]+)$/, "$1$2$4$3");
    return closed.endsWith("\n") ? closed : closed + newline;
  }).join("");
  const proposed = markdown.slice(0, from) + insert + markdown.slice(to);
  // In particular, a final unfinished code fence cannot swallow a slide when
  // moved earlier. Validate once per explicit move, never during idle rendering.
  const indexed = indexPresentation(proposed, blocks[0]!.from);
  if (!indexed || indexed.slides.map(slide => slide.id).join("\n") !== next.filter(block => block.kind === "slide").map(block => block.id).join("\n") ||
    indexed.sections.map(section => section.id).join("\n") !== document.sections.map(section => section.id).join("\n")) return null;
  return { from, to, insert, document: indexed };
}
