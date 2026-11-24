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
import { CompanionDocument, reconcileSlideRecords, remapRecordReferences } from '../src/format/companion.ts';

test('record changes combine removals, replacements and additions without damaging separators', () => {
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

test('a record put back goes where MarkdownPoint orders it, so a slide deleted and brought back leaves the file as it was', () => {
    const record = (n: number) =>
        `{\n      "layout": "content",\n      "objects": [\n        {\n          "id": "o${n}"\n        }\n      ]\n    }`;
    const source = `{\n  "markdownpoint": "1.0",\n  "slides": {\n    "a": ${record(1)},\n    "b": ${record(2)},\n    "c": ${record(3)}\n  },\n  "tail": 2\n}\n`;
    for (const id of ['a', 'b', 'c']) {
        const all = new Map(CompanionDocument.read(source)!.records);
        const deleted = reconcileSlideRecords(source, all, new Set(['a', 'b', 'c'].filter(each => each !== id)))!;
        assert.deepEqual(
            [...CompanionDocument.read(deleted.companion)!.records.keys()],
            ['a', 'b', 'c'].filter(each => each !== id)
        );
        assert.equal(reconcileSlideRecords(deleted.companion, deleted.remembered, new Set(['a', 'b', 'c']))!.companion, source, id);
    }
    // Several added at once land in order among the records left, a removal beside them, ids compared as MarkdownPoint's
    // writer compares them, by UTF-16 code unit.
    const order = (changed: string | null) => [...CompanionDocument.read(changed!)!.records.keys()];
    const changes = new Map<string, string | null>([
        ['g', '{}'],
        ['c', '{}'],
        ['d', null],
        ['a', '{}'],
        ['e', '{}'],
        ['B', '{}']
    ]);
    assert.deepEqual(order(CompanionDocument.read('{"slides":{"b":{},"d":{},"f":{}}}')!.change(changes)), [
        'B',
        'a',
        'b',
        'c',
        'e',
        'f',
        'g'
    ]);
    assert.deepEqual(
        order(
            CompanionDocument.read('{"slides":{}}')!.change(
                new Map([
                    ['b', '{}'],
                    ['a', '{}']
                ])
            )
        ),
        ['a', 'b']
    );
});

test('a companion that starts with a byte order mark reads past it, as MarkdownPoint does, and keeps it through a change', () => {
    const bom = String.fromCharCode(0xfeff);
    const source = `${bom}{"slides":{"a":{"v":1}}}`;
    assert.equal(CompanionDocument.read(source)!.records.get('a'), '{"v":1}');
    assert.equal(CompanionDocument.read(source)!.change(new Map([['b', '{}']])), `${bom}{"slides":{"a":{"v":1}, "b": {}}}`);
    // A mark anywhere else, or anything after it but the object, is no JSON.
    assert.equal(CompanionDocument.read(`${bom}x{"slides":{"a":{}}}`), null);
    assert.equal(CompanionDocument.read(`${bom}${bom}{"slides":{"a":{}}}`), null);
    assert.equal(CompanionDocument.read(`{"slides":${bom}{"a":{}}}`), null);
});

test('a remembered record returns when its native Markdown marker returns', () => {
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

test('a parent-inverse keeps every digit through a slide copy and a delete brought back', () => {
    // MarkdownPoint writes these as JavaScript's shortest round-trip spelling, finer than the millionth other numbers keep.
    const raw = String.raw`{ "objects":[{"id":"mat","type":"model","file":"media/mat.glb","parent":"chart","parent-inverse":[3.3333333333333335,0,0,0,0,3.3333333333333335,0,0,0,0,3.3333333333333335,0,-3000,-1066.6666666666667,1e-7,1]}] }`;
    assert.equal(remapRecordReferences(raw, new Map([['a', 'copy-a']])), raw);
    const source = `{"slides":{"a":${raw},"b":{}}}`;
    const deleted = reconcileSlideRecords(source, new Map([['a', raw]]), new Set(['b']))!;
    const restored = reconcileSlideRecords(deleted.companion, deleted.remembered, new Set(['a', 'b']))!;
    assert.equal(CompanionDocument.read(restored.companion)!.records.get('a'), raw);
});

test('newer external record data is retained and unmanaged orphan records are not removed', () => {
    const saved = new Map([['a', '{"old":true}']]);
    const source = '{"slides":{"a":{"external":true},"orphan":{"preserve":true}},"externalSetting":3}';
    const result = reconcileSlideRecords(source, saved, new Set())!;
    assert.equal(result.remembered.get('a'), '{"external":true}');
    assert.deepEqual(JSON.parse(result.companion), { slides: { orphan: { preserve: true } }, externalSetting: 3 });
    const restored = reconcileSlideRecords(result.companion, result.remembered, new Set(['a']))!;
    assert.equal(CompanionDocument.read(restored.companion)!.records.get('a'), '{"external":true}');
});

test('malformed replacement records refuse without changing source', () => {
    const source = '{"slides":{"a":{}}}';
    for (const raw of ['null', '[]', '{', '{} , "injected": {}', '{"a":1,}', '{/*comment*/}']) {
        assert.equal(CompanionDocument.read(source)!.change(new Map([['a', raw]])), null, raw);
    }
    assert.equal(CompanionDocument.read(source)!.change(new Map()), source);
});

test('copy references change in own objects and overrides without rewriting other JSON', () => {
    const source = String.raw`{ "layout":"title", "future":900719925474099312345, "escaped":"\u00e9",
    "objects":["title",{"id":"picture","type":"image","file":"media/one.png","link":"slide:one","extra":{"link":"slide:one"}},
      {"id":"card","type":"shape","link":"slide:two","name":"slide:one"}],
    "overrides":{"title":{"link":"slide:one","name":"slide:one"},"removed":null,"other":{"link":"https://example.com/slide:one"}},
    "link":"slide:one" }`;
    const expected = source
        .replace('"link":"slide:one","extra"', '"link":"slide:copy-one","extra"')
        .replace('"type":"shape","link":"slide:two"', '"type":"shape","link":"slide:copy-two"')
        .replace('"title":{"link":"slide:one"', '"title":{"link":"slide:copy-one"');
    assert.equal(
        remapRecordReferences(
            source,
            new Map([
                ['one', 'copy-one'],
                ['two', 'copy-two']
            ])
        ),
        expected
    );
    assert.equal(remapRecordReferences(source, new Map()), source);
});

test('reference edits respect escaped JSON spelling and last-value semantics', () => {
    const source = String.raw`{"objects":[{"link":"slide:one"}],"obje\u0063ts":[{"type":"image","link":"slide:one","li\u006ek":"slide\u003atwo"}]}`;
    assert.equal(
        remapRecordReferences(
            source,
            new Map([
                ['one', 'copy-one'],
                ['two', 'copy-two']
            ])
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
            ])
        ),
        shadowed.replace('"link":"slide:two"', '"link":"slide:copy-two"')
    );
    for (const invalid of ['null', '[]', '{"objects": [}', '{"objects":[],}', '{/*comment*/}']) {
        assert.equal(remapRecordReferences(invalid, new Map()), null);
    }
});
