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
import { indexPresentation } from "./document.ts";
import type { PresentationDocument } from "./document.ts";
import { isRecord, isStableId } from "./recognition.ts";
import { terminateSourceBlock } from "./payload.ts";
import type { SourceChange } from "./reorder.ts";

/** A complete slide whose identity and references have already been prepared for this presentation. */
export interface PreparedSlide {
  readonly id: string;
  readonly markdown: string;
  readonly record: string;
}

export interface SlideInsertion extends SourceChange {
  readonly companion: string;
}

/** Insert complete prepared slides below a slide, or into a draft with no slides. */
export function planSlideInsertion(markdown: string, document: PresentationDocument, companion: string,
  slides: readonly PreparedSlide[], afterSlideId: string | null, bodyStart: number): SlideInsertion | null {
  if (!slides.length || new Set(slides.map(slide => slide.id)).size !== slides.length) return null;
  const after = afterSlideId === null ? null : document.slides.find(slide => slide.id === afterSlideId);
  if (afterSlideId === null ? document.slides.length > 0 : !after) return null;
  const data = CompanionDocument.read(companion);
  if (!data) return null;
  const metadata: unknown = JSON.parse(companion);
  if (!isRecord(metadata) || (metadata.compositions !== undefined && !isRecord(metadata.compositions))) return null;
  const occupied = new Set([...document.slides, ...document.compositions].map(part => part.id));
  for (const id of Object.keys(isRecord(metadata.compositions) ? metadata.compositions : {})) occupied.add(id);
  for (const slide of slides) {
    if (!isStableId(slide.id) || occupied.has(slide.id)) return null;
    const indexed = indexPresentation(slide.markdown, 0);
    if (!indexed || indexed.slides.length !== 1 || indexed.sections.length || indexed.compositions.length ||
      indexed.slides[0]!.id !== slide.id || indexed.slides[0]!.from !== 0) return null;
    // A cut may still have its exact record on disk while the companion save is
    // pending. Restore its text without replacing different external metadata.
    const current = data.records.get(slide.id);
    if (current !== undefined && current !== slide.record) return null;
  }
  const nextCompanion = data.change(new Map(slides.map(slide => [slide.id, slide.record])));
  if (nextCompanion === null) return null;
  const at = after?.to ?? document.sections.at(-1)?.to ?? document.compositions[0]?.from ?? markdown.length;
  const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
  const prefix = markdown.slice(0, at);
  const closed = terminateSourceBlock(prefix, newline);
  let from = at;
  if (closed !== prefix) {
    from = 0;
    while (from < at && closed[from] === prefix[from]) from++;
  }
  const insert = closed.slice(from) + slides.map((slide, index) => index < slides.length - 1 || at < markdown.length
    ? terminateSourceBlock(slide.markdown, newline) : slide.markdown).join("");
  const proposed = markdown.slice(0, from) + insert + markdown.slice(at);
  const indexed = indexPresentation(proposed, bodyStart);
  const insertionIndex = after ? document.slides.indexOf(after) + 1 : 0;
  const expected = document.slides.map(slide => slide.id);
  expected.splice(insertionIndex, 0, ...slides.map(slide => slide.id));
  if (!indexed || indexed.slides.map(slide => slide.id).join("\n") !== expected.join("\n") ||
    indexed.sections.map(section => section.id).join("\n") !== document.sections.map(section => section.id).join("\n") ||
    indexed.compositions.map(part => part.id).join("\n") !== document.compositions.map(part => part.id).join("\n")) return null;
  return { from, to: at, insert, companion: nextCompanion, document: indexed };
}
