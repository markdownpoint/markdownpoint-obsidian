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
import { CompanionDocument, reconcileSlideRecords, remapRecordReferences } from '../src/format/companion.ts';

void test('record changes combine removals, replacements and additions without damaging separators', () => {
    const source = '{"untouched":1,"slides":{"a":{"v":1},"b":{"v":2},"c":{"v":3}},"tail":2}';
    for (let mask = 0; mask < 8; mask++) {
        const changes = new Map<string, string | null>(
            ['a', 'b', 'c'].map((id, index) => [id, mask & (1 << index) ? null : '{"new":true}'])
        );
        changes.set('d', '{"added":4}');
        changes.set('e', '{"added":5}');
        const changed = CompanionDocument.read(source)!.change(changes)!;
        assert.deepEqual(JSON.parse(changed), {
            untouched: 1,
            slides: {
                ...Object.fromEntries(['a', 'b', 'c'].filter((_, index) => !(mask & (1 << index))).map(id => [id, { new: true }])),
                d: { added: 4 },
                e: { added: 5 }
            },
            tail: 2
        });
    }
    assert.deepEqual(JSON.parse(CompanionDocument.read('{"slides":{}}')!.change(new Map([['a', '{}']]))!), { slides: { a: {} } });
});

void test('a remembered record returns when its native Markdown marker returns', () => {
    const raw = String.raw`{ "layout": "title", "unknown": 900719925474099312345, "escaped": "\u00e9" }`;
    const source = `{"slides":{"a":${raw},"b":{}},"keep":true}`;
    const saved = new Map([['a', raw]]);
    const deleted = reconcileSlideRecords(source, saved, new Set(['b']))!;
    assert.deepEqual(JSON.parse(deleted.companion), { slides: { b: {} }, keep: true });
    assert.equal(deleted.remembered.get('a'), raw);
    const restored = reconcileSlideRecords(deleted.companion, deleted.remembered, new Set(['a', 'b']))!;
    assert.equal(CompanionDocument.read(restored.companion)!.records.get('a'), raw);
    assert.equal(reconcileSlideRecords(restored.companion, restored.remembered, new Set(['a', 'b']))!.companion, restored.companion);
});

void test('newer external record data is retained and unmanaged orphan records are not removed', () => {
    const saved = new Map([['a', '{"old":true}']]);
    const source = '{"slides":{"a":{"external":true},"orphan":{"preserve":true}},"externalSetting":3}';
    const result = reconcileSlideRecords(source, saved, new Set())!;
    assert.equal(result.remembered.get('a'), '{"external":true}');
    assert.deepEqual(JSON.parse(result.companion), { slides: { orphan: { preserve: true } }, externalSetting: 3 });
    const restored = reconcileSlideRecords(result.companion, result.remembered, new Set(['a']))!;
    assert.equal(CompanionDocument.read(restored.companion)!.records.get('a'), '{"external":true}');
});

void test('malformed replacement records refuse without changing source', () => {
    const source = '{"slides":{"a":{}}}';
    for (const raw of ['null', '[]', '{', '{} , "injected": {}', '{"a":1,}', '{/*comment*/}']) {
        assert.equal(CompanionDocument.read(source)!.change(new Map([['a', raw]])), null, raw);
    }
    assert.equal(CompanionDocument.read(source)!.change(new Map()), source);
});

void test('copy references change in own objects and overrides without rewriting other JSON', () => {
    const source = String.raw`{ "layout":"title", "future":900719925474099312345, "escaped":"\u00e9",
    "objects":["title",{"id":"picture","type":"image","asset":"assets/one.png","link":"slide:one","extra":{"link":"slide:one"}},
      {"id":"card","type":"composition","source":"card","link":"slide:two","controls":{"label":"slide:one"}}],
    "overrides":{"title":{"link":"slide:one","name":"slide:one"},"removed":null,"other":{"link":"https://example.com/slide:one"}},
    "link":"slide:one", "source":"card", "controls":{"caption":{"type":"text","default":"[Go](slide:one)"}} }`;
    const expected = source
        .replace('"link":"slide:one","extra"', '"link":"slide:copy-one","extra"')
        .replace('"source":"card","link":"slide:two"', '"source":"copy-card","link":"slide:copy-two"')
        .replace('"title":{"link":"slide:one"', '"title":{"link":"slide:copy-one"');
    assert.equal(
        remapRecordReferences(
            source,
            new Map([
                ['one', 'copy-one'],
                ['two', 'copy-two']
            ]),
            new Map([['card', 'copy-card']])
        ),
        expected
    );
    assert.equal(remapRecordReferences(source, new Map(), new Map()), source);
});

void test('composition references change only for composition instances and only when mapped', () => {
    const source =
        '{"objects":[{"type":"composition","source":"card"},{"type":"composition","source":"other"},{"type":"video","source":"card"}],"overrides":{"card":{"source":"card"}}}';
    assert.equal(
        remapRecordReferences(source, new Map(), new Map([['card', 'copy-card']])),
        source.replace('"source":"card"', '"source":"copy-card"')
    );
    assert.equal(remapRecordReferences(source, new Map(), new Map([['card', 'card']])), source);
});

void test('reference edits respect escaped JSON spelling and last-value semantics', () => {
    const source = String.raw`{"objects":[{"link":"slide:one"}],"obje\u0063ts":[{"type":"image","link":"slide:one","li\u006ek":"slide\u003atwo"}]}`;
    assert.equal(
        remapRecordReferences(
            source,
            new Map([
                ['one', 'copy-one'],
                ['two', 'copy-two']
            ]),
            new Map()
        ),
        source.replace('"slide\\u003atwo"', '"slide:copy-two"')
    );
    const shadowed = String.raw`{"overrides":{"title":{"link":"slide:one"},"ti\u0074le":{"link":"https://example.com"},"body":{"link":"slide:one"},"bo\u0064y":{"link":"slide:two"}}}`;
    assert.equal(
        remapRecordReferences(
            shadowed,
            new Map([
                ['one', 'copy-one'],
                ['two', 'copy-two']
            ]),
            new Map()
        ),
        shadowed.replace('"link":"slide:two"', '"link":"slide:copy-two"')
    );
    for (const invalid of ['null', '[]', '{"objects": [}', '{"objects":[],}', '{/*comment*/}']) {
        assert.equal(remapRecordReferences(invalid, new Map(), new Map()), null);
    }
});

void test('restoring a definition creates only its absent map and preserves unrelated raw metadata', () => {
    const source = '{\n  "slides": {},\n  "unknown": 9007199254740993\n}\n';
    const raw = '{"objects":[],"future":9007199254740995}';
    const saved = new Map([['card', raw]]);
    assert.equal(reconcileSlideRecords(source, saved, new Set(), 'compositions')!.companion, source);
    const restored = reconcileSlideRecords(source, saved, new Set(['card']), 'compositions')!;
    assert.equal(CompanionDocument.read(restored.companion, 'compositions')!.records.get('card'), raw);
    assert.equal(restored.companion.includes('"unknown": 9007199254740993'), true);
    const removed = reconcileSlideRecords(restored.companion, saved, new Set(), 'compositions')!;
    assert.equal(CompanionDocument.read(removed.companion, 'compositions')!.records.size, 0);
    for (const invalid of ['{"slides":{},"compositions":null}', '{"slides":{},"compositions":{},"compositions":{}}', '[]']) {
        assert.equal(CompanionDocument.ensure(invalid, 'compositions'), null);
    }
});
