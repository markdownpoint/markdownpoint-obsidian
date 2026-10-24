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
import { outlineSlides } from "../src/outline/model.ts";

void test("outline labels use the first authored text, omit formatting, and ignore speaker notes", () => {
  const markdown = '<!-- slide: first -->\n<!-- notes -->\nA private reminder.\n<!-- text: empty -->\n\n<!-- text: heading -->\n# **A clear [idea](https://example.com)** &amp; `&amp;`\n\n<!-- slide: empty -->\n<!-- text: heading -->\n';
  const document = indexPresentation(markdown, 0)!;
  const slides = outlineSlides(markdown, document, "Title");
  assert.deepEqual(slides.map(slide => [slide.id, slide.title]), [
    ["first", "A clear idea & &amp;"], ["empty", "Title"],
  ]);
  assert.equal(slides[1]!.line, markdown.slice(0, document.slides[1]!.from).split("\n").length - 1);
});

void test("HTML tags and leading single-line or multiline comments are omitted from outline labels", () => {
  for (const text of ['<span>Heading</span>', '<!-- annotation -->\nHeading', '<!--\nAn annotation.\n-->\n# Heading']) {
    const markdown = `<!-- slide: first -->\n<!-- text: heading -->\n${text}\n`;
    assert.equal(outlineSlides(markdown, indexPresentation(markdown, 0)!, "Title")[0]!.title, "Heading");
  }
});
