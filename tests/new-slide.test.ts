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
import { prepareNewSlide, orderedLayouts, layoutName } from "../src/format/new-slide.ts";
import { indexPresentation } from "../src/format/document.ts";
import { planSlideInsertion } from "../src/format/insert.ts";
import type { EmbeddedTheme } from "../src/format/embedded-theme.ts";

function theme(value: Record<string, unknown>): EmbeddedTheme {
  return { key: "basic", id: "theme", root: "deck/themes/basic", master: { path: "master.json", source: "{}", value: { objects: [{ id: "footer", type: "text" }], "layout-order": ["title", "missing", "title"] } },
    layouts: new Map([["title", { path: "title.json", source: JSON.stringify(value), value }], ["blank", { path: "blank.json", source: "{}", value: {} }]]) };
}
const layouts = theme({ objects: [
  { id: "body", type: "text", placeholder: true, frame: { x: 80, y: 300, width: 600, height: 240 } },
  { id: "title", type: "text", placeholder: true, frame: { x: 80, y: 150, width: 600, height: 100 } },
  { id: "eyebrow", type: "text", placeholder: true, frame: { x: 80, y: 60, width: 600, height: 60 } },
  { id: "picture", type: "image", placeholder: true },
  { id: "footer", type: "text", placeholder: true },
  { id: "branding", type: "text" },
], text: { title: "Do not save sample words", branding: "Fixed artwork" } });

void test("a new slide exposes empty writing slots in reading order without persisting samples or images", () => {
  const part = prepareNewSlide(layouts, "title", "new-slide")!;
  assert.deepEqual(JSON.parse(part.record), { layout: "title" });
  const document = indexPresentation(part.markdown, 0)!;
  assert.deepEqual(document.slides[0]!.blocks.map(block => [block.kind, block.id]), [["text", "eyebrow"], ["text", "title"], ["text", "body"], ["notes", null]]);
  assert.equal(part.markdown.includes("sample"), false);
  assert.equal(part.markdown.includes("picture"), false);
  assert.equal(part.markdown.includes("footer"), false);
  for (const block of document.slides[0]!.blocks) assert.equal(part.markdown.slice(block.contentFrom, block.to).trim(), "");
});

void test("a blank layout still creates a valid slide with an empty notes field", () => {
  const part = prepareNewSlide(layouts, "blank", "blank-slide")!;
  const document = indexPresentation(part.markdown, 0)!;
  assert.equal(document.slides.length, 1);
  assert.deepEqual(document.slides[0]!.blocks.map(block => block.kind), ["notes"]);
  assert.ok(planSlideInsertion("", indexPresentation("", 0)!, '{"slides":{}}', [part], null, 0));
});

void test("new slide insertion keeps surrounding source and metadata intact", () => {
  const source = '<!-- slide: old -->\n<!-- text: title -->\nExisting words\n<!-- notes -->\nKeep notes.\n';
  const part = prepareNewSlide(layouts, "title", "next")!;
  const companion = '{"unknown":9007199254740993,"slides":{"old":{"layout":"title","custom":true}}}';
  const plan = planSlideInsertion(source, indexPresentation(source, 0)!, companion, [part], "old", 0)!;
  assert.equal(plan.changes[0]!.from, source.length);
  assert.ok(plan.companion.includes('"unknown":9007199254740993'));
  assert.deepEqual(plan.document.slides.map(slide => slide.id), ["old", "next"]);
});

void test("layout inventory preserves declared order and rejects unsafe or duplicate writing identities", () => {
  assert.deepEqual(orderedLayouts(layouts), ["title", "blank"]);
  assert.equal(layoutName("text-image", {}), "Text image");
  assert.equal(layoutName("internal", { name: "Two ideas" }), "Two ideas");
  assert.equal(prepareNewSlide(layouts, "missing", "new"), null);
  assert.equal(prepareNewSlide(layouts, "title", "bad -->"), null);
  assert.equal(prepareNewSlide(theme({ objects: [{ id: "same", type: "text", placeholder: true }, { id: "same", type: "text", placeholder: true }] }), "title", "new"), null);
});

void test("multicolumn writing reads down each column under a spanning title", () => {
  const field = (id: string, x: number, y: number, width: number, height: number) => ({ id, type: "text", placeholder: true, frame: { x, y, width, height } });
  const columns = theme({ objects: [field("right-body", 520, 260, 420, 320), field("title", 40, 40, 900, 90),
    field("left-body", 40, 250, 400, 350), field("right-heading", 520, 150, 420, 90), field("left-heading", 40, 160, 400, 80)] });
  const part = prepareNewSlide(columns, "title", "new")!;
  assert.deepEqual(indexPresentation(part.markdown, 0)!.slides[0]!.blocks.filter(block => block.kind === "text").map(block => block.id),
    ["title", "left-heading", "left-body", "right-heading", "right-body"]);
});
