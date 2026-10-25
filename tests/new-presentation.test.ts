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
import { basicTheme, basicThemeFiles } from "../src/themes/basic.ts";
import { prepareNewPresentation } from "../src/format/new-presentation.ts";
import { indexPresentation } from "../src/format/document.ts";
import { readJsonObject } from "../src/format/json.ts";
import { presentationIdentity } from "../src/format/recognition.ts";
import { themeDocument } from "../src/format/embedded-theme.ts";

const document = "12345678-1234-4234-8234-123456789abc";

void test("the bundled licensed theme has a valid master and every ordered layout", () => {
  assert.equal(basicThemeFiles.size, 14);
  assert.equal(themeDocument(basicThemeFiles.get("master.json")!, "master")?.id, basicTheme.id);
  assert.equal(basicTheme.layouts.size, 13);
  for (const [key, layout] of basicTheme.layouts) {
    assert.ok(themeDocument(layout.source, "layout"), key);
    assert.equal(basicThemeFiles.get(`${key}.json`), layout.source);
    assert.doesNotMatch(layout.source, /layout-preview\.jpg/);
  }
});

void test("a new presentation has matching identity, the chosen theme, and empty title fields", () => {
  const made = prepareNewPresentation(basicTheme, document, "opening")!;
  const companion = readJsonObject(made.companion)!;
  assert.equal(presentationIdentity({ markdownpoint: 1, document }, companion), document);
  assert.equal(companion.theme, "basic");
  assert.deepEqual(companion.slides, { opening: { layout: "title" } });
  const body = made.markdown.indexOf("<!-- slide:");
  const indexed = indexPresentation(made.markdown, body)!;
  assert.equal(indexed.slides.length, 1);
  assert.match(made.markdown, /<!-- text: eyebrow -->\n\n<!-- text: title -->\n\n<!-- text: body -->\n\n<!-- notes -->\n$/);
  assert.doesNotMatch(made.markdown, /Presentation title|Presentation subtitle|Author and date/);
});

void test("each bundled layout can start a presentation without altering the template", () => {
  const before = JSON.stringify([...basicThemeFiles]);
  for (const key of basicTheme.layouts.keys()) {
    const made = prepareNewPresentation(basicTheme, document, "opening", key)!;
    assert.ok(made, key);
    assert.deepEqual(readJsonObject(made.companion)?.slides, { opening: { layout: key } });
    assert.equal(indexPresentation(made.markdown, made.markdown.indexOf("<!-- slide:"))?.slides.length, 1);
  }
  assert.equal(JSON.stringify([...basicThemeFiles]), before);
});

void test("creation refuses invalid identities, keys and missing layouts before returning file contents", () => {
  assert.equal(prepareNewPresentation(basicTheme, "invalid", "opening"), null);
  assert.equal(prepareNewPresentation(basicTheme, document, "../outside"), null);
  assert.equal(prepareNewPresentation(basicTheme, document, "opening", "missing"), null);
  assert.equal(prepareNewPresentation({ ...basicTheme, key: "../outside" }, document, "opening"), null);
  assert.equal(prepareNewPresentation({ ...basicTheme, layouts: new Map() }, document, "opening"), null);
});
