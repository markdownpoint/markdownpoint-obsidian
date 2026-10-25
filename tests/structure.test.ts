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
import { slideStructure } from "../src/format/structure.ts";
import type { EmbeddedTheme } from "../src/format/embedded-theme.ts";

const field = { id: "title", type: "text", placeholder: true, frame: { x: 100, y: 100, width: 800, height: 180 } };
const staticText = { id: "footer", type: "text", frame: { x: 100, y: 800, width: 500, height: 60 } };
const master = { markdownpoint: 1, kind: "master", size: { width: 1600, height: 900 }, objects: [staticText], text: { footer: "Fixed" } };
const layout = { markdownpoint: 1, kind: "layout", objects: [field] };
const theme: EmbeddedTheme = { id: "id", root: "deck/designs/id", master: { path: "master.json", source: JSON.stringify(master), value: master },
  layouts: new Map([["title", { path: "title.json", source: JSON.stringify(layout), value: layout }]]) };
void test("structural preview resolves actual frame dimensions and partial inherited overrides", () => {
  const preview = slideStructure({ layout: "title", overrides: { title: { frame: { x: 300 } }, footer: null } }, theme)!;
  assert.equal(preview.width, 1600);
  assert.equal(preview.height, 900);
  assert.deepEqual(preview.regions, [{ x: 300, y: 100, width: 800, height: 180, rotation: 0, kind: "text", columns: 1, gutter: 48 }]);
});

void test("text areas retain their whole frame and column divisions", () => {
  const preview = slideStructure({ layout: "title", overrides: { footer: null, title: { "column-count": 2, "column-gutter": 40 } } }, theme)!;
  assert.equal(preview.regions[0]!.columns, 2);
  assert.equal(preview.regions[0]!.gutter, 40);
  assert.equal(preview.regions[0]!.height, 180);
});

void test("unknown geometry, hidden objects and hierarchy are omitted; framed media stays neutral", () => {
  const preview = slideStructure({ layout: "title", overrides: { footer: null, title: { hidden: true } }, objects: [
    { ...field, id: "nested", parent: "group" }, { ...field, id: "scaled", scale: { x: 2, y: 2 } },
    { id: "model", type: "model", location: { x: 1, y: 2, z: 3 } },
    { ...field, id: "photo", type: "image", rotation: 15, asset: "media/private-name.jpg" },
  ] }, theme)!;
  assert.equal(preview.regions.length, 1);
  assert.equal(preview.regions[0]!.kind, "media");
  assert.equal(preview.regions[0]!.rotation, 15);
  assert.equal(preview.key.includes("private-name"), false);
  assert.equal(slideStructure({ layout: "missing" }, theme), null);
  assert.equal(slideStructure({ layout: "title" }, null), null);
});

void test("an own object cannot replace an inherited frame by colliding with its identity", () => {
  const preview = slideStructure({ layout: "title", objects: [{ ...field, frame: { x: 0, y: 0, width: 10, height: 10 } }] }, theme)!;
  assert.equal(preview.regions[1]!.width, 800);
});

void test("null rotation and scale overrides reset to flat defaults without removing the region", () => {
  for (const reset of [{ rotation: null }, { scale: null }, { rotation: null, scale: null }]) {
    const preview = slideStructure({ layout: "title", overrides: { title: reset, footer: null } }, theme)!;
    assert.equal(preview.regions.length, 1);
    assert.equal(preview.regions[0]!.rotation, 0);
  }
});

void test("partial scale overrides merge inherited components before testing flat geometry", () => {
  const scaledLayout = { ...layout, objects: [{ ...field, scale: { x: 2, y: 1 } }] };
  const scaled = { ...theme, layouts: new Map([["title", { path: "title.json", source: JSON.stringify(scaledLayout), value: scaledLayout }]]) };
  const preview = slideStructure({ layout: "title", overrides: { title: { scale: { x: 1 } }, footer: null } }, scaled)!;
  assert.equal(preview.regions.length, 1);
  assert.equal(preview.regions[0]!.width, 800);
});
