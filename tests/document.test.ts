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

void test("slides and their field ranges follow source order and preserve every source byte", () => {
  const text = '<!-- slide: opening -->\n\n<!-- text: heading -->\n\nStart here.\n\n<!-- notes -->\nA reminder.\n\n<!-- slide: closing -->\n\n<!-- text: summary -->\n';
  const document = indexPresentation(text, 0);
  assert.ok(document);
  assert.deepEqual(document.slides.map(slide => slide.id), ["opening", "closing"]);
  const opening = document.slides[0]!;
  assert.equal(text.slice(opening.from, opening.markerTo), '<!-- slide: opening -->\n');
  assert.equal(opening.to, document.slides[1]!.from);
  assert.deepEqual(opening.blocks.map(block => [block.kind, block.id, text.slice(block.contentFrom, block.to)]), [
    ["text", "heading", "\nStart here.\n\n"], ["notes", null, "A reminder.\n\n"],
  ]);
  const empty = document.slides[1]!.blocks[0]!;
  assert.equal(empty.contentFrom, empty.to);
  assert.equal(document.slides.map(slide => text.slice(slide.from, slide.to)).join(""), text);
});

void test("CRLF positions and frontmatter offsets still refer to the original document", () => {
  const header = '---\r\nmarkdownpoint: 1\r\ndocument: 12345678-1234-1234-1234-123456789abc\r\n---\r\n\r\n';
  const text = header + '<!-- slide: opening -->\r\n\r\n<!-- text: heading -->\r\nWords.\r\n';
  const slide = indexPresentation(text, header.length)!.slides[0]!;
  assert.equal(slide.from, header.length);
  assert.equal(slide.line, 5);
  assert.equal(text.slice(slide.blocks[0]!.contentFrom), 'Words.\r\n');
});

void test("marker-shaped lines in backtick and tilde code remain field content", () => {
  for (const fence of ["```", "~~~~"]) {
    const text = `<!-- slide: actual -->\n\n<!-- text: example -->\n${fence}md\n<!-- slide: example -->\n<!-- text: fake -->\n<!-- notes -->\n${fence}\n\n<!-- slide: next -->\n`;
    const document = indexPresentation(text, 0)!;
    assert.deepEqual(document.slides.map(slide => slide.id), ["actual", "next"]);
    assert.ok(text.slice(document.slides[0]!.blocks[0]!.contentFrom, document.slides[0]!.blocks[0]!.to).includes('<!-- slide: example -->'));
  }
});

void test("code in a list or quote ends with its container; HTML stays within its field", () => {
  for (const words of ['- ```\n  example\n  ```', '> ~~~\n> example\n> ~~~', '<!-- a comment\n```\n-->', '<script>']) {
    const text = `<!-- slide: first -->\n\n<!-- text: body -->\n${words}\n\n<!-- slide: second -->\n`;
    assert.deepEqual(indexPresentation(text, 0)!.slides.map(slide => slide.id), ["first", "second"]);
  }
});

void test("section and composition boundaries do not become slides or extend a preceding slide", () => {
  const text = '<!-- section: introduction -->\n# Introduction\n\n<!-- slide: first -->\n\n<!-- text: nested.heading -->\nA heading.\n\n<!-- section: close -->\n# Close\n\n<!-- slide: second -->\n\n<!-- composition: shared -->\n\n<!-- control: caption -->\nReusable words.\n';
  const document = indexPresentation(text, 0)!;
  assert.deepEqual(document.slides.map(slide => slide.id), ["first", "second"]);
  assert.equal(document.slides[0]!.to, text.indexOf('<!-- section: close -->'));
  assert.equal(document.slides[1]!.to, text.indexOf('<!-- composition: shared -->'));
  assert.equal(document.slides[0]!.blocks[0]!.id, 'nested.heading');
});

void test("invalid or duplicate structural markers cannot publish misleading source ranges", () => {
  for (const text of [
    '<!-- slide: repeated -->\n<!-- slide: repeated -->\n',
    '<!-- Slide: upper -->\n', '<!-- slide: trailing- -->\n',
    '<!-- slide: double--dash -->\n', '<!-- slide: missing-newline -->',
    '<!-- slide: first -->\n<!-- notes: named -->\n', '<!-- text: orphan -->\n',
    '<!-- slide: first -->\n<!-- control: wrong-container -->\n',
  ]) assert.equal(indexPresentation(text, 0), null, text);
});

void test("ordinary comments, escaped directives, and horizontal rules stay in their text block", () => {
  const words = 'Words.\n\n---\n\n<!-- Notes for a future rehearsal -->\n<!-- Notes: remember a pause -->\n\\<!-- slide: literal -->\n<!--\\ text: literal -->\n';
  const text = `<!-- slide: first -->\n<!-- text: content -->\n${words}`;
  const document = indexPresentation(text, 0)!;
  assert.equal(document.slides.length, 1);
  assert.equal(text.slice(document.slides[0]!.blocks[0]!.contentFrom), words);
});

void test("a code fence that swallows a marker and never closes cannot publish a partial slide list", () => {
  const text = '<!-- slide: first -->\n<!-- text: body -->\n```md\n<!-- slide: hidden -->\nMore code.\n';
  assert.equal(indexPresentation(text, 0), null);
});

void test("a large deck produces one ordered index without changing its source", () => {
  const text = Array.from({ length: 6000 }, (_, index) => `<!-- slide: page-${index} -->\n<!-- text: body -->\nWords for page ${index}.\n\n`).join("");
  const document = indexPresentation(text, 0)!;
  assert.equal(document.slides.length, 6000);
  assert.equal(document.slides[5999]!.id, 'page-5999');
  assert.equal(document.slides[5999]!.to, text.length);
});
