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
import { CompanionDocument } from "../src/format/companion.ts";
import { planSlideInsertion } from "../src/format/insert.ts";
import type { PreparedSlide, SlideInsertion } from "../src/format/insert.ts";

const block = (id: string) => `<!-- slide: ${id} -->\n<!-- text: title -->\nWords for ${id}.\n<!-- notes -->\nRemember.\n\n`;
const prepared = (id: string): PreparedSlide => ({ id, markdown: block(id), record: '{"layout":"title"}' });
const apply = (source: string, plan: SlideInsertion) => source.slice(0, plan.from) + plan.insert + source.slice(plan.to);
const plan = (source: string, companion: string, slides: readonly PreparedSlide[], after: string | null, bodyStart = 0) =>
  planSlideInsertion(source, indexPresentation(source, bodyStart)!, companion, slides, after, bodyStart);

void test("insertion preserves independent source/JSON order and every surviving record byte", () => {
  const header = '---\nmarkdownpoint: 1\nunknown: keep\n---\n\n';
  const section = '<!-- section: ending -->\n# Ending\n\n';
  const composition = '<!-- composition: shared -->\n<!-- control: caption -->\nReusable.\n';
  const source = header + block("a") + block("b") + section + block("c") + composition;
  const raw = String.raw`{ "layout":"title", "future": 900719925474099312345, "escape":"\u00e9" }`;
  const companion = `{ "before": true, "slides": { "c": {}, "a": ${raw}, "b": {} }, "compositions": {"shared":{}}, "comments": {"thread":{"slide":"a"}} }`;
  const added = { ...prepared("new"), record: '{"layout":"title","objects":[{"id":"image","asset":"media/photo.png"}],"future":{"kept":true}}' };
  const result = plan(source, companion, [added, prepared("another")], "b", header.length)!;
  assert.ok(result);
  assert.equal(result.from, source.indexOf(section));
  assert.equal(result.from, result.to);
  assert.equal(apply(source, result), header + block("a") + block("b") + block("new") + block("another") + section + block("c") + composition);
  assert.ok(result.companion.includes(raw));
  assert.equal(result.companion.slice(result.companion.indexOf(', "compositions"')), companion.slice(companion.indexOf(', "compositions"')));
  const records = CompanionDocument.read(result.companion)!.records;
  assert.deepEqual([...records.keys()], ["c", "a", "b", "new", "another"]);
  assert.equal(records.get("new"), added.record);
  assert.equal(result.document.compositions[0]!.id, "shared");
});

void test("an empty draft accepts slides after its final section and before its reusable definitions", () => {
  const header = '---\r\nmarkdownpoint: 1\r\n---\r\n\r\n';
  const section = '<!-- section: empty -->\r\n# Empty\r\n';
  const composition = '<!-- composition: shared -->\r\n<!-- control: caption -->\r\nReusable.\r\n';
  const added = { ...prepared("first"), markdown: block("first").replaceAll("\n", "\r\n") };
  for (const [source, expected] of [
    [header, header + added.markdown],
    [header + composition, header + added.markdown + composition],
    [header + section + composition, header + section + added.markdown + composition],
  ]) {
    const result = plan(source!, '{"slides":{},"compositions":{"shared":{}}}', [added], null, header.length)!;
    assert.ok(result);
    assert.equal(apply(source!, result), expected);
  }
  const result = plan("", '{"slides":{}}', [prepared("first")], null)!;
  assert.equal(apply("", result), block("first"));
});

void test("EOF separation preserves authored blank-line counts on both sides of the insertion", () => {
  const first = '<!-- slide: a -->\n<!-- text: body -->\nLast words.';
  const incoming = '<!-- slide: b -->\n<!-- notes -->\nNew notes.';
  for (const [tail, closed] of [["", "\n"], ["\n \t ", "\n \t \n"], ["\n\n \t ", "\n \t \n"], ["\n\n\n \t ", "\n\n \t \n"]]) {
    const source = first + tail;
    const result = plan(source, '{"slides":{"a":{}}}', [{ id: "b", markdown: incoming, record: '{}' }], "a")!;
    assert.ok(result);
    assert.equal(apply(source, result), first + closed + incoming);
    assert.ok(result.from >= first.length);
    const before = block("existing");
    const inserted = plan(before, '{"slides":{"existing":{}}}', [{ id: "a", markdown: source, record: '{}' }, prepared("last")], "existing")!;
    assert.equal(apply(before, inserted), before + first + closed + block("last"));
  }
  const source = first.replaceAll("\n", "\r\n");
  const result = plan(source, '{"slides":{"a":{}}}', [prepared("b")], "a")!;
  assert.equal(apply(source, result), source + "\r\n" + block("b"));
});

void test("a cut's pending identical record can regain its text without overwriting external metadata", () => {
  const companion = '{"slides":{"a":{},"returning":{"layout":"title"}}}';
  const result = plan(block("a"), companion, [prepared("returning")], "a")!;
  assert.ok(result);
  assert.equal(result.companion, companion);
  assert.equal(apply(block("a"), result), block("a") + block("returning"));
  assert.equal(plan(block("a"), companion, [{ ...prepared("returning"), record: '{"layout":"different"}' }], "a"), null);
});

void test("collisions, missing anchors, malformed fragments and swallowed boundaries refuse the insertion", () => {
  const source = block("a") + '<!-- composition: shared -->\n<!-- control: caption -->\nReusable.\n';
  const companion = '{"slides":{"a":{}},"compositions":{"shared":{},"other":{}}}';
  for (const slides of [[], [prepared("a")], [prepared("shared")], [prepared("other")], [prepared("b"), prepared("b")],
    [{ ...prepared("b"), id: "bad.id" }], [{ ...prepared("b"), markdown: block("different") }],
    [{ ...prepared("b"), markdown: block("b") + block("unexpected") }],
    [{ ...prepared("b"), markdown: '<!-- section: section -->\n# Section\n' + block("b") }],
    [{ ...prepared("b"), record: 'null' }], [{ ...prepared("b"), record: '{}' + ', "extra": {}' }],
    [{ ...prepared("b"), markdown: '<!-- slide: b -->\n<!-- text: body -->\n```md\nUnfinished.' }],
  ]) assert.equal(plan(source, companion, slides, "a"), null);
  assert.equal(plan(source, companion, [prepared("b")], "missing"), null);
  assert.equal(plan(source, companion, [prepared("b")], null), null);
  for (const invalid of ['{', '{"slides":null}', '{"slides":{"a":{},"a":{}}}', '{"slides":{"a":{}},"compositions":null}']) {
    assert.equal(plan(source, invalid, [prepared("b")], "a"), null);
  }
  const section = '<!-- section: same -->\n# Same\n';
  assert.ok(plan(section, '{"slides":{}}', [prepared("same")], null));
});

void test("one large insertion retains the selected order and complete raw records", () => {
  const additions = Array.from({ length: 1000 }, (_, index) => prepared(`new-${index}`));
  const result = plan(block("first"), '{"slides":{"first":{}}}', additions, "first")!;
  assert.ok(result);
  assert.deepEqual(result.document.slides.map(slide => slide.id), ["first", ...additions.map(slide => slide.id)]);
  assert.equal(CompanionDocument.read(result.companion)!.records.size, 1001);
});
