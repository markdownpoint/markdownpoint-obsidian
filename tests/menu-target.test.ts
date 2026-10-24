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
import { slideForMenu } from "../src/editor/menu-target.ts";

const source = "\n<!-- section: opening -->\nOpening\n<!-- slide: one -->\n<!-- text: body -->\nFirst\n\n\n<!-- slide: two -->\n<!-- text: body -->\nSecond\n";

void test("slide menu targets fields, inter-slide whitespace and EOF without targeting section names", () => {
  const document = indexPresentation(source, 0)!;
  assert.equal(slideForMenu(document, source.indexOf("First"), source)?.id, "one");
  assert.equal(slideForMenu(document, source.indexOf("\n\n\n") + 2, source)?.id, "one");
  assert.equal(slideForMenu(document, source.indexOf("<!-- slide: two"), source)?.id, "two");
  assert.equal(slideForMenu(document, source.length, source)?.id, "two");
  assert.equal(slideForMenu(document, source.indexOf("Opening"), source), null);
});

void test("draft margins select their nearest slide but reusable composition text is excluded", () => {
  const source = "\n\n<!-- slide: one -->\n<!-- text: title -->\nFirst\n<!-- composition: reusable -->\n<!-- control: title -->\nShared words\n";
  const document = indexPresentation(source, 0)!;
  assert.equal(slideForMenu(document, 0, source)?.id, "one");
  assert.equal(slideForMenu(document, source.indexOf("Shared"), source), null);
  assert.equal(slideForMenu(document, source.length, source), null);
  assert.equal(slideForMenu(document, -1, source), null);
  assert.equal(slideForMenu({ slides: [], sections: [] }, 0, ""), null);
});

void test("a leading composition and frontmatter do not borrow the first slide's actions", () => {
  const source = "<!-- composition: shared -->\n<!-- control: title -->\nReusable words\n<!-- slide: actual -->\n<!-- text: body -->\nSlide words\n";
  const document = indexPresentation(source, 0)!;
  assert.equal(slideForMenu(document, source.indexOf("Reusable"), source), null);
  const header = "---\nmarkdownpoint: 1\n---\n";
  const plain = header + "\n<!-- slide: actual -->\n<!-- text: body -->\nWords\n";
  const indexed = indexPresentation(plain, header.length)!;
  assert.equal(slideForMenu(indexed, 0, plain, header.length), null);
  assert.equal(slideForMenu(indexed, header.length, plain, header.length)?.id, "actual");
});
