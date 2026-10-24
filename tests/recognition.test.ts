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
import { presentationCompanionPath, presentationIdentity } from "../src/format/recognition.ts";

const document = "12345678-1234-7234-9234-123456789abc";
const frontmatter = { markdownpoint: 1, document };
const companion = { markdownpoint: 1, kind: "presentation", document, slides: {} };

void test("the fixed companion stays beside slides.md at the vault root or in a nested folder", () => {
  assert.equal(presentationCompanionPath("slides.md"), "presentation.mdpoint");
  assert.equal(presentationCompanionPath("Talks/Årets möte/slides.md"), "Talks/Årets möte/presentation.mdpoint");
  for (const path of ["slides.md.bak", "notes.md", "slides.md/notes.md", "slides.md/"]) {
    assert.equal(presentationCompanionPath(path), null);
  }
});

void test("format-1 metadata with the same canonical document identity recognizes the pair", () => {
  assert.equal(presentationIdentity(frontmatter, companion), document);
});

void test("a missing or unrelated companion and ordinary frontmatter do not recognize a presentation", () => {
  for (const value of [null, undefined, false, [], "presentation", {}, { document }]) {
    assert.equal(presentationIdentity(frontmatter, value), null);
    assert.equal(presentationIdentity(value, companion), null);
  }
  assert.equal(presentationIdentity(frontmatter, { ...companion, kind: "theme" }), null);
});

void test("each file must declare the supported numeric format version", () => {
  for (const markdownpoint of [undefined, "1", 0, 2, 1.5]) {
    assert.equal(presentationIdentity({ ...frontmatter, markdownpoint }, companion), null);
    assert.equal(presentationIdentity(frontmatter, { ...companion, markdownpoint }), null);
  }
});

void test("a mismatched, missing, or noncanonical identity does not activate presentation behavior", () => {
  assert.equal(presentationIdentity(frontmatter, { ...companion, document: "87654321-1234-7234-9234-123456789abc" }), null);
  for (const value of [undefined, "", "not-a-uuid", document.toUpperCase(), ` ${document}`]) {
    assert.equal(presentationIdentity({ ...frontmatter, document: value }, { ...companion, document: value }), null);
  }
});

void test("recognition leaves unrelated frontmatter and presentation data untouched", () => {
  const markdown = { ...frontmatter, tags: ["writing"], nested: { author: "A writer" } };
  const data = { ...companion, extra: { future: true }, slides: { opening: { layout: "title" } } };
  const before = structuredClone({ markdown, data });
  assert.equal(presentationIdentity(markdown, data), document);
  assert.deepEqual({ markdown, data }, before);
});
