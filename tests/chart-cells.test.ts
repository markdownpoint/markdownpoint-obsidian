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
import { chartNumberRule } from '../src/core/chart-numbers.ts';
import { presentationLocale, respellChartCells } from '../src/format/chart-cells.ts';
import { decodeSlideClipboard, encodeSlideClipboard } from '../src/format/clipboard.ts';
import { indexPresentation } from '../src/format/document.ts';
import { embeddedThemePaths, themeDocument } from '../src/format/embedded-theme.ts';
import { inlineText, wordTokens } from '../src/format/link-tokens.ts';
import { prepareClipboardPaste } from '../src/format/paste.ts';

const swedish = chartNumberRule('sv-SE');
const english = chartNumberRule('en-US');
const table = (...rows: string[]) => ['| | 2025 | 2026 |', '| --- | --- | --- |', ...rows].join('\n');

test("a Swedish chart's cells keep their numbers in an English presentation, each spelled as English writes it", () => {
    assert.equal(
        respellChartCells(table('| Sales | 1,234 | 1 234,5 |', '| Loss | -2,5 % | (1 234,50 kr) |'), swedish, english),
        table('| Sales | 1.234 | 1,234.5 |', '| Loss | -2.5 % | (1,234.50 kr) |')
    );
    assert.equal(respellChartCells(table('| Sales | 1.234 | 1,234.5 |'), english, swedish), table('| Sales | 1,234 | 1 234,5 |'));
});

test("a cell whose number changes its spelling is written as its words, as MarkdownPoint writes a chart's table, its marks set aside", () => {
    assert.equal(
        respellChartCells(
            table('| Sales | **1 234,5** | [1,5](https://example.com/1,5) |', '| Loss | `4,25` | ~~0,5~~ |'),
            swedish,
            english
        ),
        table('| Sales | 1,234.5 | 1.5 |', '| Loss | 4.25 | 0.5 |')
    );
    assert.equal(
        respellChartCells(table('| Sales | 1&nbsp;234,50 | **1,**234 |', '| Loss | 1\\,5 | 1,_234_ |'), swedish, english),
        table('| Sales | 1,234.50 | 1.234 |', '| Loss | 1.5 | 1.234 |')
    );
    assert.equal(
        respellChartCells(table('| Sales | [1](https://example.com "quoted, title"),234 | **5** |'), english, swedish),
        table('| Sales | 1 234 | **5** |')
    );
});

test('the words a respelled cell is written as read back as spelled, every mark that could open Markdown or a link escaped', () => {
    const marks = '\\*\\|\\<\\&\\[\\=\\~\\{\\`\\\\ .,%()+:;/?"$#!>@^\'';
    const written = respellChartCells(table(`| Sales | ${marks} 1,5 \\_\\]\\} | 2 |`), swedish, english);
    const cell = written.split('\n')[2]!.split(' | ')[1]!;
    assert.equal(cell, marks.replace(':', '\\:').replace('@', '\\@') + ' 1.5 \\_\\]\\}');
    assert.equal(inlineText(wordTokens(cell)), '*|<&[=~{`\\ .,%()+:;/?"$#!>@^\' 1.5 _]}');
    for (const [address, spelled] of [
        ['https://example.com/1,234', String.raw`https\://example.com/1.234`],
        ['<https://example.com/1,234>', String.raw`https\://example.com/1.234`],
        ['www.example.com/1,234', String.raw`www\.example.com/1.234`],
        ['mail@example.com 1,5', String.raw`mail\@example.com 1.5`]
    ] as const) {
        const respelled = respellChartCells(table(`| Sales | ${address} | 2 |`), swedish, english);
        assert.equal(respelled, table(`| Sales | ${spelled} | 2 |`));
        assert.ok(!wordTokens(spelled).some(token => token.type === 'link'), spelled);
    }
});

test("a cell's escaped pipe is a pipe, a code span's too, as a table reads it", () => {
    assert.equal(respellChartCells(table('| Sales | `1,5\\| kr` | 2\\|5 |'), swedish, english), table('| Sales | 1.5\\| kr | 2\\|5 |'));
});

test("a cell's HTML and pictures count as their characters, as a chart reads them, and its notes as nothing", () => {
    assert.equal(
        respellChartCells(
            table('| Sales | 1<br>,234 | 1,5 <b>kr</b> |', '| Loss | 1,5<!-- note --> | ![a](b.png) 2,5 |'),
            swedish,
            english
        ),
        table('| Sales | 1<br>,234 | 1.5 \\<b>kr\\</b> |', '| Loss | 1.5 | !\\[a\\](b.png) 2.5 |')
    );
});

test('a table of any line ending is respelled', () => {
    for (const ending of ['\r\n', '\r']) {
        const written = (words: string) => words.replaceAll('\n', ending);
        assert.equal(
            respellChartCells(written(table('| Sales | 1,234 | 1 234,5 |')), swedish, english),
            written(table('| Sales | 1.234 | 1,234.5 |'))
        );
    }
});

test('the header, the first column, words that hold no number, and words that are not one table stay as written', () => {
    const header = '| Region | 1,5 | 2,5 |\n| --- | --- | --- |\n| 1,5 | n/a | 1,5 kr |';
    assert.equal(respellChartCells(header, swedish, english), '| Region | 1,5 | 2,5 |\n| --- | --- | --- |\n| 1,5 | n/a | 1.5 kr |');
    for (const words of ['1,5', table('| Sales | 1,5 | 2,5 |') + '\n\nWords after.'])
        assert.equal(respellChartCells(words, swedish, english), words);
    const padded = `\n\n${table('| Sales | 1,5 |')}\r\n\n`;
    assert.equal(respellChartCells(padded, swedish, english), `\n\n${table('| Sales | 1.5 |')}\r\n\n`);
});

test("a presentation's language is its locale as the MarkdownPoint app reads it: canonical, and en-US where it names none", () => {
    assert.equal(presentationLocale({ locale: 'sv-se' }), 'sv-SE');
    assert.equal(presentationLocale({ locale: 'zh-hant-tw' }), 'zh-Hant-TW');
    assert.equal(presentationLocale({}), 'en-US');
});

const uuid = '11111111-1111-4111-8111-111111111111';
const path = 'deck/slides.md';
const paths = embeddedThemePaths(path, { theme: 'basic' }, ['title'])!;
const master = '{"markdownpoint":"1.0","kind":"master","id":"11111111-1111-4111-8111-111111111111"}';
const layout = '{"markdownpoint":"1.0","kind":"layout","objects":[{"id":"body","type":"text","placeholder":true}]}';
const theme = {
    key: 'basic',
    id: uuid,
    root: paths.root,
    master: { path: paths.master, source: master, value: themeDocument(master, 'master')! },
    layouts: new Map([['title', { path: paths.layouts.get('title')!, source: layout, value: themeDocument(layout, 'layout')! }]])
};
const definitionRecord = '{"objects":[{"id":"figures","type":"chart"}]}';
const definition = (cell: string) => `<!-- composition: card -->\n<!-- text: figures -->\n${table(`| Sales | ${cell} | 2 |`)}\n`;
const slideRecord =
    '{"layout":"title","objects":[{"id":"sales","type":"chart"},{"id":"grid","type":"table"},{"id":"instance","type":"composition","composition":"card"}]}';
const slide = `<!-- slide: first -->\n<!-- text: sales -->\n${table('| Sales | 1,234 | 1 234,5 |')}\n<!-- text: grid -->\n${table('| Sales | 1,234 | 1 234,5 |')}\n`;

test("a paste from a Swedish presentation into an English one respells its own charts, slides' and definitions', before a definition is matched against the destination's", () => {
    const captured = {
        slides: [{ id: 'first', markdown: slide, record: slideRecord }],
        compositions: [{ id: 'card', markdown: definition('0,5'), record: definitionRecord }]
    };
    const packet = decodeSlideClipboard(encodeSlideClipboard(uuid, { vault: uuid, path, document: uuid }, 'sv-SE', captured, theme)!)!;
    const markdown = definition('0.5');
    const companion = `{"markdownpoint":"1.0","slides":{},"compositions":{"card":${definitionRecord}}}`;
    const prepared = prepareClipboardPaste(packet, markdown, indexPresentation(markdown, 0)!, companion, new Map(), () => 'copy')!;
    assert.equal(
        prepared.slides[0]!.markdown,
        `<!-- slide: copy -->\n<!-- text: sales -->\n${table('| Sales | 1.234 | 1,234.5 |')}\n<!-- text: grid -->\n${table('| Sales | 1,234 | 1 234,5 |')}\n`
    );
    assert.deepEqual(prepared.compositions, [], "the destination's own definition is the one placed");
    assert.match(prepared.slides[0]!.record, /"composition":"card"/);
    const ids = ['copy', 'card-copy'];
    const swedishDeck = '{"markdownpoint":"1.0","locale":"sv-se","slides":{}}';
    const same = prepareClipboardPaste(packet, '', indexPresentation('', 0)!, swedishDeck, new Map(), () => ids.shift()!)!;
    assert.equal(same.slides[0]!.markdown, slide.replace('slide: first', 'slide: copy'));
    assert.equal(same.compositions[0]!.markdown, definition('0,5').replace('composition: card', 'composition: card-copy'));
});
