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

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { captureSlides } from '../src/format/capture.ts';
import { indexPresentation } from '../src/format/document.ts';

const one = '<!-- slide: one -->\r\n<!-- text: title -->\r\nSee [Two](slide:two).\r\n<!-- notes -->\r\nKeep the whole thought.\r\n\r\n';
const two = '<!-- slide: two -->\r\n<!-- text: caption -->\r\nA caption.\r\n\r\n';
const source = '<!-- section: intro -->\r\n# Introduction\r\n' + one + '<!-- section: end -->\r\n# Ending\r\n' + two;
const firstRecord =
    '{"layout":"title","skipped":true,"future":9007199254740993,"escaped":"\\u0061","objects":[{"id":"photo","type":"image","file":"media/picture.png"}]}';
const secondRecord = '{"layout":"body","objects":[{"id":"caption","type":"text"}]}';
const companion = `{"slides":{"one":${firstRecord},"two":${secondRecord}},"comments":{"unrelated":"keep private"}}`;
const capture = (markdown = source, data = companion, ids = ['two', 'one']) =>
    captureSlides(markdown, indexPresentation(markdown, 0)!, data, ids);

test('capture preserves complete selected source and raw metadata in source order without section headers', () => {
    const result = capture()!;
    assert.ok(result);
    assert.deepEqual(result, [
        { id: 'one', markdown: one, record: firstRecord },
        { id: 'two', markdown: two, record: secondRecord }
    ]);
    assert.equal(result[0]!.record.includes('9007199254740993'), true);
    assert.equal(result[0]!.record.includes('\\u0061'), true);
    assert.equal(JSON.stringify(result).includes('keep private'), false);
});

test('literal fenced directives, authored EOF whitespace and unknown records are copied unchanged', () => {
    const markdown = '<!-- slide: one -->\n<!-- text: body -->\n```md\n<!-- slide: example -->\n```\n\n\n \t';
    assert.equal(capture(markdown, companion, ['one'])![0]!.markdown, markdown);
    assert.equal(capture(markdown, companion, ['one'])![0]!.record, firstRecord);
});

test('slide paint order retains inherited object names among complete own objects', () => {
    const ordered = companion.replace('"objects":[{"id":"caption"', '"objects":["title",{"id":"caption"');
    const result = capture(source, ordered)!;
    assert.ok(result);
    assert.equal(result[1]!.record, secondRecord.replace('"objects":[', '"objects":["title",'));
});

test('incomplete selection or slide source refuses capture instead of silently losing content', () => {
    for (const ids of [[], ['missing'], ['one', 'missing']]) assert.equal(capture(source, companion, ids), null);
    assert.equal(capture(source, companion.replace('"two":', '"other":')), null);
    assert.equal(capture(source, companion.replace('"slides":{', '"slides":{},"slides":{')), null);
});
