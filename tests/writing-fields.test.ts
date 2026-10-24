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
import { compactFieldAt, writingFields } from "../src/editor/writing-fields.ts";

const labels = { title: "Title", body: "Body", eyebrow: "Eyebrow" };

void test("writing fields keep empty roles, original marker bytes, and native content ranges", () => {
  const markdown = '<!-- slide: first -->\r\n<!-- text: eyebrow -->\r\n\r\n<!-- text: title -->\r\nA clear idea.\r\n\r\n<!-- text: body -->\r\n';
  const fields = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
  assert.deepEqual(fields.map(field => [field.key, field.label, field.populated]), [
    ["first:eyebrow", "Eyebrow", false], ["first:title", "Title", true], ["first:body", "Body", false],
  ]);
  assert.deepEqual(fields.map(field => field.opening), [true, false, false]);
  for (const field of fields) assert.equal(field.markerText, markdown.slice(field.from, field.contentFrom));
  assert.equal(markdown.slice(fields[1]!.contentFrom, fields[1]!.to).trim(), "A clear idea.");
  assert.equal(fields[2]!.contentFrom, markdown.length);
});

void test("unknown bindings and notes stay outside the supported field-role projection", () => {
  const markdown = '<!-- slide: first -->\n<!-- text: data-table -->\nRaw table content.\n<!-- notes -->\nA private reminder.\n<!-- text: body -->\nBody words.\n';
  const fields = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
  assert.deepEqual(fields.map(field => field.role), ["body"]);
});

void test("compact empty fields preserve a zero-length payload before the following marker", () => {
  const markdown = '<!-- slide: first -->\n<!-- text: title -->\n<!-- text: body -->\n<!-- slide: second -->\n';
  const fields = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
  assert.equal(fields.length, 2);
  assert.ok(fields.every(field => !field.populated && field.contentFrom === field.to));
});

void test("a shared marker position belongs to the preceding compact writing field", () => {
  const markdown = '<!-- slide: first -->\n<!-- text: title -->\n<!-- text: body -->\n<!-- slide: second -->\n<!-- text: eyebrow -->\n';
  const document = indexPresentation(markdown, 0)!;
  const fields = writingFields(markdown, document, labels);
  assert.equal(compactFieldAt(fields, fields[1]!.from, markdown.length)?.key, "first:title");
  assert.equal(compactFieldAt(fields, document.slides[1]!.from, markdown.length)?.key, "first:body");
  assert.equal(compactFieldAt(fields, markdown.length, markdown.length), undefined);
});
