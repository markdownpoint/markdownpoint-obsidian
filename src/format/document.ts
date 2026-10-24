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

import { Lexer } from "marked";

export interface DocumentBlock {
  readonly kind: "text" | "notes";
  readonly id: string | null;
  readonly from: number;
  readonly contentFrom: number;
  to: number;
}

export interface DocumentSlide {
  readonly id: string;
  readonly from: number;
  readonly markerTo: number;
  readonly line: number;
  to: number;
  readonly blocks: DocumentBlock[];
}

export interface PresentationDocument {
  readonly slides: readonly DocumentSlide[];
  readonly sections: readonly DocumentSection[];
}

export interface DocumentSection {
  readonly id: string;
  readonly from: number;
  readonly markerTo: number;
  readonly line: number;
  to: number;
}

/** Section headings and reusable compositions are outside slide ranges. */
export function slideAtPosition(document: PresentationDocument, position: number): DocumentSlide | null {
  return document.slides.find(slide => position >= slide.from && position < slide.to) ?? null;
}

const marker = /^<!--\s*(slide|composition|section|text|control|notes)(?::\s*([^\s]+))?\s*-->[ \t]*$/;
const markerLike = /^<!--\s*(?:slide|composition|section|text|control|notes)(?=[:\s]|-->|$)(?:\s*:?\s*[^\s<>]*)?\s*(?:-->|$)/i;
const stableId = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** A candidate directive consumed by a code token is content, not a slide boundary. */
function inCode(markdown: string, line: string): boolean {
  const last = new Lexer().blockTokens(markdown.replace(/\r\n?/g, "\n")).at(-1);
  return last?.type === "code" && last.raw.trimEnd().endsWith(line.trimEnd());
}

/**
 * Indexes source ranges without rewriting or rendering Markdown. bodyStart is the
 * first offset after the already recognized frontmatter. Invalid structural
 * directives return null so consumers cannot navigate or decorate stale ranges.
 */
export function indexPresentation(markdown: string, bodyStart: number): PresentationDocument | null {
  const slides: DocumentSlide[] = [];
  const sections: DocumentSection[] = [];
  const seen = new Set<string>();
  const sectionIds = new Set<string>();
  let slide: DocumentSlide | null = null;
  let section: DocumentSection | null = null;
  let block: DocumentBlock | null = null;
  let container: "slide" | "composition" | null = null;
  let payloadFrom = bodyStart;
  let hasFence = false;
  let swallowedMarker = false;
  let offset = bodyStart;
  let lineNumber = markdown.slice(0, bodyStart).split("\n").length - 1;

  while (offset < markdown.length) {
    const newline = markdown.indexOf("\n", offset);
    const end = newline < 0 ? markdown.length : newline + 1;
    const line = markdown.slice(offset, newline < 0 ? end : newline).replace(/\r$/, "");
    hasFence ||= line.includes("```") || line.includes("~~~");
    // Each field is its own Markdown block. HTML or a fence-like line in one
    // field must not change how the next field is interpreted.
    const match = marker.exec(line);
    if (match || markerLike.test(line)) {
      if (hasFence && inCode(markdown.slice(payloadFrom, end), line)) {
        swallowedMarker = true;
        offset = end;
        lineNumber++;
        continue;
      }
      if (!match || newline < 0) return null;
      const kind = match[1];
      const id = match[2];
      if (kind === "notes" ? id !== undefined : !id || !id.split(".").every(part => stableId.test(part))) return null;
      if (kind !== "text" && id?.includes(".")) return null;

      if (block) block.to = offset;
      block = null;
      if (section) section.to = offset;
      section = null;
      if (kind === "slide" || kind === "composition" || kind === "section") {
        if (slide) slide.to = offset;
        slide = null;
        container = kind === "section" ? null : kind;
        if (kind === "section" && id) {
          if (sectionIds.has(id)) return null;
          sectionIds.add(id);
          section = { id, from: offset, markerTo: end, line: lineNumber, to: markdown.length };
          sections.push(section);
        }
        if (kind === "slide" && id) {
          if (seen.has(id)) return null;
          seen.add(id);
          slide = { id, from: offset, markerTo: end, line: lineNumber, to: markdown.length, blocks: [] };
          slides.push(slide);
        }
      } else {
        if (!container || (kind === "control" && container !== "composition")) return null;
        if (slide && (kind === "text" || kind === "notes")) {
          block = { kind, id: id ?? null, from: offset, contentFrom: end, to: markdown.length };
          slide.blocks.push(block);
        }
      }
      payloadFrom = end;
      hasFence = false;
      swallowedMarker = false;
    }
    offset = end;
    lineNumber++;
  }
  if (swallowedMarker) {
    const last = new Lexer().blockTokens(markdown.slice(payloadFrom).replace(/\r\n?/g, "\n")).at(-1);
    if (last?.type === "code") {
      const fence = /^ {0,3}(`{3,}|~{3,})/.exec(last.raw)?.[1];
      const closing = last.raw.trimEnd().split("\n").at(-1) ?? "";
      if (fence && !new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*$`).test(closing)) return null;
    }
  }
  return { slides, sections };
}
