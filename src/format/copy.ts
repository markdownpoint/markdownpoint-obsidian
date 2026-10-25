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

import { compositionSources } from "./capture.ts";
import type { CapturedPart, CapturedSlides } from "./capture.ts";
import { isSlideRecordSource } from "./companion.ts";
import { indexPresentation } from "./document.ts";
import { payloadContentEnd, terminateSourceBlock } from "./payload.ts";
import { prepareCopiedPart } from "./prepare-copy.ts";
import { isStableId } from "./recognition.ts";

/** Reuse exact contents apart from structural identity, line endings and the terminal organizational gap. */
function definitionKey(part: CapturedPart): string | null {
  const document = indexPresentation(part.markdown, 0), definition = document?.compositions[0];
  if (!document || document.slides.length || document.sections.length || document.compositions.length !== 1 ||
    !definition || definition.from !== 0 || definition.id !== part.id || !isSlideRecordSource(part.record)) return null;
  const words = terminateSourceBlock(part.markdown.slice(definition.markerTo).replace(/\r\n?/g, "\n"), "\n");
  const content = words.slice(0, payloadContentEnd(words, 0, words.length));
  return JSON.stringify([part.record.replace(/\r\n?/g, "\n"), content]);
}

/**
 * Prepare a copied group without touching the destination. Schemas describe the
 * source fields; occupied includes standing, orphaned and recoverable IDs. Reuse
 * only identical definition source, conservatively retaining differing metadata.
 */
export function prepareSlideCopies(captured: CapturedSlides, held: readonly CapturedPart[], occupied: ReadonlySet<string>,
  schemas: ReadonlyMap<string, ReadonlyMap<string, "rich-text" | "table">>, mint: () => string, preserveSlideIds = false): CapturedSlides | null {
  const incoming = [...captured.slides, ...captured.compositions];
  if (!captured.slides.length || new Set(incoming.map(part => part.id)).size !== incoming.length ||
    new Set(held.map(part => part.id)).size !== held.length) return null;
  const definitions = new Map(captured.compositions.map(part => [part.id, part]));
  const used = new Set([...occupied, ...incoming.map(part => part.id), ...held.map(part => part.id)]);
  const fresh = (): string | null => {
    const id = mint();
    if (!isStableId(id) || used.has(id)) return null;
    used.add(id);
    return id;
  };
  const keys = new Map<string, string>(), matches = new Map<string, string>();
  for (const part of held) {
    const key = definitionKey(part);
    if (key === null) return null;
    keys.set(part.id, key);
    if (!matches.has(key)) matches.set(key, part.id);
  }
  const waiting = new Map<string, number>(), parents = new Map<string, string[]>();
  for (const part of incoming) {
    if (!isSlideRecordSource(part.record)) return null;
    const isDefinition = definitions.has(part.id);
    const sources = compositionSources(JSON.parse(part.record), !isDefinition);
    if (!sources || sources.some(id => !definitions.has(id))) return null;
    if (!isDefinition) continue;
    waiting.set(part.id, sources.length);
    for (const child of sources) {
      const dependents = parents.get(child) ?? [];
      dependents.push(part.id);
      parents.set(child, dependents);
    }
  }
  const slideIds = new Map<string, string>(), compositionIds = new Map<string, string>();
  for (const part of captured.slides) {
    if (preserveSlideIds && occupied.has(part.id)) return null;
    const id = preserveSlideIds ? part.id : fresh();
    if (id === null) return null;
    slideIds.set(part.id, id);
  }
  const ready = captured.compositions.filter(part => waiting.get(part.id) === 0);
  const added: CapturedPart[] = [];
  for (let index = 0; index < ready.length; index++) {
    const part = ready[index]!, fields = schemas.get(part.id);
    if (!fields) return null;
    const candidate = prepareCopiedPart(part, "composition", slideIds, compositionIds, fields);
    const key = candidate && definitionKey(candidate);
    if (key === null) return null;
    const reused = keys.get(part.id) === key ? part.id : matches.get(key);
    const id = reused ?? fresh();
    if (id === null) return null;
    compositionIds.set(part.id, id);
    if (!reused) {
      const prepared = prepareCopiedPart(part, "composition", slideIds, compositionIds, fields);
      if (!prepared) return null;
      added.push(prepared);
    }
    for (const parent of parents.get(part.id) ?? []) {
      const remaining = waiting.get(parent)! - 1;
      waiting.set(parent, remaining);
      if (!remaining) ready.push(definitions.get(parent)!);
    }
  }
  if (ready.length !== definitions.size) return null;
  const slides: CapturedPart[] = [];
  for (const part of captured.slides) {
    const fields = schemas.get(part.id);
    if (!fields) return null;
    const prepared = prepareCopiedPart(part, "slide", slideIds, compositionIds, fields);
    if (!prepared) return null;
    slides.push(prepared);
  }
  return { slides, compositions: added };
}
