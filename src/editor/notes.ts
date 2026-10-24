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

import { indexPresentation } from "../format/document.ts";
import type { PresentationDocument } from "../format/document.ts";
import { payloadContentEnd } from "../format/payload.ts";
import type { WritingField } from "./writing-fields.ts";

export interface SlideNotes {
  readonly slideId: string;
  readonly at: number;
  readonly field: WritingField | null;
}

/** Missing notes are interface slots until the author enters the writing area. */
export function slideNotes(markdown: string, document: PresentationDocument, placeholder: string): SlideNotes[] {
  const notes: SlideNotes[] = [];
  for (const slide of document.slides) {
    const blocks = slide.blocks.filter(block => block.kind === "notes");
    // Duplicate notes are malformed input. Leave all of their source visible.
    if (blocks.length > 1) continue;
    const block = blocks[0];
    notes.push({ slideId: slide.id, at: block?.from ?? slide.to, field: block ? {
      key: `${slide.id}:notes`, opening: false, role: "body", label: placeholder,
      from: block.from, contentFrom: block.contentFrom, to: block.to,
      contentTo: payloadContentEnd(markdown, block.contentFrom, block.to),
      markerText: markdown.slice(block.from, block.contentFrom),
      populated: markdown.slice(block.contentFrom, block.to).trim().length > 0,
    } : null });
  }
  return notes;
}

/** A minimal source insertion; all existing bytes and the companion stay intact. */
export function notesInsertion(markdown: string, at: number): { from: number; insert: string; cursor: number } {
  const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
  // Keep a following source newline as the empty payload's writable line.
  // Redo then maps the insertion caret into notes, before the next marker.
  const from = at < markdown.length && markdown.slice(at - newline.length, at) === newline ? at - newline.length : at;
  const before = markdown.slice(0, from);
  const gap = before.endsWith(newline + newline) ? "" : before.endsWith(newline) ? newline : newline + newline;
  const prefix = gap + "<!-- notes -->" + newline;
  return { from, insert: prefix, cursor: from + prefix.length };
}

/** Validate once on activation, including unfinished Markdown at the final field. */
export function validatedNotesInsertion(markdown: string, document: PresentationDocument, slideId: string): ReturnType<typeof notesInsertion> | null {
  const slide = document.slides.find(slide => slide.id === slideId);
  if (!slide || slide.blocks.some(block => block.kind === "notes")) return null;
  const insertion = notesInsertion(markdown, slide.to);
  const proposed = markdown.slice(0, insertion.from) + insertion.insert + markdown.slice(insertion.from);
  const start = Math.min(document.slides[0]?.from ?? 0, document.sections[0]?.from ?? Infinity);
  const indexed = indexPresentation(proposed, start);
  const notes = indexed?.slides.find(slide => slide.id === slideId)?.blocks.filter(block => block.kind === "notes");
  return notes?.length === 1 && notes[0]!.contentFrom === insertion.cursor ? insertion : null;
}
