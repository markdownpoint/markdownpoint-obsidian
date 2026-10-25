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
import { assignedSlideImages } from "../src/format/slide-images.ts";
import { readSlideImages } from "../src/presentation/image-reader.ts";
import type { EmbeddedTheme } from "../src/format/embedded-theme.ts";
import { SharedSettings } from "../src/settings/shared.ts";
import { EditorState } from "@codemirror/state";
import { history, undoDepth } from "@codemirror/commands";
import { imageSpacing, imageSpaceNeeded, setImageSpacing } from "../src/editor/image-spacing.ts";

const path = "Talks/Field notes/slides.md", root = "Talks/Field notes/";
const master = { schemes: { evening: { appearance: "dark" } }, objects: [{ id: "logo", type: "image", asset: { light: "art/light.svg", dark: "art/dark.svg" } }] };
const layout = { scheme: "evening", objects: [{ id: "hero", type: "image", placeholder: true, asset: "art/sample.svg" }, { id: "detail", type: "image", placeholder: true }] };
const theme: EmbeddedTheme = { id: "uuid", key: "field-notes", root: root + "themes/field-notes", master: { path: "master.json", source: "{}", value: master },
  layouts: new Map([["title", { path: "title.json", source: "{}", value: layout }]]) };
const paths = (value: unknown, embedded: EmbeddedTheme | null = theme) => assignedSlideImages(path, value, "one", embedded).map(image => image.path);

void test("assigned images prioritize background, named layout slots, then other pictures", () => {
  const companion = { background: { image: "media/back.svg" }, slides: { one: { layout: "title", overrides: { hero: { asset: "media/hero.svg" }, detail: { asset: "generated/detail.png" } },
    objects: [{ id: "own", type: "image", asset: "media/own.jpg", "image-result": { source: "media/history.jpg" } }] } } };
  assert.deepEqual(paths(companion), [root + "media/back.svg", root + "media/hero.svg", root + "generated/detail.png", root + "themes/field-notes/art/dark.svg", root + "media/own.jpg"]);
});

void test("cleared backgrounds, removed objects and empty placeholders do not show samples or prior generations", () => {
  const companion = { background: { image: "media/back.svg" }, slides: { one: { layout: "title", background: { image: "none" }, overrides: { logo: null, hero: { asset: "" } } } } };
  assert.deepEqual(paths(companion), []);
  assert.deepEqual(paths({ slides: { one: { background: { image: "media/own.png" }, objects: [] } } }, null), [root + "media/own.png"]);
});

void test("repeated assets are shown once and video assignments are not treated as images", () => {
  const companion = { background: { image: "media/same.png" }, slides: { one: { layout: "title", overrides: { logo: null, hero: { asset: "media/same.png" }, detail: { asset: "media/clip.mp4" } },
    objects: [{ id: "again", type: "image", asset: "media/same.png" }, { id: "video-slot", type: "video", asset: "media/new.jpg" }] } } };
  assert.deepEqual(paths(companion), [root + "media/same.png", root + "media/new.jpg"]);
});

void test("image references cannot escape their declared vault folder or load a remote URL", () => {
  for (const asset of ["../outside.png", "/outside.png", "media/../../outside.png", "media\\outside.png", "https://example.com/image.png", "file:///tmp/image.png", "misc/image.png"]) {
    assert.deepEqual(paths({ slides: { one: { objects: [{ id: "picture", type: "image", asset }] } } }, null), []);
  }
  assert.deepEqual(paths({ slides: { one: { objects: [{ id: "picture", type: "image", asset: "media/Wait... what.PNG" }] } } }, null), [root + "media/Wait... what.PNG"]);
});

void test("placed compositions use assigned media controls without listing unused defaults or looping", () => {
  const companion = { slides: { one: { objects: [{ id: "instance", type: "composition", source: "card", controls: { picture: "media/selected.svg" } }] } }, compositions: {
    card: { controls: { picture: { type: "media", default: "media/default.svg" }, unused: { type: "media", default: "media/unused.svg" } }, objects: [
      { id: "photo", type: "image", asset: "media/original.svg", bind: { asset: "picture" } },
      { id: "loop", type: "composition", source: "card" },
    ] },
  } };
  assert.deepEqual(paths(companion, null), [root + "media/selected.svg"]);
});

void test("only five existing vault resources are loaded, with the Vault API owning URLs", () => {
  const references = Array.from({ length: 8 }, (_, index) => ({ path: `media/${index}.png`, name: null, category: "image" as const }));
  const vault = { getFileByPath: (path: string) => path === "media/0.png" ? null : { path }, getResourcePath: (file: { path: string }) => `app://owned/${file.path}?mtime=10` };
  const images = readSlideImages(vault, references);
  assert.equal(images.length, 5); assert.equal(images[0]!.path, "media/1.png"); assert.equal(images[4]!.path, "media/5.png");
  assert.ok(images.every(image => image.src.startsWith("app://owned/")));
});

void test("image visibility defaults on and shares one serialized settings owner with layout shortcuts", async () => {
  let data: unknown = { unrelated: true, layoutShortcuts: { "1": "title" } };
  const host = { loadData: () => Promise.resolve(data), saveData: (next: unknown) => { data = next; return Promise.resolve(); } };
  const settings = new SharedSettings(host); await settings.ready; assert.equal(settings.showSlideImages, true);
  await Promise.all([settings.setShowSlideImages(false), settings.assign("body", "2")]);
  assert.deepEqual(data, { unrelated: true, layoutShortcuts: { "1": "title", "2": "body" }, showSlideImages: false });
  const reloaded = new SharedSettings(host); await reloaded.ready; assert.equal(reloaded.showSlideImages, false);
});

void test("image clearance adds only the missing height and never enters source or undo history", () => {
  assert.equal(imageSpaceNeeded(200, 280), 0); assert.equal(imageSpaceNeeded(200.25, 100), 101);
  const state = EditorState.create({ doc: "Words remain words.", extensions: [imageSpacing, history()] });
  const after = state.update({ effects: setImageSpacing.of({ id: "document", heights: new Map([["slide", 101]]) }) }).state;
  assert.equal(after.doc.toString(), state.doc.toString()); assert.equal(undoDepth(after), 0);
});
