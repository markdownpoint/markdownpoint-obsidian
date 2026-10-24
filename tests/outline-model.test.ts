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

import assert from "node:assert/strict";
import test from "node:test";
import { indexPresentation } from "../src/format/document.ts";
import { outlineRows, outlineSections, outlineSlides } from "../src/outline/model.ts";

void test("outline labels use the first authored text, omit formatting, and ignore speaker notes", () => {
  const markdown = '<!-- slide: first -->\n<!-- notes -->\nA private reminder.\n<!-- text: empty -->\n\n<!-- text: heading -->\n# **A clear [idea](https://example.com)** &amp; `&amp;`\n\n<!-- slide: empty -->\n<!-- text: heading -->\n';
  const document = indexPresentation(markdown, 0)!;
  const slides = outlineSlides(markdown, document, "Title", new Set());
  assert.deepEqual(slides.map(slide => [slide.id, slide.title]), [
    ["first", "A clear idea & &amp;"], ["empty", "Title"],
  ]);
  assert.equal(slides[1]!.line, markdown.slice(0, document.slides[1]!.from).split("\n").length - 1);
});

void test("HTML tags and leading single-line or multiline comments are omitted from outline labels", () => {
  for (const text of ['<span>Heading</span>', '<!-- annotation -->\nHeading', '<!--\nAn annotation.\n-->\n# Heading']) {
    const markdown = `<!-- slide: first -->\n<!-- text: heading -->\n${text}\n`;
    assert.equal(outlineSlides(markdown, indexPresentation(markdown, 0)!, "Title", new Set())[0]!.title, "Heading");
  }
});

void test("populated Title takes precedence over earlier Eyebrow and Body fields, with authored fallbacks", () => {
  const markdown = '<!-- slide: first -->\n<!-- text: eyebrow -->\nOpening thought\n<!-- text: body -->\nEarlier body.\n<!-- text: title -->\n**A place to begin**\n<!-- notes -->\nA reminder.\n<!-- slide: empty-title -->\n<!-- text: eyebrow -->\nA useful lead\n<!-- text: title -->\n\n<!-- text: body -->\nDetails.\n<!-- slide: comment-title -->\n<!-- text: title -->\n<!-- An annotation. -->\n<!-- text: body -->\nA real fallback.\n';
  const slides = outlineSlides(markdown, indexPresentation(markdown, 0)!, "Title", new Set());
  assert.deepEqual(slides.map(slide => slide.title), ["A place to begin", "A useful lead", "A real fallback."]);
});

void test("a numbered or duplicated Title keeps priority over earlier body text", () => {
  for (const id of ["title-2", "title-id-b7d9e1", "title-2-id-b7d9e1", "card.title"]) {
    const markdown = `<!-- slide: first -->\n<!-- text: body -->\nEarlier body\n<!-- text: ${id} -->\nThe main idea\n`;
    assert.equal(outlineSlides(markdown, indexPresentation(markdown, 0)!, "Title", new Set())[0]!.title, "The main idea", id);
  }
});

void test("sections keep authored names, empty sections, and continuous numbers around skipped slides", () => {
  const markdown = '<!-- section: intro -->\r\n# *A beginning* &amp; a promise\r\n\r\n<!-- slide: first -->\r\n<!-- text: title -->\r\nFirst idea.\r\n<!-- slide: skipped -->\r\n<!-- text: title -->\r\nAn aside.\r\n<!-- section: empty -->\r\n# Room to think\r\n<!-- section: closing -->\r\n# Closing\r\n<!-- slide: last -->\r\n<!-- text: title -->\r\nA last thought.\r\n<!-- section: trailing -->\r\n# Later\r\n';
  const document = indexPresentation(markdown, 0)!;
  const sections = outlineSections(markdown, document);
  const slides = outlineSlides(markdown, document, "Title", new Set(["skipped"]));
  assert.deepEqual(outlineRows({ documentId: "test-document", path: "slides.md", slides, sections }, String).map(row => [row.kind, row.label]), [
    ["section", "A beginning & a promise"], ["slide", "1. First idea."], ["slide", "– An aside."],
    ["section", "Room to think"], ["section", "Closing"], ["slide", "2. A last thought."], ["section", "Later"],
  ]);
  const allSkipped = slides.map(slide => ({ ...slide, skipped: true }));
  assert.ok(outlineRows({ documentId: "test-document", path: "slides.md", slides: allSkipped, sections }, String)
    .filter(row => row.kind === "slide").every(row => row.label.startsWith("– ")));
  assert.equal(outlineRows({ documentId: "test-document", path: "slides.md", slides: [], sections }, String).length, 4);
});

void test("a temporary empty or incomplete section heading keeps the slide structure available", () => {
  for (const words of ["", "# ", "Plain words", "## Subheading", "# Invalid\u0007name"]) {
    const markdown = `<!-- section: opening -->\n${words}\n<!-- slide: first -->\n`;
    const document = indexPresentation(markdown, 0)!;
    assert.deepEqual(outlineSections(markdown, document).map(section => [section.id, section.title]), [["opening", ""]], words);
    assert.equal(document.slides.length, 1);
  }
});
