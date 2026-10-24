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
import { en } from "../src/i18n/locales/en.ts";
import { slideNotes } from "../src/editor/notes.ts";

const labels = en.fields;

void test("writing fields keep empty roles, original marker bytes, and native content ranges", () => {
  const markdown = '<!-- slide: first -->\r\n<!-- text: eyebrow -->\r\n\r\n<!-- text: title -->\r\nA clear idea.\r\n\r\n<!-- text: body -->\r\n';
  const fields = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
  assert.deepEqual(fields.map(field => [field.key, field.label, field.populated]), [
    ["first:text:eyebrow", "Eyebrow", false], ["first:text:title", "Title", true], ["first:text:body", "Body", false],
  ]);
  assert.deepEqual(fields.map(field => field.opening), [true, false, false]);
  for (const field of fields) assert.equal(field.markerText, markdown.slice(field.from, field.contentFrom));
  assert.equal(markdown.slice(fields[1]!.contentFrom, fields[1]!.to).trim(), "A clear idea.");
  assert.equal(fields[2]!.contentFrom, markdown.length);
});

void test("custom writing areas receive labels while speaker notes retain their own disclosure", () => {
  const markdown = '<!-- slide: first -->\n<!-- text: data-table -->\nRaw table content.\n<!-- notes -->\nA private reminder.\n<!-- text: body -->\nBody words.\n';
  const fields = writingFields(markdown, indexPresentation(markdown, 0)!, labels);
  assert.deepEqual(fields.map(field => [field.role, field.label]), [["body", "Data table"], ["body", "Body"]]);
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
  assert.equal(compactFieldAt(fields, fields[1]!.from, markdown.length)?.key, "first:text:title");
  assert.equal(compactFieldAt(fields, document.slides[1]!.from, markdown.length)?.key, "first:text:body");
  assert.equal(compactFieldAt(fields, markdown.length, markdown.length), undefined);
});

void test("numbered fields, allocated copies and composition controls retain independent identities", () => {
  const ids = ["title-2", "title-id-b7d9e1", "body-2", "body-3", "card-id-f9h2k4.caption", "id-m4n6p8", "notes"];
  const markdown = "<!-- slide: first -->\n" + ids.map(id => `<!-- text: ${id} -->\n\n`).join("") + "<!-- notes -->\n\n";
  const document = indexPresentation(markdown, 0)!;
  const fields = writingFields(markdown, document, labels);
  assert.deepEqual(fields.map(field => [field.label, field.role]), [
    ["Title 2", "title"], ["Title", "title"], ["Body 2", "body"], ["Body 3", "body"],
    ["Caption", "body"], ["Text", "body"], ["Notes", "body"],
  ]);
  const keys = [...fields.map(field => field.key), slideNotes(markdown, document, "Notes")[0]!.field!.key];
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(fields.every(field => field.markerText === markdown.slice(field.from, field.contentFrom)));
});
