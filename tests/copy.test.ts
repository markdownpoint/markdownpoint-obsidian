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
import { prepareSlideCopies } from "../src/format/copy.ts";
import type { CapturedPart, CapturedSlides } from "../src/format/capture.ts";
import { indexPresentation } from "../src/format/document.ts";
import { CompanionDocument } from "../src/format/companion.ts";
import { planSlideInsertion } from "../src/format/insert.ts";

const part = (kind: "slide" | "composition", id: string, record = '{}', words = 'Shared words.'): CapturedPart => ({
  id, record, markdown: `<!-- ${kind}: ${id} -->\n<!-- ${kind === "slide" ? "text: body" : "control: caption"} -->\n${words}\n`,
});
const placement = (source: string) => `{"objects":[{"id":"placed","type":"composition","source":"${source}"}]}`;
const inner = part("composition", "inner");
const outer = part("composition", "outer", placement("inner"));
const captured = { slides: [part("slide", "a", '{}', '[B](slide:b) and `[B](slide:b)`.'), part("slide", "b", placement("outer"))], compositions: [outer, inner] };
const fields = (value: CapturedSlides) => new Map([...value.slides, ...value.compositions].map(part => [part.id, new Map<string, "rich-text" | "table">([["body", "rich-text"]])]));
const allocator = (start = 0) => { let count = start; return () => `new-${++count}`; };
const prepare = (held: readonly CapturedPart[] = [], value = captured, mint = allocator(), occupied = new Set<string>()) => prepareSlideCopies(value, held, occupied, fields(value), mint);

void test("copy groups receive fresh slide identities and new dependencies arrive before their parents", () => {
  const before = JSON.stringify(captured), result = prepare()!;
  assert.ok(result);
  assert.deepEqual(result.slides.map(part => part.id), ["new-1", "new-2"]);
  assert.deepEqual(result.compositions.map(part => part.id), ["new-3", "new-4"]);
  assert.equal(result.slides[0]!.markdown, captured.slides[0]!.markdown.replace('slide: a', 'slide: new-1').replace('[B](slide:b)', '[B](slide:new-2)'));
  assert.equal(result.slides[1]!.record, placement("new-4"));
  assert.equal(result.compositions[1]!.record, placement("new-3"));
  assert.equal(JSON.stringify(captured), before);
});

void test("unchanged definitions are reused under their existing identities", () => {
  const result = prepare(captured.compositions)!;
  assert.ok(result);
  assert.deepEqual(result.compositions, []);
  assert.equal(result.slides[1]!.record, placement("outer"));
  const aliases = [part("composition", "existing-inner"), part("composition", "existing-outer", placement("existing-inner"))];
  const aliased = prepare(aliases)!;
  assert.deepEqual(aliased.compositions, []);
  assert.equal(aliased.slides[1]!.record, placement("existing-outer"));
  const preferred = prepare([part("composition", "other-inner"), inner, outer])!;
  assert.equal(preferred.slides[1]!.record, placement("outer"));
});

void test("repeated paste reuses unchanged imported definitions instead of appending more copies", () => {
  const first = prepare()!;
  const second = prepare(first.compositions, captured, allocator(4), new Set([...first.slides, ...first.compositions].map(part => part.id)))!;
  assert.deepEqual(second.slides.map(part => part.id), ["new-5", "new-6"]);
  assert.deepEqual(second.compositions, []);
  assert.equal(second.slides[1]!.record, placement("new-4"));
});

void test("actual repeated insertion reuses nested definitions after an original definition changes", () => {
  for (const tail of ["\n", "", "  ", "\t", "\n\n", "\n\n\n", "\n \t", "\n\n \t"]) {
    const copiedInner = { ...inner, markdown: inner.markdown.slice(0, -1) + tail };
    const clipboard = { ...captured, compositions: [outer, copiedInner] };
    let source = captured.slides.map(part => part.markdown).join("") + outer.markdown + copiedInner.markdown.replace("Shared words.", "Changed inner.");
    let companion = JSON.stringify({ slides: Object.fromEntries(captured.slides.map(part => [part.id, JSON.parse(part.record) as unknown])),
      compositions: { outer: JSON.parse(outer.record) as unknown, inner: {} } });
    const mint = allocator();
    for (let cycle = 0; cycle < 3; cycle++) {
      const document = indexPresentation(source, 0)!, records = CompanionDocument.read(companion, "compositions")!.records;
      const held = document.compositions.map(part => ({ id: part.id, markdown: source.slice(part.from, part.to), record: records.get(part.id)! }));
      const occupied = new Set([...document.slides, ...document.compositions].map(part => part.id));
      const copied = prepareSlideCopies(clipboard, held, occupied, fields(clipboard), mint)!;
      assert.equal(copied.compositions.length, cycle === 0 ? 2 : 0, JSON.stringify({ tail, cycle }));
      const insertion = planSlideInsertion(source, document, companion, copied.slides, "b", 0, copied.compositions)!;
      source = [...insertion.changes].reverse().reduce((text, change) => text.slice(0, change.from) + change.insert + text.slice(change.to), source);
      companion = insertion.companion;
      assert.equal(insertion.document.compositions.length, 4);
      assert.ok(source.includes("Changed inner."));
    }
  }
});

void test("an authored trailing empty paragraph keeps a definition distinct from a structural gap", () => {
  const value = { ...captured, compositions: [outer, { ...inner, markdown: inner.markdown + "\n\n" }] };
  const held = [outer, { ...inner, markdown: inner.markdown + "\n" }];
  assert.equal(prepare(held, value)!.compositions.length, 2);
});

void test("definitions whose links follow copied slides are cloned while their originals stay untouched", () => {
  const linked = { ...captured, compositions: [outer, part("composition", "inner", '{}', '[B](slide:b)')] };
  const first = prepare(linked.compositions, linked)!;
  assert.equal(first.compositions.length, 2);
  assert.ok(first.compositions[0]!.markdown.includes('[B](slide:new-2)'));
  const second = prepare([...linked.compositions, ...first.compositions], linked, allocator(4))!;
  assert.equal(second.compositions.length, 2);
  assert.ok(second.compositions[0]!.markdown.includes('[B](slide:new-6)'));
  assert.ok(linked.compositions[1]!.markdown.includes('[B](slide:b)'));
});

void test("native newline and terminal-boundary normalization do not duplicate identical definitions", () => {
  const value = { ...captured, compositions: [outer, { ...inner, markdown: inner.markdown + '\n \t' }] };
  const held = [{ ...inner, markdown: inner.markdown.replaceAll('\n', '\r\n') + ' \t\r\n' }, outer];
  assert.deepEqual(prepare(held, value)!.compositions, []);
  const precise = { ...captured, compositions: [outer, { ...inner, record: '{"unknown":9007199254740993}' }] };
  const different = [{ ...inner, record: '{"unknown":9007199254740992}' }, outer];
  assert.equal(prepare(different, precise)!.compositions.length, 2);
});

void test("incomplete graphs, cycles and unavailable fresh identities refuse the entire copy", () => {
  assert.equal(prepare([], { ...captured, compositions: [outer] }), null);
  assert.equal(prepare([], { ...captured, compositions: [outer, part("composition", "inner", placement("outer"))] }), null);
  assert.equal(prepare([], { ...captured, compositions: [inner, inner] }), null);
  assert.equal(prepare([], captured, () => "a"), null);
  assert.equal(prepare([], captured, () => "Bad ID"), null);
  assert.equal(prepare([], captured, () => "reserved", new Set(["reserved"])), null);
  assert.equal(prepare([], captured, () => "repeated"), null);
  assert.equal(prepareSlideCopies(captured, [], new Set(), new Map(), allocator()), null);
  assert.equal(prepare([], { ...captured, slides: [part("slide", "a", '{')] }), null);
});

void test("large definition chains are prepared iteratively and shared dependencies are counted once", () => {
  const count = 1200;
  const definitions = Array.from({ length: count }, (_, index) => part("composition", `c${index}`, index + 1 < count ?
    `{"objects":[{"type":"composition","source":"c${index + 1}"},{"type":"composition","source":"c${index + 1}"}]}` : '{}'));
  const value = { slides: [part("slide", "a", placement("c0"))], compositions: definitions };
  let allocations = 0;
  const result = prepareSlideCopies(value, definitions, new Set(), fields(value), () => `copy-${++allocations}`)!;
  assert.ok(result);
  assert.equal(result.compositions.length, 0);
  assert.equal(allocations, 1);
  assert.equal(result.slides[0]!.record, placement("c0"));
});
