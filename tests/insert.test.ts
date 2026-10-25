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
import { indexPresentation } from '../src/format/document.ts';
import { CompanionDocument } from '../src/format/companion.ts';
import { planSlideInsertion } from '../src/format/insert.ts';
import type { PreparedPart, SlideInsertion } from '../src/format/insert.ts';

const block = (id: string) => `<!-- slide: ${id} -->\n<!-- text: title -->\nWords for ${id}.\n<!-- notes -->\nRemember.\n\n`;
const prepared = (id: string): PreparedPart => ({ id, markdown: block(id), record: '{"layout":"title"}' });
const apply = (source: string, plan: SlideInsertion) =>
    [...plan.changes].reverse().reduce((text, change) => text.slice(0, change.from) + change.insert + text.slice(change.to), source);
const plan = (source: string, companion: string, slides: readonly PreparedPart[], after: string | null, bodyStart = 0) =>
    planSlideInsertion(source, indexPresentation(source, bodyStart)!, companion, slides, after, bodyStart);

test('insertion preserves independent source/JSON order and every surviving record byte', () => {
    const header = '---\nmarkdownpoint: "1.0"\nunknown: keep\n---\n\n';
    const section = '<!-- section: ending -->\n# Ending\n\n';
    const composition = '<!-- composition: shared -->\n<!-- control: caption -->\nReusable.\n';
    const source = header + block('a') + block('b') + section + block('c') + composition;
    const raw = String.raw`{ "layout":"title", "future": 900719925474099312345, "escape":"\u00e9" }`;
    const companion = `{ "before": true, "slides": { "c": {}, "a": ${raw}, "b": {} }, "compositions": {"shared":{}}, "comments": {"thread":{"slide":"a"}} }`;
    const added = {
        ...prepared('new'),
        record: '{"layout":"title","objects":[{"id":"image","file":"media/photo.png"}],"future":{"kept":true}}'
    };
    const result = plan(source, companion, [added, prepared('another')], 'b', header.length)!;
    assert.ok(result);
    assert.equal(result.changes[0]!.from, source.indexOf(section));
    assert.equal(result.changes[0]!.from, result.changes[0]!.to);
    assert.equal(
        apply(source, result),
        header + block('a') + block('b') + block('new') + block('another') + section + block('c') + composition
    );
    assert.ok(result.companion.includes(raw));
    assert.equal(
        result.companion.slice(result.companion.indexOf(', "compositions"')),
        companion.slice(companion.indexOf(', "compositions"'))
    );
    const records = CompanionDocument.read(result.companion)!.records;
    assert.deepEqual([...records.keys()], ['c', 'a', 'b', 'new', 'another']);
    assert.equal(records.get('new'), added.record);
    assert.equal(result.document.compositions[0]!.id, 'shared');
});

test('an empty draft accepts slides after its final section and before its reusable definitions', () => {
    const header = '---\r\nmarkdownpoint: "1.0"\r\n---\r\n\r\n';
    const section = '<!-- section: empty -->\r\n# Empty\r\n';
    const composition = '<!-- composition: shared -->\r\n<!-- control: caption -->\r\nReusable.\r\n';
    const added = { ...prepared('first'), markdown: block('first').replaceAll('\n', '\r\n') };
    for (const [source, expected] of [
        [header, header + added.markdown],
        [header + composition, header + added.markdown + composition],
        [header + section + composition, header + section + '\r\n' + added.markdown + composition]
    ]) {
        const result = plan(source!, '{"slides":{},"compositions":{"shared":{}}}', [added], null, header.length)!;
        assert.ok(result);
        assert.equal(apply(source!, result), expected);
    }
    const result = plan('', '{"slides":{}}', [prepared('first')], null)!;
    assert.equal(apply('', result), block('first'));
});

test('EOF separation preserves authored blank-line counts on both sides of the insertion', () => {
    const first = '<!-- slide: a -->\n<!-- text: body -->\nLast words.';
    const incoming = '<!-- slide: b -->\n<!-- notes -->\nNew notes.';
    for (const [tail, closed] of [
        ['', '\n\n'],
        ['\n \t ', '\n \t \n'],
        ['\n\n \t ', '\n \t \n'],
        ['\n\n\n \t ', '\n\n \t \n']
    ]) {
        const source = first + tail;
        const result = plan(source, '{"slides":{"a":{}}}', [{ id: 'b', markdown: incoming, record: '{}' }], 'a')!;
        assert.ok(result);
        assert.equal(apply(source, result), first + closed + incoming);
        assert.ok(result.changes[0]!.from >= first.length);
        const before = block('existing');
        const inserted = plan(
            before,
            '{"slides":{"existing":{}}}',
            [{ id: 'a', markdown: source, record: '{}' }, prepared('last')],
            'existing'
        )!;
        assert.equal(apply(before, inserted), before + first + closed + block('last'));
    }
    const source = first.replaceAll('\n', '\r\n');
    const result = plan(source, '{"slides":{"a":{}}}', [prepared('b')], 'a')!;
    assert.equal(apply(source, result), source + '\r\n\r\n' + block('b'));
});

test("a cut's pending identical record can regain its text without overwriting external metadata", () => {
    const companion = '{"slides":{"a":{},"returning":{"layout":"title"}}}';
    const result = plan(block('a'), companion, [prepared('returning')], 'a')!;
    assert.ok(result);
    assert.equal(result.companion, companion);
    assert.equal(apply(block('a'), result), block('a') + block('returning'));
    assert.equal(plan(block('a'), companion, [{ ...prepared('returning'), record: '{"layout":"different"}' }], 'a'), null);
});

test('collisions, missing anchors, malformed fragments and swallowed boundaries refuse the insertion', () => {
    const source = block('a') + '<!-- composition: shared -->\n<!-- control: caption -->\nReusable.\n';
    const companion = '{"slides":{"a":{}},"compositions":{"shared":{},"other":{}}}';
    for (const slides of [
        [],
        [prepared('a')],
        [prepared('shared')],
        [prepared('other')],
        [prepared('b'), prepared('b')],
        [{ ...prepared('b'), id: 'bad.id' }],
        [{ ...prepared('b'), markdown: block('different') }],
        [{ ...prepared('b'), markdown: block('b') + block('unexpected') }],
        [{ ...prepared('b'), markdown: '<!-- section: section -->\n# Section\n' + block('b') }],
        [{ ...prepared('b'), record: 'null' }],
        [{ ...prepared('b'), record: '{}' + ', "extra": {}' }],
        [{ ...prepared('b'), markdown: '<!-- slide: b -->\n<!-- text: body -->\n```md\nUnfinished.' }]
    ])
        assert.equal(plan(source, companion, slides, 'a'), null);
    assert.equal(plan(source, companion, [prepared('b')], 'missing'), null);
    assert.equal(plan(source, companion, [prepared('b')], null), null);
    for (const invalid of ['{', '{"slides":null}', '{"slides":{"a":{},"a":{}}}', '{"slides":{"a":{}},"compositions":null}']) {
        assert.equal(plan(source, invalid, [prepared('b')], 'a'), null);
    }
    const section = '<!-- section: same -->\n# Same\n';
    assert.ok(plan(section, '{"slides":{}}', [prepared('same')], null));
});

test('one large insertion retains the selected order and complete raw records', () => {
    const additions = Array.from({ length: 1000 }, (_, index) => prepared(`new-${index}`));
    const result = plan(block('first'), '{"slides":{"first":{}}}', additions, 'first')!;
    assert.ok(result);
    assert.deepEqual(
        result.document.slides.map(slide => slide.id),
        ['first', ...additions.map(slide => slide.id)]
    );
    assert.equal(CompanionDocument.read(result.companion)!.records.size, 1001);
});

const definition = (id: string): PreparedPart => ({
    id,
    markdown: `<!-- composition: ${id} -->\n<!-- control: caption -->\nDefault ${id}.\n`,
    record: '{"controls":{"caption":{"type":"text"}},"future":9007199254740993}'
});

test('a group and its new definitions enter different source positions without replacing intervening content', () => {
    const held = definition('held');
    const incoming = definition('card');
    const source = block('a') + block('b') + held.markdown;
    const companion = '{"slides":{"a":{},"b":{}},"compositions":{"held":{"keep":true}},"future":9007199254740995}';
    const result = planSlideInsertion(source, indexPresentation(source, 0)!, companion, [prepared('copy')], 'a', 0, [incoming])!;
    assert.ok(result);
    assert.equal(result.changes.length, 2);
    assert.equal(result.changes[0]!.from, block('a').length);
    assert.equal(result.changes[1]!.from, source.length);
    assert.equal(apply(source, result), block('a') + block('copy') + block('b') + held.markdown + '\n' + incoming.markdown);
    assert.equal(CompanionDocument.read(result.companion, 'compositions')!.records.get('held'), '{"keep":true}');
    assert.equal(CompanionDocument.read(result.companion, 'compositions')!.records.get('card'), incoming.record);
    assert.ok(result.companion.includes('"future":9007199254740995'));
});

test('EOF and empty-draft insertion combine the slide and definition without extra authored blank lines', () => {
    const incoming = { ...prepared('copy'), markdown: '<!-- slide: copy -->\n<!-- text: title -->\nCopied.' };
    const added = definition('card');
    for (const source of ['', '<!-- slide: a -->\n<!-- text: body -->\nOriginal.\n\n \t']) {
        const companion = source ? '{"slides":{"a":{}}}' : '{"slides":{}}';
        const result = planSlideInsertion(source, indexPresentation(source, 0)!, companion, [incoming], source ? 'a' : null, 0, [added])!;
        assert.ok(result);
        assert.equal(result.changes.length, 1);
        assert.equal(
            apply(source, result),
            (source ? '<!-- slide: a -->\n<!-- text: body -->\nOriginal.\n \t\n' : '') + incoming.markdown + '\n\n' + added.markdown
        );
        assert.deepEqual(
            result.document.compositions.map(part => part.id),
            ['card']
        );
    }
});

test("appending definitions preserves an existing definition's terminal payload spacing", () => {
    const source = block('a') + '<!-- composition: held -->\n<!-- control: caption -->\nDefault.\n\n \t';
    const companion = '{"slides":{"a":{}},"compositions":{"held":{}}}';
    const result = planSlideInsertion(source, indexPresentation(source, 0)!, companion, [prepared('copy')], 'a', 0, [definition('card')])!;
    assert.equal(
        apply(source, result),
        block('a') + block('copy') + '<!-- composition: held -->\n<!-- control: caption -->\nDefault.\n \t\n' + definition('card').markdown
    );
});

test('definition insertion rejects collisions, malformed fragments and conflicting pending metadata', () => {
    const source = block('a');
    const data = '{"slides":{"a":{},"orphan":{}},"compositions":{"pending":{}}}';
    for (const added of [
        [definition('a')],
        [definition('copy')],
        [definition('orphan')],
        [definition('card'), definition('card')],
        [prepared('card')],
        [{ ...definition('card'), markdown: definition('card').markdown + block('extra') }],
        [{ ...definition('card'), record: 'null' }],
        [definition('pending')]
    ])
        assert.equal(planSlideInsertion(source, indexPresentation(source, 0)!, data, [prepared('copy')], 'a', 0, added), null);
    const restored = { ...definition('pending'), record: '{}' };
    assert.ok(planSlideInsertion(source, indexPresentation(source, 0)!, data, [prepared('copy')], 'a', 0, [restored]));
    for (const invalid of ['{"slides":{"a":{}},"compositions":null}', '{"slides":{"a":{}},"compositions":{},"compositions":{}}']) {
        assert.equal(
            planSlideInsertion(source, indexPresentation(source, 0)!, invalid, [prepared('copy')], 'a', 0, [definition('card')]),
            null
        );
    }
});
