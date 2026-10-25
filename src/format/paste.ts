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

import type { CapturedPart, CapturedSlides } from "./capture.ts";
import type { SlideClipboard, ClipboardOrigin } from "./clipboard.ts";
import { CompanionDocument } from "./companion.ts";
import { prepareSlideCopies } from "./copy.ts";
import type { PresentationDocument } from "./document.ts";
import type { EmbeddedTheme } from "./embedded-theme.ts";

/** Keep existing media references only inside the same presentation and theme. */
export function sameClipboardDestination(packet: SlideClipboard, origin: ClipboardOrigin, theme: EmbeddedTheme): boolean {
  return packet.origin.vault === origin.vault && packet.origin.path === origin.path && packet.origin.document === origin.document &&
    packet.theme.id === theme.id && packet.theme.master.source === theme.master.source &&
    [...packet.theme.layouts].every(([key, layout]) => theme.layouts.get(key)?.source === layout.source);
}

/** Gather the destination's exact reusable definitions and every reserved identity. */
export function prepareClipboardPaste(packet: SlideClipboard, markdown: string, document: PresentationDocument, companion: string,
  remembered: Iterable<string>, mint: () => string): CapturedSlides | null {
  const slides = CompanionDocument.read(companion), definitions = CompanionDocument.ensure(companion, "compositions");
  if (!slides || !definitions) return null;
  const held: CapturedPart[] = [];
  for (const part of document.compositions) {
    const record = definitions.records.get(part.id);
    if (record === undefined) return null;
    held.push({ id: part.id, markdown: markdown.slice(part.from, part.to), record });
  }
  const occupied = new Set([...slides.records.keys(), ...definitions.records.keys(), ...remembered,
    ...document.slides.map(part => part.id), ...document.compositions.map(part => part.id)]);
  return prepareSlideCopies(packet.captured, held, occupied, packet.schemas, mint);
}
