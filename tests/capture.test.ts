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
import test from 'node:test';
import { captureSlides } from '../src/format/capture.ts';
import { CompanionDocument } from '../src/format/companion.ts';
import { indexPresentation } from '../src/format/document.ts';

const one = '<!-- slide: one -->\r\n<!-- text: title -->\r\nSee [Two](slide:two).\r\n<!-- notes -->\r\nKeep the whole thought.\r\n\r\n';
const two = '<!-- slide: two -->\r\n<!-- text: card.caption -->\r\nAn instance value.\r\n\r\n';
const card =
    '<!-- composition: card -->\r\n<!-- control: caption -->\r\nDefault [link](slide:two).\r\n<!-- text: label -->\r\nA reusable label.\r\n';
const badge = '<!-- composition: badge -->\r\n<!-- text: label -->\r\nA small detail.\r\n';
const source = '<!-- section: intro -->\r\n# Introduction\r\n' + one + '<!-- section: end -->\r\n# Ending\r\n' + two + card + badge;
const firstRecord =
    '{"layout":"title","skipped":true,"future":9007199254740993,"escaped":"\\u0061","objects":[{"id":"photo","type":"image","asset":"assets/picture.png"}]}';
const secondRecord =
    '{"layout":"body","objects":[{"id":"card","type":"composition","source":"card"},{"id":"again","type":"composition","source":"card"}]}';
const cardRecord =
    '{"size":{"width":320,"height":160},"controls":{"caption":{"type":"text"}},"objects":[{"id":"detail","type":"composition","source":"badge"}]}';
const badgeRecord = '{"size":{"width":20,"height":20},"objects":[]}';
const companion = `{"slides":{"one":${firstRecord},"two":${secondRecord}},"compositions":{"card":${cardRecord},"badge":${badgeRecord}},"comments":{"unrelated":"keep private"}}`;
const capture = (markdown = source, data = companion, ids = ['two', 'one']) =>
    captureSlides(markdown, indexPresentation(markdown, 0)!, data, ids);

void test('capture preserves complete selected source and raw metadata in source order without section headers', () => {
    const result = capture()!;
    assert.ok(result);
    assert.deepEqual(result.slides, [
        { id: 'one', markdown: one, record: firstRecord },
        { id: 'two', markdown: two, record: secondRecord }
    ]);
    assert.equal(result.slides[0]!.record.includes('9007199254740993'), true);
    assert.equal(result.slides[0]!.record.includes('\\u0061'), true);
    assert.equal(JSON.stringify(result).includes('keep private'), false);
    assert.deepEqual(capture(source, companion, ['one'])!.compositions, []);
});

void test('capture includes each transitive composition once with default controls and instance text intact', () => {
    const result = capture()!;
    assert.deepEqual(result.compositions, [
        { id: 'card', markdown: card, record: cardRecord },
        { id: 'badge', markdown: badge, record: badgeRecord }
    ]);
    assert.equal(result.slides[1]!.markdown, two);
    const cycle = companion.replace('"objects":[]', '"objects":[{"type":"composition","source":"card"}]');
    assert.deepEqual(
        capture(source, cycle)!.compositions.map(part => part.id),
        ['card', 'badge']
    );
});

void test('literal fenced directives, authored EOF whitespace and unknown records are copied unchanged', () => {
    const markdown = '<!-- slide: one -->\n<!-- text: body -->\n```md\n<!-- slide: example -->\n```\n\n\n \t';
    assert.equal(capture(markdown, companion, ['one'])!.slides[0]!.markdown, markdown);
    assert.equal(capture(markdown, companion, ['one'])!.slides[0]!.record, firstRecord);
});

void test('slide paint order retains inherited object names among complete own objects', () => {
    const ordered = companion.replace('"objects":[{"id":"card"', '"objects":["title",{"id":"card"');
    const result = capture(source, ordered)!;
    assert.ok(result);
    assert.equal(result.slides[1]!.record, secondRecord.replace('"objects":[', '"objects":["title",'));
    assert.deepEqual(
        result.compositions.map(part => part.id),
        ['card', 'badge']
    );
    for (const invalid of [12, null, true, 'Invalid name']) {
        assert.equal(capture(source, ordered.replace('"objects":["title",', '"objects":[' + JSON.stringify(invalid) + ',')), null);
    }
    assert.equal(capture(source, companion.replace('"objects":[]', '"objects":["title"]')), null);
});

void test('incomplete selection or dependency source refuses capture instead of silently losing content', () => {
    for (const ids of [[], ['missing'], ['one', 'missing']]) assert.equal(capture(source, companion, ids), null);
    assert.equal(capture(source, companion.replace('"two":', '"other":')), null);
    assert.equal(capture(source.replace(badge, '')), null);
    assert.equal(capture(source, companion.replace('"badge":', '"missing":')), null);
    assert.equal(capture(source, companion.replace('"source":"card"', '"source":12')), null);
    assert.equal(capture(source, companion.replace('"objects":[{"id":"card"', '"objects":[null,{"id":"card"')), null);
    assert.equal(capture(source, companion.replace('"slides":{', '"slides":{},"slides":{')), null);
    assert.equal(capture(source, companion.replace('"compositions":{', '"compositions":{},"compositions":{')), null);
});

void test('composition raw-record maps use the same lossless updates as slide maps', () => {
    const data = CompanionDocument.read(companion, 'compositions')!;
    assert.equal(data.records.get('card'), cardRecord);
    const changed = data.change(
        new Map([
            ['badge', null],
            ['extra', '{"precision":9007199254740995}']
        ])
    )!;
    assert.equal(CompanionDocument.read(changed)!.records.get('one'), firstRecord);
    assert.equal(CompanionDocument.read(changed, 'compositions')!.records.get('extra'), '{"precision":9007199254740995}');
    assert.equal(CompanionDocument.read(changed, 'compositions')!.records.has('badge'), false);
});

void test('deep shared composition graphs are captured iteratively without duplication', () => {
    const count = 1200;
    const parts = Array.from({ length: count }, (_, index) => `<!-- composition: c${index} -->\n<!-- text: body -->\nWords ${index}\n`);
    const metadata = Object.fromEntries(
        parts.map((_part, index) => [
            `c${index}`,
            {
                objects:
                    index + 1 < count
                        ? [
                              { type: 'composition', source: `c${index + 1}` },
                              { type: 'composition', source: `c${index + 1}` }
                          ]
                        : []
            }
        ])
    );
    const markdown = '<!-- slide: one -->\n' + parts.join('');
    const data = JSON.stringify({ slides: { one: { objects: [{ type: 'composition', source: 'c0' }] } }, compositions: metadata });
    const result = capture(markdown, data, ['one'])!;
    assert.equal(result.compositions.length, count);
    assert.equal(result.compositions.at(-1)!.id, `c${count - 1}`);
});
