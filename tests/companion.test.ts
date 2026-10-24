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
import { CompanionDocument, reconcileSlideRecords } from "../src/format/companion.ts";

void test("record changes combine removals, replacements and additions without damaging separators", () => {
  const source = '{"untouched":1,"slides":{"a":{"v":1},"b":{"v":2},"c":{"v":3}},"tail":2}';
  for (let mask = 0; mask < 8; mask++) {
    const changes = new Map<string, string | null>(["a", "b", "c"].map((id, index) => [id, mask & (1 << index) ? null : '{"new":true}']));
    changes.set("d", '{"added":4}');
    changes.set("e", '{"added":5}');
    const changed = CompanionDocument.read(source)!.change(changes)!;
    assert.deepEqual(JSON.parse(changed), { untouched: 1, slides: {
      ...Object.fromEntries(["a", "b", "c"].filter((_, index) => !(mask & (1 << index))).map(id => [id, { new: true }])),
      d: { added: 4 }, e: { added: 5 },
    }, tail: 2 });
  }
  assert.deepEqual(JSON.parse(CompanionDocument.read('{"slides":{}}')!.change(new Map([["a", '{}']]))!), { slides: { a: {} } });
});

void test("a remembered record returns when its native Markdown marker returns", () => {
  const raw = String.raw`{ "layout": "title", "unknown": 900719925474099312345, "escaped": "\u00e9" }`;
  const source = `{"slides":{"a":${raw},"b":{}},"keep":true}`;
  const saved = new Map([["a", raw]]);
  const deleted = reconcileSlideRecords(source, saved, new Set(["b"]))!;
  assert.deepEqual(JSON.parse(deleted.companion), { slides: { b: {} }, keep: true });
  assert.equal(deleted.remembered.get("a"), raw);
  const restored = reconcileSlideRecords(deleted.companion, deleted.remembered, new Set(["a", "b"]))!;
  assert.equal(CompanionDocument.read(restored.companion)!.records.get("a"), raw);
  assert.equal(reconcileSlideRecords(restored.companion, restored.remembered, new Set(["a", "b"]))!.companion, restored.companion);
});

void test("newer external record data is retained and unmanaged orphan records are not removed", () => {
  const saved = new Map([["a", '{"old":true}']]);
  const source = '{"slides":{"a":{"external":true},"orphan":{"preserve":true}},"externalSetting":3}';
  const result = reconcileSlideRecords(source, saved, new Set())!;
  assert.equal(result.remembered.get("a"), '{"external":true}');
  assert.deepEqual(JSON.parse(result.companion), { slides: { orphan: { preserve: true } }, externalSetting: 3 });
  const restored = reconcileSlideRecords(result.companion, result.remembered, new Set(["a"]))!;
  assert.equal(CompanionDocument.read(restored.companion)!.records.get("a"), '{"external":true}');
});

void test("malformed replacement records refuse without changing source", () => {
  const source = '{"slides":{"a":{}}}';
  for (const raw of ["null", "[]", "{", '{} , "injected": {}', '{"a":1,}', '{/*comment*/}']) {
    assert.equal(CompanionDocument.read(source)!.change(new Map([["a", raw]])), null, raw);
  }
  assert.equal(CompanionDocument.read(source)!.change(new Map()), source);
});
