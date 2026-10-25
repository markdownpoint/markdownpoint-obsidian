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
import { prepareCopiedPart } from '../src/format/prepare-copy.ts';

const slides = new Map([
    ['one', 'copy-one'],
    ['two', 'copy-two']
]);
const compositions = new Map([['card', 'copy-card']]);
const schemas = new Map<string, 'rich-text' | 'table'>([
    ['body', 'rich-text'],
    ['card.caption', 'rich-text'],
    ['data', 'table']
]);

test('complete slide preparation changes only identity and actual Markdown/JSON references', () => {
    const markdown =
        '<!--  slide: one  --> \r\n<!-- author comment -->\r\n<!-- text: body -->\r\n[Go](slide:two) and `[No](slide:two)`.\r\n\r\n<!-- text: card.caption -->\r\n[Back](slide:one).\r\n<!-- notes -->\r\n[Next](slide:two).\r\n\r\n \t';
    const record = String.raw`{ "layout":"title", "future":9007199254740993, "escaped":"\u0061", "objects":["title",{"id":"card","type":"composition","source":"card","link":"slide:two"}] }`;
    const result = prepareCopiedPart({ id: 'one', markdown, record }, 'slide', slides, compositions, schemas)!;
    assert.ok(result);
    assert.equal(result.id, 'copy-one');
    assert.equal(
        result.markdown,
        markdown
            .replace('slide: one', 'slide: copy-one')
            .replace('[Go](slide:two)', '[Go](slide:copy-two)')
            .replace('[Back](slide:one)', '[Back](slide:copy-one)')
            .replace('[Next](slide:two)', '[Next](slide:copy-two)')
    );
    assert.equal(
        result.record,
        record.replace('"source":"card"', '"source":"copy-card"').replace('"link":"slide:two"', '"link":"slide:copy-two"')
    );
});

test('composition defaults and text use copied slide destinations without changing controls or bindings', () => {
    const markdown = '<!--composition:card-->\n<!-- control: caption -->\n[Default](slide:two)\n<!-- text: body -->\n[Words](slide:one)\n';
    const record =
        '{"controls":{"caption":{"type":"text"},"link":{"type":"color","default":"accent"}},"objects":[{"id":"label","type":"text","bind":{"text":"caption"},"link":"slide:two"}]}';
    const result = prepareCopiedPart({ id: 'card', markdown, record }, 'composition', slides, compositions, schemas)!;
    assert.ok(result);
    assert.equal(result.id, 'copy-card');
    assert.equal(
        result.markdown,
        markdown
            .replace('composition:card', 'composition:copy-card')
            .replace('slide:two', 'slide:copy-two')
            .replace('slide:one', 'slide:copy-one')
    );
    assert.equal(result.record, record.replace('"link":"slide:two"', '"link":"slide:copy-two"'));
});

test('the caller supplies real field schemas while literal tables and code retain their source', () => {
    const table = '| Heading |\n| --- |\n| [Go](slide:two) |\n';
    const markdown =
        '<!-- slide: one -->\n<!-- text: body -->\n' + table + '\n<!-- text: data -->\n' + table + '\n<!-- notes -->\n' + table;
    const result = prepareCopiedPart({ id: 'one', markdown, record: '{}' }, 'slide', slides, compositions, schemas)!;
    assert.equal(
        result.markdown,
        markdown
            .replace('slide: one', 'slide: copy-one')
            .replace('<!-- text: data -->\n' + table, '<!-- text: data -->\n' + table.replace('slide:two', 'slide:copy-two'))
    );
    assert.equal(prepareCopiedPart({ id: 'one', markdown, record: '{}' }, 'slide', slides, compositions, new Map()), null);
    const fenced = '<!-- slide: one -->\n<!-- text: body -->\n```md\n<!-- slide: example -->\n[Go](slide:two)\n```\n';
    assert.equal(
        prepareCopiedPart({ id: 'one', markdown: fenced, record: '{}' }, 'slide', slides, compositions, schemas)!.markdown,
        fenced.replace('slide: one', 'slide: copy-one')
    );
});

test('preparation refuses mismatched or incomplete captured parts without producing partial copies', () => {
    const one = '<!-- slide: one -->\n';
    for (const markdown of [
        '',
        'prefix\n' + one,
        one + '<!-- slide: two -->\n',
        one + '<!-- section: end -->\n# End\n',
        one + '<!-- composition: card -->\n'
    ]) {
        assert.equal(prepareCopiedPart({ id: 'one', markdown, record: '{}' }, 'slide', slides, compositions, schemas), null);
    }
    assert.equal(prepareCopiedPart({ id: 'wrong', markdown: one, record: '{}' }, 'slide', slides, compositions, schemas), null);
    assert.equal(prepareCopiedPart({ id: 'one', markdown: one, record: '{}' }, 'composition', slides, compositions, schemas), null);
    assert.equal(prepareCopiedPart({ id: 'one', markdown: one, record: '{' }, 'slide', slides, compositions, schemas), null);
    assert.equal(
        prepareCopiedPart({ id: 'one', markdown: one, record: '{}' }, 'slide', new Map([['one', 'Bad ID']]), compositions, schemas),
        null
    );
    const unchanged = { id: 'one', markdown: one, record: '{ "extra":9007199254740993 }' };
    assert.deepEqual(prepareCopiedPart(unchanged, 'slide', new Map(), new Map(), new Map()), unchanged);
});
