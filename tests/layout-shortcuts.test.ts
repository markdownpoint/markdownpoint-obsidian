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
import { assignLayoutDigit, layoutDigit, LayoutShortcuts, readLayoutAssignments } from "../src/settings/layout-shortcuts.ts";

void test("default digits follow MDP layout keys across themes; an empty map means no shortcuts", () => {
  const defaults = readLayoutAssignments(undefined);
  assert.equal(defaults["1"], "section"); assert.equal(defaults["4"], "content-with-header"); assert.equal(defaults["9"], "blank");
  assert.deepEqual(readLayoutAssignments({}), {});
  for (const value of [{ "0": "title" }, { "1": "bad key" }, { "1": "title", "2": "title" }]) assert.deepEqual(readLayoutAssignments(value), defaults);
});

void test("assigning or removing a digit keeps layout and digit assignments exclusive", () => {
  const initial = { "1": "section", "2": "body", "3": "title" };
  const reassigned = assignLayoutDigit(initial, "title", "1");
  assert.deepEqual(reassigned, { "1": "title", "2": "body" });
  assert.equal(layoutDigit(reassigned, "section"), null);
  assert.deepEqual(assignLayoutDigit(reassigned, "title", null), { "2": "body" });
  assert.deepEqual(initial, { "1": "section", "2": "body", "3": "title" });
});

void test("shared settings preserve unrelated data, serialize assignments, and survive reload", async () => {
  let disk: unknown = { untouched: { mode: "keep" }, layoutShortcuts: {} };
  const writes: unknown[] = [];
  const host = { loadData: () => Promise.resolve(disk), saveData: (data: unknown) => { writes.push(data); disk = data; return Promise.resolve(); } };
  const settings = new LayoutShortcuts(host); await settings.ready;
  await Promise.all([settings.assign("title", "1"), settings.assign("body", "2"), settings.assign("title", "3")]);
  assert.deepEqual(settings.value, { "2": "body", "3": "title" });
  assert.deepEqual(disk, { untouched: { mode: "keep" }, layoutShortcuts: { "2": "body", "3": "title" } });
  assert.equal(writes.length, 3);
  const reopened = new LayoutShortcuts(host); await reopened.ready; assert.deepEqual(reopened.value, settings.value);
  disk = { untouched: { mode: "remote" }, layoutShortcuts: { "9": "title" } };
  await reopened.reload(); assert.deepEqual(reopened.value, { "9": "title" });
});

void test("a failed settings save does not publish the assignment or block a later change", async () => {
  let fail = true;
  const settings = new LayoutShortcuts({ loadData: () => Promise.resolve({ layoutShortcuts: {} }), saveData: () => fail ? Promise.reject(new Error("Write failed")) : Promise.resolve() });
  await settings.ready;
  await assert.rejects(settings.assign("title", "1")); assert.deepEqual(settings.value, {});
  fail = false; await settings.assign("title", "2"); assert.deepEqual(settings.value, { "2": "title" });
});

void test("an external settings reload waits for pending writes without deadlocking subsequent assignments", async () => {
  let finish!: () => void, signal!: () => void, disk: unknown = { layoutShortcuts: {} };
  const started = new Promise<void>(resolve => { signal = resolve; });
  let first = true;
  const settings = new LayoutShortcuts({ loadData: () => Promise.resolve(disk), saveData: async data => {
    if (first) { first = false; signal(); await new Promise<void>(resolve => { finish = resolve; }); }
    disk = data;
  } });
  await settings.ready;
  const saved = settings.assign("title", "1"); await started;
  const reload = settings.reload(), another = settings.assign("body", "2"); finish();
  await Promise.all([saved, reload, another]); assert.deepEqual(settings.value, { "1": "title", "2": "body" });
});
