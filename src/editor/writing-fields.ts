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

import type { PresentationDocument } from "../format/document.ts";

export interface WritingField {
  readonly key: string;
  readonly opening: boolean;
  readonly role: "title" | "body" | "eyebrow";
  readonly label: string;
  readonly from: number;
  readonly contentFrom: number;
  readonly to: number;
  readonly markerText: string;
  readonly populated: boolean;
}

export function compactFieldAt(fields: readonly WritingField[], position: number, length: number): WritingField | undefined {
  return fields.find(field => field.contentFrom === position && field.contentFrom === field.to && position < length);
}

/** Known authoring roles use supplied product wording; other bindings stay native. */
export function writingFields(markdown: string, document: PresentationDocument, labels: Record<WritingField["role"], string>): WritingField[] {
  const fields: WritingField[] = [];
  for (const slide of document.slides) for (const block of slide.blocks) {
    if (block.kind !== "text") continue;
    const role = (["title", "body", "eyebrow"] as const).find(role => role === block.id);
    if (!role) continue;
    fields.push({
      key: `${slide.id}:${role}`, opening: block === slide.blocks[0], role, label: labels[role], from: block.from, contentFrom: block.contentFrom, to: block.to,
      markerText: markdown.slice(block.from, block.contentFrom), populated: markdown.slice(block.contentFrom, block.to).trim().length > 0,
    });
  }
  return fields;
}
