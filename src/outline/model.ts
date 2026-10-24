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
import { decodeHTMLStrict } from "entities";
import { isRecord } from "../format/recognition.ts";
import type { PresentationDocument } from "../format/document.ts";
import type { ListSelection } from "../selection/list-selection.ts";

export interface OutlineSlide {
  readonly id: string;
  readonly title: string;
  readonly line: number;
  readonly skipped: boolean;
}

export interface OutlineSection {
  readonly id: string;
  readonly title: string;
  readonly line: number;
}

/** A verified format adapter supplies this view model; the outline never discovers files itself. */
export interface OutlinePresentation {
  readonly path: string;
  readonly slides: readonly OutlineSlide[];
  readonly sections: readonly OutlineSection[];
}

export interface OutlineState {
  readonly presentation: OutlinePresentation | null;
  readonly activeSlideId: string | null;
  readonly selection: ListSelection<string>;
}

function inlineText(tokens: readonly unknown[]): string {
  return tokens.map(token => {
    if (!isRecord(token)) return "";
    if (token.type === "html") return "";
    if (token.type === "br") return "\n";
    const children: unknown = token.tokens;
    if (Array.isArray(children)) return inlineText(children);
    if (typeof token.text !== "string") return "";
    return token.type === "text" ? decodeHTMLStrict(token.text) : token.text;
  }).join("");
}

/** Prefer authored Title text, then the first other text; notes never supply labels. */
export function outlineSlides(markdown: string, document: PresentationDocument, emptyTitle: string, skipped: ReadonlySet<string>): OutlineSlide[] {
  return document.slides.map(slide => {
    let title = "";
    const blocks = [
      ...slide.blocks.filter(block => block.kind === "text" && block.id === "title"),
      ...slide.blocks.filter(block => block.kind === "text" && block.id !== "title"),
    ];
    for (const block of blocks) {
      // Tokenize the payload together so a multiline HTML comment is omitted as
      // one token rather than exposing its middle lines as an outline label.
      const source = markdown.slice(block.contentFrom, block.to).replace(/^#{1,6}[ \t]+/gm, "");
      title = inlineText(Lexer.lexInline(source)).split(/\r?\n/).find(line => line.trim())?.trim() ?? "";
      if (title) break;
    }
    return { id: slide.id, title: title || emptyTitle, line: slide.line, skipped: skipped.has(slide.id) };
  });
}

/** Editable headings may be temporarily empty; that does not change slide structure. */
export function outlineSections(markdown: string, document: PresentationDocument): OutlineSection[] {
  const sections: OutlineSection[] = [];
  for (const section of document.sections) {
    const tokens = Lexer.lex(markdown.slice(section.markerTo, section.to).replace(/\r\n?/g, "\n").trim())
      .filter(token => token.type !== "space");
    const heading = tokens[0];
    let title = heading?.type === "heading" && heading.depth === 1 ? inlineText(heading.tokens ?? []).trim() : "";
    if ([...title].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) title = "";
    sections.push({ id: section.id, title, line: section.line });
  }
  return sections;
}

export interface OutlineRow {
  readonly kind: "slide" | "section";
  readonly id: string;
  readonly label: string;
}

/** Section headers and skipped slides never consume a slide number. */
export function outlineRows(presentation: OutlinePresentation, formatNumber: (number: number) => string): OutlineRow[] {
  const numbers = outlineSlideNumbers(presentation.slides, formatNumber);
  const slides = presentation.slides.map(slide => ({
    kind: "slide" as const, id: slide.id, line: slide.line,
    label: `${numbers.get(slide.id)}${slide.skipped ? "" : "."} ${slide.title}`,
  }));
  const sections = presentation.sections.map(section => ({
    kind: "section" as const, id: section.id, line: section.line, label: section.title,
  }));
  return [...slides, ...sections].sort((a, b) => a.line - b.line);
}

export function outlineSlideNumbers(slides: readonly OutlineSlide[], formatNumber: (number: number) => string): ReadonlyMap<string, string> {
  let number = 0;
  return new Map(slides.map(slide => [slide.id, slide.skipped ? "–" : formatNumber(++number)]));
}
