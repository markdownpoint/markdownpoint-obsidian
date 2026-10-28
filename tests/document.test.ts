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
import { indexPresentation, slideAtPosition } from '../src/format/document.ts';

test('slides and their field ranges follow source order and preserve every source byte', () => {
    const text =
        '<!-- slide: opening -->\n\n<!-- text: heading -->\n\nStart here.\n\n<!-- notes -->\nA reminder.\n\n<!-- slide: closing -->\n\n<!-- text: summary -->\n';
    const document = indexPresentation(text, 0);
    assert.ok(document);
    assert.deepEqual(
        document.slides.map(slide => slide.id),
        ['opening', 'closing']
    );
    const opening = document.slides[0]!;
    assert.equal(text.slice(opening.from, opening.markerTo), '<!-- slide: opening -->\n');
    assert.equal(opening.to, document.slides[1]!.from);
    assert.deepEqual(
        opening.blocks.map(block => [block.kind, block.id, text.slice(block.contentFrom, block.to)]),
        [
            ['text', 'heading', '\nStart here.\n\n'],
            ['notes', null, 'A reminder.\n\n']
        ]
    );
    const empty = document.slides[1]!.blocks[0]!;
    assert.equal(empty.contentFrom, empty.to);
    assert.equal(document.slides.map(slide => text.slice(slide.from, slide.to)).join(''), text);
});

test('CRLF positions and frontmatter offsets still refer to the original document', () => {
    const header = '---\r\nmarkdownpoint: "1.0"\r\nid: 12345678-1234-1234-1234-123456789abc\r\n---\r\n\r\n';
    const text = header + '<!-- slide: opening -->\r\n\r\n<!-- text: heading -->\r\nWords.\r\n';
    const slide = indexPresentation(text, header.length)!.slides[0]!;
    assert.equal(slide.from, header.length);
    assert.equal(slide.line, 5);
    assert.equal(text.slice(slide.blocks[0]!.contentFrom), 'Words.\r\n');
});

test('marker-shaped lines in backtick and tilde code remain field content', () => {
    for (const fence of ['```', '~~~~']) {
        const text = `<!-- slide: actual -->\n\n<!-- text: example -->\n${fence}md\n<!-- slide: example -->\n<!-- text: fake -->\n<!-- notes -->\n${fence}\n\n<!-- slide: next -->\n`;
        const document = indexPresentation(text, 0)!;
        assert.deepEqual(
            document.slides.map(slide => slide.id),
            ['actual', 'next']
        );
        assert.ok(
            text.slice(document.slides[0]!.blocks[0]!.contentFrom, document.slides[0]!.blocks[0]!.to).includes('<!-- slide: example -->')
        );
    }
});

test('code in a list or quote ends with its container; HTML stays within its field', () => {
    for (const words of ['- ```\n  example\n  ```', '> ~~~\n> example\n> ~~~', '<!-- a comment\n```\n-->', '<script>']) {
        const text = `<!-- slide: first -->\n\n<!-- text: body -->\n${words}\n\n<!-- slide: second -->\n`;
        assert.deepEqual(
            indexPresentation(text, 0)!.slides.map(slide => slide.id),
            ['first', 'second']
        );
    }
});

test('section and composition boundaries do not become slides or extend a preceding slide', () => {
    const text =
        '<!-- section: introduction -->\n# Introduction\n\n<!-- slide: first -->\n\n<!-- text: nested.heading -->\nA heading.\n\n<!-- section: close -->\n# Close\n\n<!-- slide: second -->\n\n<!-- composition: shared -->\n\n<!-- control: caption -->\nReusable words.\n';
    const document = indexPresentation(text, 0)!;
    assert.deepEqual(
        document.slides.map(slide => slide.id),
        ['first', 'second']
    );
    assert.equal(document.slides[0]!.to, text.indexOf('<!-- section: close -->'));
    assert.equal(document.slides[1]!.to, text.indexOf('<!-- composition: shared -->'));
    assert.equal(document.slides[0]!.blocks[0]!.id, 'nested.heading');
});

test('invalid or duplicate structural markers cannot publish misleading source ranges', () => {
    for (const text of [
        '<!-- slide: repeated -->\n<!-- slide: repeated -->\n',
        '<!-- Slide: upper -->\n',
        '<!-- slide: trailing- -->\n',
        '<!-- slide: double--dash -->\n',
        '<!-- slide: missing-newline -->',
        '<!-- slide: first -->\n<!-- notes: named -->\n',
        '<!-- text: orphan -->\n',
        '<!-- slide: first -->\n<!-- control: wrong-container -->\n'
    ])
        assert.equal(indexPresentation(text, 0), null, text);
});

test('ordinary comments, escaped directives, and horizontal rules stay in their text block', () => {
    const words =
        'Words.\n\n---\n\n<!-- Notes for a future rehearsal -->\n<!-- Notes: remember a pause -->\n\\<!-- slide: literal -->\n<!--\\ text: literal -->\n';
    const text = `<!-- slide: first -->\n<!-- text: content -->\n${words}`;
    const document = indexPresentation(text, 0)!;
    assert.equal(document.slides.length, 1);
    assert.equal(text.slice(document.slides[0]!.blocks[0]!.contentFrom), words);
});

test('a code fence that swallows a marker and never closes cannot publish a partial slide list', () => {
    const text = '<!-- slide: first -->\n<!-- text: body -->\n```md\n<!-- slide: hidden -->\nMore code.\n';
    assert.equal(indexPresentation(text, 0), null);
});

test('sequential fenced examples retain literal markers and exact source ranges', () => {
    for (const newline of ['\n', '\r\n']) {
        const words = [
            'Before.',
            '````md',
            '<!-- slide: example -->',
            '```',
            '<!-- notes -->',
            '  ````',
            'Between.',
            '~~~md',
            '<!-- text: example -->',
            '~~~~~',
            'After.',
            ''
        ].join(newline);
        const source = `<!-- slide: first -->${newline}<!-- text: body -->${newline}${words}<!-- slide: second -->${newline}`;
        const document = indexPresentation(source, 0)!;
        assert.deepEqual(
            document.slides.map(slide => slide.id),
            ['first', 'second']
        );
        const field = document.slides[0]!.blocks[0]!;
        assert.equal(source.slice(field.contentFrom, field.to), words);
        assert.equal(document.slides[1]!.line, source.slice(0, document.slides[1]!.from).split('\n').length - 1);
    }
});

test('an unfinished later fence still refuses swallowed markers after a closed example', () => {
    const source =
        '<!-- slide: first -->\n<!-- text: body -->\n```md\n<!-- slide: example -->\n```\n\n~~~md\n<!-- slide: swallowed -->\n    ~~~\n';
    assert.equal(indexPresentation(source, 0), null);
    assert.deepEqual(
        indexPresentation(source + '~~~\n<!-- slide: second -->\n', 0)!.slides.map(slide => slide.id),
        ['first', 'second']
    );
});

test('fence closure follows the lexer for mixed closing runs and trailing tabs', () => {
    for (const prefix of ['', 'Before.\n']) {
        const first = `<!-- slide: first -->\n<!-- text: body -->\n${prefix}\`\`\`md\n<!-- slide: literal -->\n`;
        const rest = '<!-- slide: second -->\n<!-- text: body -->\n```md\n<!-- text: literal -->\n```\n<!-- slide: third -->\n';
        assert.deepEqual(
            indexPresentation(first + '```~\n' + rest, 0)!.slides.map(slide => slide.id),
            ['first', 'second', 'third']
        );
        assert.equal(indexPresentation(first + '```\t\n<!-- slide: second -->\n', 0), null);
        assert.equal(indexPresentation(first + '```\t\n', 0), null);
    }
});

test('multiline link titles retain the lexical context before a fence-like line', () => {
    const source =
        '<!-- slide: first -->\n<!-- text: body -->\n[ref]: /help "A title\n~~~md\n<!-- slide: literal -->\nend"\n<!-- slide: second -->\n';
    assert.deepEqual(
        indexPresentation(source, 0)!.slides.map(slide => slide.id),
        ['first', 'second']
    );
});

test('bare carriage returns keep the full lexer context', () => {
    const source = '<!-- slide: first -->\n<!-- text: body -->\n```md\n<!-- slide: literal -->\n  \r```\n<!-- slide: second -->\n';
    assert.deepEqual(
        indexPresentation(source, 0)!.slides.map(slide => slide.id),
        ['first', 'second']
    );
});

test('a large deck produces one ordered index without changing its source', () => {
    const text = Array.from(
        { length: 6000 },
        (_, index) => `<!-- slide: page-${index} -->\n<!-- text: body -->\nWords for page ${index}.\n\n`
    ).join('');
    const document = indexPresentation(text, 0)!;
    assert.equal(document.slides.length, 6000);
    assert.equal(document.slides[5999]!.id, 'page-5999');
    assert.equal(document.slides[5999]!.to, text.length);
});

test('section heading ranges preserve source positions, including empty and trailing sections', () => {
    const text =
        '<!-- section: opening -->\n# Opening\n<!-- slide: first -->\n<!-- text: body -->\n```md\n<!-- section: example -->\n# An example\n```\n<!-- section: empty -->\n# Empty\n<!-- section: end -->\n# End\n';
    const document = indexPresentation(text, 0)!;
    assert.deepEqual(
        document.sections.map(section => section.id),
        ['opening', 'empty', 'end']
    );
    for (const section of document.sections) assert.equal(section.line, text.slice(0, section.from).split('\n').length - 1);
    assert.equal(text.slice(document.sections[0]!.markerTo, document.sections[0]!.to), '# Opening\n');
    assert.equal(document.sections[2]!.to, text.length);
    assert.equal(indexPresentation('<!-- section: repeated -->\n# One\n<!-- section: repeated -->\n# Two\n', 0), null);
});

test('caret lookup follows slide ranges without claiming section headings or compositions', () => {
    const markdown =
        'Frontmatter gap.\n<!-- section: opening -->\n# Opening\n<!-- slide: first -->\n<!-- text: title -->\nFirst.\n\n<!-- notes -->\nRemember.\n\n<!-- section: ending -->\n# Ending\n<!-- slide: last -->\n<!-- text: body -->\nLast.\n\n<!-- composition: shared -->\n<!-- control: caption -->\nReusable.\n';
    const document = indexPresentation(markdown, 0)!;
    const [first, last] = document.slides;
    assert.ok(first && last);
    for (const slide of document.slides) {
        assert.equal(slideAtPosition(document, slide.from), slide);
        assert.equal(slideAtPosition(document, slide.markerTo), slide);
        assert.equal(slideAtPosition(document, slide.to - 1), slide);
    }
    assert.equal(slideAtPosition(document, markdown.indexOf('Remember.')), first);
    assert.equal(slideAtPosition(document, 0), null);
    assert.equal(slideAtPosition(document, document.sections[1]!.markerTo), null);
    assert.equal(slideAtPosition(document, last.to), null);
    assert.equal(slideAtPosition(document, markdown.length - 1), null);
    assert.equal(slideAtPosition({ slides: [], compositions: [], sections: [] }, 0), null);
});

test('composition definitions retain complete control and text ranges wherever they occur', () => {
    const leading =
        '<!-- composition: shared -->\r\n<!-- control: caption -->\r\nDefault words.\r\n\r\n<!-- text: label -->\r\nStatic words.\r\n';
    const section = '<!-- section: opening -->\r\n# Opening\r\n';
    const slide = '<!-- slide: actual -->\r\n<!-- text: badge.caption -->\r\nInstance words.\r\n';
    const ending = '<!-- composition: other -->\r\n<!-- control: body -->\r\nFinal words.\r\n\r\n \t';
    const markdown = leading + section + slide + ending;
    const document = indexPresentation(markdown, 0)!;
    assert.deepEqual(
        document.slides.map(slide => slide.id),
        ['actual']
    );
    assert.deepEqual(
        document.compositions.map(part => part.id),
        ['shared', 'other']
    );
    assert.deepEqual(
        document.compositions.map(part => markdown.slice(part.from, part.to)),
        [leading, ending]
    );
    assert.deepEqual(
        document.compositions[0]!.blocks.map(block => [block.kind, block.id, markdown.slice(block.contentFrom, block.to)]),
        [
            ['control', 'caption', 'Default words.\r\n\r\n'],
            ['text', 'label', 'Static words.\r\n']
        ]
    );
    assert.equal(document.slides[0]!.blocks[0]!.id, 'badge.caption');
    assert.equal(document.sections[0]!.to, leading.length + section.length);
    assert.equal(slideAtPosition(document, markdown.length - 1), null);
});

test("a control is named in the author's words, in its marker and after an instance's first dot, and other words are a comment", () => {
    const notes = '<!-- text: ask Anna -->\nRemember.\n\n';
    const markdown =
        '<!-- slide: actual -->\n<!-- text: badge.Headline text -->\nInstance words.\n\n<!-- text: badge.Step 1.5 -->\nMore.\n\n<!-- notes -->\n' +
        notes +
        '<!-- composition: shared -->\n<!-- control: Headline text -->\nDefault words.\n\n<!-- control: 見出し -->\nWords.\n';
    const document = indexPresentation(markdown, 0)!;
    const slide = document.slides[0]!;
    assert.deepEqual(
        slide.blocks.map(block => [block.kind, block.id]),
        [
            ['text', 'badge.Headline text'],
            ['text', 'badge.Step 1.5'],
            ['notes', null]
        ]
    );
    assert.equal(markdown.slice(slide.blocks[2]!.contentFrom, slide.blocks[2]!.to), notes, 'words that name no instance stay notes');
    assert.deepEqual(
        document.compositions[0]!.blocks.map(block => [block.kind, block.id]),
        [
            ['control', 'Headline text'],
            ['control', '見出し']
        ]
    );
    // A control's marker, or an instance's text marker, whose words are no name refuses the file, as MarkdownPoint reports it.
    for (const line of ['<!-- control: Headline  text -->', '<!-- text: badge.Headline  text -->', '<!-- control: a --> b -->'])
        assert.equal(indexPresentation(`<!-- composition: shared -->\n${line}\nWords.\n`, 0), null, line);
});

test('literal composition/control examples stay in their field and real definitions have globally unique IDs', () => {
    const markdown =
        '<!-- composition: shared -->\n<!-- control: sample -->\n```md\n<!-- composition: example -->\n<!-- control: example -->\n```\n<!-- slide: actual -->\n<!-- text: title -->\nWords.\n';
    const document = indexPresentation(markdown, 0)!;
    assert.deepEqual(
        document.compositions.map(part => part.id),
        ['shared']
    );
    assert.equal(document.compositions[0]!.blocks.length, 1);
    assert.ok(
        markdown
            .slice(document.compositions[0]!.blocks[0]!.contentFrom, document.compositions[0]!.blocks[0]!.to)
            .includes('<!-- control: example -->')
    );
    for (const source of [
        '<!-- composition: same -->\n<!-- composition: same -->\n',
        '<!-- composition: same -->\n<!-- slide: same -->\n',
        '<!-- slide: same -->\n<!-- composition: same -->\n'
    ])
        assert.equal(indexPresentation(source, 0), null);
    assert.ok(indexPresentation('<!-- section: same -->\n# Same\n<!-- composition: same -->\n', 0));
});

test('a line break tag starts a paragraph, so a fenced example after it keeps its marker as content', () => {
    const fence = '```';
    const rest = '\n<!-- slide: two -->\n<!-- text: body -->\nTwo\n';
    for (const opening of ['<!-- text: body -->\n<br>\n', '<!-- text: body -->\nIntro\n\n<br/>\n']) {
        const markdown = `<!-- slide: one -->\n${opening}${fence}markdown\n<!-- slide: example -->\n${fence}\n${rest}`;
        assert.deepEqual(
            indexPresentation(markdown, 0)?.slides.map(slide => slide.id),
            ['one', 'two'],
            opening
        );
    }
});

test('only the fence that took in a marker makes an unclosed code block refuse the file', () => {
    const fence = '```';
    const closedSwallow = `${fence}\n<!-- text: t -->\n${fence}\n`;
    // The empty list item keeps the swallowing fence from opening the field, as in the shrunk fuzz case
    const markdown = `<!-- slide: s0 -->\n<!-- text: t -->\n   - \n${closedSwallow}   ${fence}\n- ${fence}\n`;
    assert.deepEqual(
        indexPresentation(markdown, 0)?.slides.map(slide => slide.id),
        ['s0']
    );
    const swallowing = `<!-- slide: s0 -->\n<!-- text: t -->\nIntro\n${fence}\n<!-- slide: s1 -->\n`;
    assert.equal(indexPresentation(swallowing, 0), null);
});
