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
import { planSlideDeletion } from '../src/format/delete.ts';
import { indexPresentation } from '../src/format/document.ts';

const block = (id: string) => `<!-- slide: ${id} -->\n<!-- text: title -->\nWords for ${id}.\n<!-- notes -->\nRemember ${id}.\n\n`;
const apply = (source: string, changes: readonly { from: number; to: number; insert: string }[]) =>
    [...changes].reverse().reduce((text, change) => text.slice(0, change.from) + change.insert + text.slice(change.to), source);

void test('every selected subset removes its Markdown and JSON records in their independent orders', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const markdown = ids.map(block).join('');
    const companion =
        '{ "before": 1, "slides": { "d": {"layout":"end"}, "b": {"skipped":true}, "a": {"layout":"start"}, "c": {"future":2} }, "after": 3 }';
    const original: unknown = JSON.parse(companion);
    assert.ok(typeof original === 'object' && original !== null);
    for (let mask = 1; mask < 16; mask++) {
        const selected = ids.filter((_, index) => mask & (1 << index));
        const plan = planSlideDeletion(markdown, indexPresentation(markdown, 0)!, companion, selected)!;
        assert.ok(plan, String(mask));
        assert.equal(
            apply(markdown, plan.changes),
            ids
                .filter(id => !selected.includes(id))
                .map(block)
                .join('')
        );
        const next = JSON.parse(plan.companion) as { before: number; slides: Record<string, unknown>; after: number };
        assert.deepEqual(
            Object.keys(next.slides),
            ['d', 'b', 'a', 'c'].filter(id => !selected.includes(id))
        );
        assert.equal(next.before, 1);
        assert.equal(next.after, 3);
        assert.deepEqual(
            plan.document.slides.map(slide => slide.id),
            ids.filter(id => !selected.includes(id))
        );
    }
});

void test('unknown metadata, surviving raw JSON values, sections, and compositions stay byte-identical', () => {
    const header = '---\nmarkdownpoint: 1\ncustom: keep me\n---\n\n';
    const opening = '<!-- section: opening -->\n# Opening\n\n';
    const ending = '<!-- section: ending -->\n# Ending\n\n';
    const composition = '<!-- composition: shared -->\n<!-- control: caption -->\nKeep this reusable text.\n';
    const markdown = header + opening + block('a') + block('b') + ending + block('c') + composition;
    const raw = String.raw`{ "layout" : "content", "future": { "number": 900719925474099312345, "escape": "\u00e9", "array": [ 1, 2 ] } }`;
    const companion = `{\n  "document": "unchanged",\n  "slides" : {"a":{"layout":"title"}, "b":${raw}, "c":{"layout":"end"}},\n  "comments": {"thread":{"slide":"a","text":"Retain this thread"}},\n  "compositions": {"shared":{"controls":{}}}\n}\n`;
    const plan = planSlideDeletion(markdown, indexPresentation(markdown, header.length)!, companion, ['a', 'c'])!;
    assert.equal(apply(markdown, plan.changes), header + opening + block('b') + ending + composition);
    assert.ok(plan.companion.includes(raw));
    assert.ok(plan.companion.endsWith(companion.slice(companion.indexOf(',\n  "comments"'))));
    assert.equal(plan.companion.slice(0, plan.companion.indexOf('"slides"')), companion.slice(0, companion.indexOf('"slides"')));
});

void test('deleting all slides retains empty sections and reusable compositions', () => {
    const section = '<!-- section: empty -->\n# A section\n\n';
    const composition = '<!-- composition: shared -->\n<!-- text: caption -->\nReusable words\n';
    const markdown = section + block('a') + block('b') + composition;
    const plan = planSlideDeletion(markdown, indexPresentation(markdown, 0)!, '{"slides":{"a":{},"b":{}},"compositions":{"shared":{}}}', [
        'b',
        'a'
    ])!;
    assert.equal(apply(markdown, plan.changes), section + composition);
    assert.deepEqual(JSON.parse(plan.companion), { slides: {}, compositions: { shared: {} } });
    assert.deepEqual(plan.document.slides, []);
    assert.equal(plan.document.sections[0]!.id, 'empty');
});

void test('literal marker examples, CRLF and an unterminated surviving EOF stay untouched', () => {
    const a = block('a').replaceAll('\n', '\r\n');
    const b = '<!-- slide: b -->\r\n<!-- text: body -->\r\n```html\r\n<!-- slide: literal -->\r\n```\r\nLast words';
    const markdown = a + b;
    const plan = planSlideDeletion(markdown, indexPresentation(markdown, 0)!, '{\r\n"slides":{"a":{},"b":{}}\r\n}', ['a'])!;
    assert.equal(apply(markdown, plan.changes), b);
    assert.ok(plan.companion.includes('\r\n'));
});

void test('ambiguous or incomplete JSON and missing targets refuse the entire pair', () => {
    const markdown = block('a') + block('b');
    const document = indexPresentation(markdown, 0)!;
    for (const companion of [
        '',
        '{',
        '[]',
        '{"slides":null}',
        '{"slides":{}}',
        '{"slides":{"a":null}}',
        '{"slides":{"a":{},"a":{}}}',
        '{"slides":{"a":{},"\\u0061":{}}}',
        '{"slides":{"a":{}},"slides":{"a":{}}}',
        '{"slides":{"a":{},}}',
        '{"slides":{"a":{}} /* comment */}'
    ])
        assert.equal(planSlideDeletion(markdown, document, companion, ['a']), null, companion);
    for (const ids of [[], ['missing'], ['a', 'missing']]) {
        assert.equal(planSlideDeletion(markdown, document, '{"slides":{"a":{},"b":{}}}', ids), null);
    }
    const escaped = planSlideDeletion(markdown, document, '{"slides":{"\\u0061":{},"b":{}}}', ['a']);
    assert.ok(escaped);
    assert.deepEqual(JSON.parse(escaped.companion), { slides: { b: {} } });
});

void test('a large selection is planned without rewriting surviving records', () => {
    const ids = Array.from({ length: 1000 }, (_, index) => `slide-${index}`);
    const markdown = ids.map(block).join('');
    const companion = JSON.stringify({ slides: Object.fromEntries(ids.map(id => [id, { layout: 'content' }])) });
    const plan = planSlideDeletion(markdown, indexPresentation(markdown, 0)!, companion, ids.slice(1, -1))!;
    assert.ok(plan);
    assert.equal(apply(markdown, plan.changes), block(ids[0]!) + block(ids.at(-1)!));
    assert.deepEqual(Object.keys((JSON.parse(plan.companion) as { slides: object }).slides), [ids[0], ids.at(-1)]);
});
