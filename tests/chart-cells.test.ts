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
import { inlineText, markdownWords, wordTokens } from '../src/format/link-tokens.ts';
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

/** Words with each `·` a no-break space, the group mark Swedish writes. */
const spaced = (words: string) => words.replaceAll('·', String.fromCharCode(0xa0));

/**
 * Cells respelled from the locale named into the other of en-US and sv-SE, beside what MarkdownPoint core's
 * `respellChartTable` (`scene/chart-respelling.ts`) writes for each at its c57919aa72, and what the plugin writes where it
 * writes otherwise.
 */
const respelledByCore: readonly (readonly [locale: string, cell: string, core: string, plugin?: string])[] = [
    ['en-US', '**1,234**', '**1·234**'],
    ['en-US', '1,**234**', '1·**234**'],
    ['en-US', '**1**,234', '**1**·234'],
    ['sv-SE', '1 **234**', '1**,234**'],
    ['sv-SE', '**1** 234', '**1**,234'],
    ['sv-SE', '1 234**,5**', '1,234**.5**'],
    ['en-US', '**1,**234', '**1**·234'],
    ['en-US', '**1**,**234**', '**1·234**'],
    ['en-US', '1**,**234', '1·234'],
    ['en-US', '1,2**3**4', '1·2**3**4'],
    ['en-US', '*1*,*234*', '*1·234*'],
    ['sv-SE', '*1* *234*', '*1,234*'],
    ['en-US', '_1_,234', '*1*·234'],
    ['sv-SE', '1 _234_', '1*,234*'],
    ['en-US', '__1__,234', '**1**·234'],
    ['en-US', '_*1,234*_', '*1·234*'],
    ['en-US', '***1,234***', '***1·234***'],
    ['en-US', '==1,234==', '==1·234=='],
    ['sv-SE', '1 ==234==', '1==,234=='],
    ['en-US', '1,~~234~~', '1·~~234~~'],
    ['en-US', '[1,234](https://example.com/1,234)', '[1·234](https://example.com/1,234)'],
    ['en-US', '1,[234](https://example.com)', '1[·234](https://example.com)'],
    ['sv-SE', '[1](https://example.com) [234](https://example.com)', '[1,234](https://example.com)'],
    ['en-US', '1,[234]{color=accent}', '1[·234]{color=accent}'],
    ['en-US', '`1,234`', '`1·234`'],
    ['en-US', '`1,`234', '`1`·234'],
    ['en-US', '1`,234`', '1`·234`'],
    ['en-US', '1\\,234', '1·234'],
    ['en-US', '1&#44;234', '1·234'],
    // A number of more digits than CommonMark reads names no character, so the cell holds no number and stays.
    ['en-US', '1&#00000044;234', '1&#00000044;234'],
    ['en-US', '1&#x000002C;234', '1&#x000002C;234'],
    ['en-US', '&#00000065;1,234.50', '&#00000065;1,234.50'],
    ['en-US', '1,234&nbsp;kr', '1·234·kr'],
    ['sv-SE', '-1 234,5 %', '-1,234.5 %'],
    ['en-US', '$1,234.50', '$1·234,50'],
    ['en-US', '1,234 \\| kr', '1·234 \\| kr'],
    ['sv-SE', '1<br>234,5', '1<br>234,5'],
    ['sv-SE', 'mail@example.com 1,5', 'mail@example.com 1.5'],
    ['en-US', '1,234 💰', '1·234 💰'],
    ['sv-SE', '😀**1,5**', '😀**1.5**'],
    // Core writes the whole table anew, so it also writes a note, HTML, a picture, an escape, an address, an empty link
    // and a code span's padding its own way, where the plugin keeps the Markdown around the number's runs as written.
    ['en-US', '1,234<!-- note -->', '1·234', '1·234<!-- note -->'],
    ['sv-SE', '1 234,5 <b>kr</b>', '1,234.5 \\<b\\>kr\\</b\\>', '1,234.5 <b>kr</b>'],
    ['sv-SE', '![a](b.png) 2,5', '![a\\](b.png) 2.5', '![a](b.png) 2.5'],
    ['en-US', '1,234 \\*', '1·234 *', '1·234 \\*'],
    ['en-US', '1,234 <https://example.com/a>', '1·234 [https://example.com/a](https://example.com/a)', '1·234 <https://example.com/a>'],
    ['sv-SE', '[](https://example.com) 1,5', '&#32;1.5', '[](https://example.com) 1.5'],
    ['sv-SE', '` 1,5 `', '`1.5`', '` 1.5 `'],
    ['en-US', '`1`,`234`', '`1·234`'],
    // An address the number runs through is written as its words, so it doesn't link to another address.
    ['sv-SE', 'https://example.com/1,234', 'https://example.com/1.234', 'https\\://example.com/1.234']
];

test("a respelled cell keeps its marks, links and code around its number's runs, as MarkdownPoint core respells it", () => {
    for (const [locale, cell, core, plugin = core] of respelledByCore) {
        const [from, to] = locale === 'en-US' ? [english, swedish] : [swedish, english];
        assert.equal(respellChartCells(table(`| Sales | ${cell} |`), from, to), table(`| Sales | ${spaced(plugin)} |`), cell);
    }
});

test("a cell's words read a character reference as MarkdownPoint core reads it, CommonMark's way", () => {
    // Each beside core's `plainWords` (`format/markdown-text.ts`) at its c57919aa72.
    const read: readonly (readonly [source: string, words: string])[] = [
        ["It's 1 & 2 &lt; 3", "It's 1 & 2 < 3"],
        ['&#65;&#x42;', 'AB'],
        ['&#38;#65;', '&#65;'],
        ['&#00000065;', '&#00000065;'],
        ['&#x0000041;', '&#x0000041;'],
        ['&#12345678;', '&#12345678;'],
        ['&#128;', '\u0080'],
        ['&#0;', '\ufffd'],
        ['&#xD800;', '\ufffd'],
        ['&#x110000;', '\ufffd'],
        ['&notaname;', '&notaname;']
    ];
    for (const [source, words] of read) assert.equal(markdownWords(source), words, source);
});

test('a cell whose marks would read otherwise once respelled is written as its words', () => {
    assert.equal(respellChartCells(table('| Sales | *1**,2**34.5* |'), english, swedish), table(spaced('| Sales | 1·234,5 |')));
});

test('the words a respelled run is written as read back as spelled, every mark that could open Markdown or a link escaped', () => {
    const marks = '\\*\\|\\<\\&\\[\\=\\~\\{\\`\\\\ .,%()+:;/?"$#!>@^\'';
    const written = respellChartCells(table(`| Sales | ${marks} 1,5 \\_\\]\\} | 2 |`), swedish, english);
    const cell = written.split('\n')[2]!.split(' | ')[1]!;
    assert.equal(cell, marks.replace(':', '\\:').replace('@', '\\@') + ' 1.5 \\_\\]\\}');
    assert.equal(inlineText(wordTokens(cell)), '*|<&[=~{`\\ .,%()+:;/?"$#!>@^\' 1.5 _]}');
    for (const [address, spelled] of [
        ['https://example.com/1,234', String.raw`https\://example.com/1.234`],
        ['<https://example.com/1,234>', String.raw`https\://example.com/1.234`],
        ['www.example.com/1,234', String.raw`www\.example.com/1.234`]
    ] as const) {
        const respelled = respellChartCells(table(`| Sales | ${address} | 2 |`), swedish, english);
        assert.equal(respelled, table(`| Sales | ${spelled} | 2 |`));
        assert.ok(!wordTokens(spelled).some(token => token.type === 'link'), spelled);
    }
});

test("a cell's escaped pipe is a pipe, a code span's too, as a table reads it", () => {
    assert.equal(
        respellChartCells(table('| Sales | `1,5\\| kr` | 2\\|5 |', '| Loss | 1,5 \\| kr | 2 |'), swedish, english),
        table('| Sales | `1.5\\| kr` | 2\\|5 |', '| Loss | 1.5 \\| kr | 2 |')
    );
});

test("a cell's HTML and pictures count as their characters, as a chart reads them, and its notes as nothing, each written as it was", () => {
    assert.equal(
        respellChartCells(
            table('| Sales | 1<br>,234 | 1,5 <b>kr</b> |', '| Loss | 1,5<!-- note --> | ![a](b.png) 2,5 |'),
            swedish,
            english
        ),
        table('| Sales | 1<br>,234 | 1.5 <b>kr</b> |', '| Loss | 1.5<!-- note --> | ![a](b.png) 2.5 |')
    );
    assert.equal(respellChartCells(table('| Sales | ![1,5](b.png) |'), swedish, english), table('| Sales | !\\[1.5\\](b.png) |'));
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
const master = '{"markdownpoint":"1.0","type":"master","id":"11111111-1111-4111-8111-111111111111"}';
const layout = '{"markdownpoint":"1.0","type":"layout","objects":[{"id":"body","type":"text","placeholder":true}]}';
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
    '{"layout":"title","objects":[{"id":"sales","type":"chart"},{"id":"grid","type":"table"},{"id":"instance","type":"instance","composition":"card"}]}';
const slide = `<!-- slide: first -->\n<!-- text: sales -->\n${table('| Sales | 1,234 | 1 234,5 |')}\n<!-- text: grid -->\n${table('| Sales | 1,234 | 1 234,5 |')}\n`;

test("a paste from a Swedish presentation into an English one respells its own charts, slides' and definitions', before a definition is matched against the destination's", () => {
    const captured = {
        slides: [{ id: 'first', markdown: slide, record: slideRecord }],
        compositions: [{ id: 'card', markdown: definition('0,5'), record: definitionRecord }]
    };
    const packet = decodeSlideClipboard(
        encodeSlideClipboard(uuid, { vault: uuid, path, presentationId: uuid }, 'sv-SE', captured, theme)!
    )!;
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
