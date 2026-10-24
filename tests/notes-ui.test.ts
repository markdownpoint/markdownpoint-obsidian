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
import { NotesUi, NOTES_UI_KEY } from "../src/settings/notes-ui.ts";
import type { LocalStorageHost } from "../src/settings/local-ui.ts";

function device(initial?: unknown): LocalStorageHost {
  const values = new Map<string, unknown>([[NOTES_UI_KEY, initial]]);
  return { loadLocalStorage: key => values.get(key), saveLocalStorage: (key, value) => { values.set(key, value); } };
}

void test("notes disclosure follows stable document/slide identities and survives a local reload", () => {
  const host = device();
  const notes = new NotesUi(host);
  const closed = notes.opened("document-a");
  notes.setOpen("document-a", "first", true);
  assert.equal(closed.has("first"), false);
  assert.equal(notes.opened("document-a").has("first"), true);
  assert.equal(new NotesUi(host).opened("document-a").has("first"), true);
  assert.equal(notes.opened("document-b").has("first"), false);
  notes.setOpen("document-a", "first", false);
  assert.deepEqual(host.loadLocalStorage(NOTES_UI_KEY), {});
});

void test("notes disclosure is not shared with another device's local storage", () => {
  const first = new NotesUi(device());
  const second = new NotesUi(device());
  first.setOpen("document-a", "first", true);
  assert.equal(second.opened("document-a").size, 0);
});

void test("malformed persisted notes values are ignored", () => {
  for (const value of [undefined, null, 1, [], { a: "first" }, { a: [1, null] }]) assert.equal(new NotesUi(device(value)).opened("a").size, 0);
});
