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
import { readPresentationPair } from '../src/readers/markdownpoint-readers.js';
import { assertLinear } from './support/linear.ts';

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

test('a marker ended by a bare CR opens its slide, as MarkdownPoint reads it, with its range through the CR', () => {
    const front = '---\nmarkdownpoint: "1.0"\nid: 318494ee-4e44-456f-818a-ec761b41fec2\n---\n';
    const ranges = (text: string) =>
        indexPresentation(text, front.length)?.slides.map(({ id, from, markerTo, line, to }) => ({ id, from, markerTo, line, to }));
    const one = front + '<!-- slide: a -->\r';
    assert.deepEqual(ranges(one), [{ id: 'a', from: front.length, markerTo: one.length, line: 4, to: one.length }]);
    const two = front + '<!-- slide: a -->\r<!-- slide: b -->\r';
    const second = front.length + '<!-- slide: a -->\r'.length;
    assert.deepEqual(ranges(two), [
        { id: 'a', from: front.length, markerTo: second, line: 4, to: second },
        { id: 'b', from: second, markerTo: two.length, line: 5, to: two.length }
    ]);
});

test('CR, LF and CRLF line ends give one structure, a bare CR at the offsets LF gives', () => {
    const lines = [
        '<!-- slide: opening -->',
        '',
        '<!-- text: body -->',
        '```md',
        '<!-- slide: literal -->',
        '```',
        'Words.',
        '<!-- notes -->',
        'A reminder.',
        '',
        '<!-- slide: closing -->',
        ''
    ];
    const lf = indexPresentation(lines.join('\n'), 0)!;
    assert.deepEqual(
        lf.slides.map(slide => [slide.id, slide.line, slide.blocks.map(block => block.kind)]),
        [
            ['opening', 0, ['text', 'notes']],
            ['closing', 10, []]
        ]
    );
    assert.deepEqual(indexPresentation(lines.join('\r'), 0), lf);
    const text = lines.join('\r\n');
    const crlf = indexPresentation(text, 0)!;
    assert.deepEqual(
        crlf.slides.map(slide => [slide.id, slide.line, slide.blocks.map(block => block.kind)]),
        lf.slides.map(slide => [slide.id, slide.line, slide.blocks.map(block => block.kind)])
    );
    assert.deepEqual(
        crlf.slides.map(slide => text.slice(slide.from, slide.markerTo)),
        ['<!-- slide: opening -->\r\n', '<!-- slide: closing -->\r\n']
    );
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

test('spaces or tabs inside a marker do not change it', () => {
    const text = '<!--\t slide:\t opening \t-->\n\n<!--  text:\theading  -->\nStart here.\n\n<!--\tnotes\t-->\nA reminder.\n';
    const document = indexPresentation(text, 0)!;
    assert.deepEqual(
        document.slides.map(slide => [slide.id, slide.blocks.map(block => [block.kind, block.id])]),
        [
            [
                'opening',
                [
                    ['text', 'heading'],
                    ['notes', null]
                ]
            ]
        ]
    );
});

test("a marker with spaces or tabs before it is that marker; in fenced code, a list item's included, it is the code's words", () => {
    for (const indent of [' ', '   ', '\t', '    ']) {
        const text = `${indent}<!-- slide: opening -->\n\n${indent}<!-- text: heading -->\nStart here.\n\n${indent}<!-- notes -->\nA reminder.\n\n${indent}<!-- slide: closing -->\n`;
        const document = indexPresentation(text, 0)!;
        assert.deepEqual(
            document.slides.map(slide => [
                slide.id,
                slide.blocks.map(block => [block.kind, block.id, text.slice(block.contentFrom, block.to)])
            ]),
            [
                [
                    'opening',
                    [
                        ['text', 'heading', 'Start here.\n\n'],
                        ['notes', null, 'A reminder.\n\n']
                    ]
                ],
                ['closing', []]
            ],
            JSON.stringify(indent)
        );
    }
    for (const [words, slides] of [
        ['```\nexample\n```\n  <!-- slide: after -->', ['first', 'after', 'second']],
        ['Hi.\n\n    <!-- slide: after -->', ['first', 'after', 'second']],
        ['```\n  <!-- slide: example -->\n```', ['first', 'second']],
        ['- a\n  ```\n  <!-- slide: example -->\n  ```', ['first', 'second']],
        ['- a\n  ```\n  <!-- slide: example -->', ['first', 'second']]
    ] as const) {
        const text = `<!-- slide: first -->\n\n<!-- text: body -->\n${words}\n\n<!-- slide: second -->\n`;
        assert.deepEqual(
            indexPresentation(text, 0)?.slides.map(slide => slide.id),
            slides,
            words
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
        '<!-- text: orphan -->\n'
    ])
        assert.equal(indexPresentation(text, 0), null, text);
});

test('a line that reads as a marker, misspelled, closing or with words after it, refuses the file as MarkdownPoint refuses it', () => {
    // Each line MarkdownPoint reads as a malformed marker, and the comments it keeps as words.
    for (const line of [
        '<!-- /slide -->',
        '<!--/slide: x -->',
        '<!-- slide: a<b -->',
        '<!-- slide: a>b -->',
        '<!-- slide intro -->',
        '<!-- slide: x --> trailing words',
        '<!-- notes --> Say hi',
        '<!-- /notes -->',
        '  <!-- /text -->  ',
        // Only spaces and tabs stand inside a marker, as around it: other white space makes it a marker gone wrong.
        '<!--\u00a0slide: x -->',
        '<!-- slide:\u2028x -->',
        '<!-- notes\u3000-->'
    ])
        assert.equal(indexPresentation(`<!-- slide: first -->\n<!-- text: body -->\nWords.\n${line}\nMore.\n`, 0), null, line);
    for (const line of ['<!-- Notes: ask Anna -->', '<!-- slide : x -->', '<!-- text: ask Anna now -->']) {
        const text = `<!-- slide: first -->\n<!-- text: body -->\nWords.\n${line}\nMore.\n`;
        const document = indexPresentation(text, 0);
        assert.ok(document, line);
        assert.deepEqual(
            document.slides[0]!.blocks.map(block => text.slice(block.contentFrom, block.to)),
            [`Words.\n${line}\nMore.\n`]
        );
    }
});

test('a comment that starts like a marker is a note when its first --> ends a later line before the next <!--, as MarkdownPoint reads it', () => {
    for (const note of ['<!-- notes\nAsk Anna.\n-->', '<!-- slide draft\nA second take. -->', '<!-- notes\r\nAsk Anna.\r\n-->\r']) {
        const text = `<!-- slide: first -->\n<!-- text: body -->\nWords.\n${note}\nMore.\n`;
        const document = indexPresentation(text, 0);
        assert.ok(document, note);
        assert.deepEqual(
            document.slides[0]!.blocks.map(block => text.slice(block.contentFrom, block.to)),
            [`Words.\n${note}\nMore.\n`]
        );
    }
    // A marker that lost its `-->` meets the next marker, another comment or an arrow in its words first.
    for (const forgotten of ['<!-- notes\nSay hi.', '<!-- notes\nSay hi.\n<!-- remember the demo -->', '<!-- notes\nRevenue --> profit.'])
        assert.equal(
            indexPresentation(`<!-- slide: first -->\n<!-- text: body -->\nWords.\n${forgotten}\n<!-- slide: second -->\n`, 0),
            null,
            forgotten
        );
    assert.equal(indexPresentation('<!-- slide: first -->\n<!-- text: body -->\nWords.\n<!-- notes\nSay hi.\n', 0), null);
});

test("a control's default words under a slide stay that slide's words, which MarkdownPoint keeps and warns about", () => {
    const text =
        '<!-- slide: first -->\n<!-- text: body -->\nWords.\n\n<!-- control: caption -->\nUnbound words.\n<!-- slide: second -->\n';
    const document = indexPresentation(text, 0)!;
    assert.deepEqual(
        document.slides.map(slide => slide.id),
        ['first', 'second']
    );
    assert.deepEqual(
        document.slides[0]!.blocks.map(block => [block.kind, block.id, text.slice(block.contentFrom, block.to)]),
        [
            ['text', 'body', 'Words.\n\n'],
            ['control', 'caption', 'Unbound words.\n']
        ]
    );
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

test('a fence closes on a run of its own character with spaces or tabs after it, as MarkdownPoint reads it', () => {
    for (const prefix of ['', 'Before.\n']) {
        const first = `<!-- slide: first -->\n<!-- text: body -->\n${prefix}\`\`\`md\n<!-- slide: literal -->\n`;
        const rest = '<!-- slide: second -->\n<!-- text: body -->\n```md\n<!-- text: literal -->\n```\n<!-- slide: third -->\n';
        // A run of the other character after the closing run leaves the block open, its markers code, to the next closer.
        assert.deepEqual(
            indexPresentation(first + '```~\n' + rest, 0)!.slides.map(slide => slide.id),
            ['first', 'third']
        );
        assert.deepEqual(
            indexPresentation(first + '```\t\n<!-- slide: second -->\n', 0)!.slides.map(slide => slide.id),
            ['first', 'second']
        );
        assert.deepEqual(
            indexPresentation(first + '```\t\n', 0)!.slides.map(slide => slide.id),
            ['first']
        );
        assert.equal(indexPresentation(first + '```~\n', 0), null);
    }
});

test('a fence ends a link definition, so one inside what would be its title opens a code block', () => {
    const source =
        '<!-- slide: first -->\n<!-- text: body -->\n[ref]: /help "A title\n~~~md\n<!-- slide: literal -->\nend"\n<!-- slide: second -->\n';
    assert.equal(indexPresentation(source, 0), null);
    assert.deepEqual(
        indexPresentation(source.replace('end"\n', 'end"\n~~~\n'), 0)!.slides.map(slide => slide.id),
        ['first', 'second']
    );
});

test('a bare carriage return ends a line within code as a line feed does', () => {
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
    assert.equal(slideAtPosition({ slides: [], compositions: [], sections: [], laterMarkers: [] }, 0), null);
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

test("a control is named by its id, in its marker and after an instance's dot, and other words are a comment", () => {
    const notes = '<!-- text: ask Anna -->\nRemember.\n\n';
    const control = 'Default words.\n<!-- control: Headline text -->\n\n';
    const markdown =
        '<!-- slide: actual -->\n<!-- text: badge.headline -->\nInstance words.\n\n<!-- text: badge.step-1-id-k3j9x2 -->\nMore.\n\n<!-- notes -->\n' +
        notes +
        '<!-- composition: shared -->\n<!-- control: headline -->\n' +
        control +
        '<!-- control: label-id-b7d9e1 -->\nWords.\n';
    const document = indexPresentation(markdown, 0)!;
    const slide = document.slides[0]!;
    assert.deepEqual(
        slide.blocks.map(block => [block.kind, block.id]),
        [
            ['text', 'badge.headline'],
            ['text', 'badge.step-1-id-k3j9x2'],
            ['notes', null]
        ]
    );
    assert.equal(markdown.slice(slide.blocks[2]!.contentFrom, slide.blocks[2]!.to), notes, 'words that name no instance stay notes');
    const blocks = document.compositions[0]!.blocks;
    assert.deepEqual(
        blocks.map(block => [block.kind, block.id]),
        [
            ['control', 'headline'],
            ['control', 'label-id-b7d9e1']
        ]
    );
    assert.equal(markdown.slice(blocks[0]!.contentFrom, blocks[0]!.to), control, "a comment of several words is the block's own words");
    // A control's marker, or an instance's text marker, whose word is no id refuses the file, as MarkdownPoint reports it.
    for (const line of [
        '<!-- control: Headline -->',
        '<!-- text: badge.Headline -->',
        '<!-- text: badge.a.b -->',
        '<!-- control: a --> b -->'
    ])
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

test('lines that would be markers in code blocks read in time in line with their number', () => {
    const MARKER = '<!-- slide: x -->\n';
    const deck = (words: string) => `<!-- slide: first -->\n<!-- notes -->\n${words}`;
    // Core's reader holds each shape of nesting to linear time; these are the plugin's own reading of it, a line at a time.
    const shapes: Record<string, (count: number) => string> = {
        'in a fence': count => `\`\`\`\n${MARKER.repeat(count)}\`\`\`\n`,
        "in a list item's fence": count => `- \`\`\`\n${`  ${MARKER}`.repeat(count)}  \`\`\`\n`
    };
    assert.deepEqual(
        indexPresentation(deck(shapes['in a fence']!(2)), 0)?.slides.map(slide => slide.id),
        ['first']
    );
    for (const [where, words] of Object.entries(shapes))
        assertLinear(
            `marker lines ${where}`,
            count => deck(words(count)),
            source => indexPresentation(source, 0),
            2_000
        );
}, 30_000);

test('a long line shaped as a marker reads in time in line with its length, in code or out of it', () => {
    const deck = (words: string) => `<!-- slide: first -->\n<!-- notes -->\n${words}`;
    const line = (count: number) => `<!-- slide:${' '.repeat(count)}x\n`;
    const shapes: Record<string, (count: number) => string> = {
        'in a fence that took in a marker': count => `\`\`\`\n<!-- slide: x -->\n${line(count)}\`\`\`\n`,
        'outside code': line
    };
    for (const [where, words] of Object.entries(shapes))
        assertLinear(
            `a marker-shaped line ${where}`,
            count => deck(words(count)),
            source => indexPresentation(source, 0),
            500
        );
}, 30_000);

test("in a newer minor's file a later minor's block ends the words and the heading before it, and stands in its page or section", () => {
    const front = (version: string) => `---\nmarkdownpoint: ${version}\nid: 0f8c4d0e-6a1b-4c2d-9e3f-5a6b7c8d9e0f\n---\n\n`;
    const body =
        '<!-- section: intro -->\n# Intro\n\n<!-- aside: s -->\nShiny [words]{color=accent}.\n\n' +
        '<!-- slide: a -->\n<!-- glow -->\nFirst.\n\n<!-- text: title -->\nHello.\n\n<!-- sticker: t -->\nTilted words.\n\n' +
        '<!-- notes -->\nSay hi.\n\n  <!-- glow-twice -->\t\nAfter notes.\n\n' +
        '<!-- slide: b -->\n<!-- text: title -->\nB.\n\n<!-- tail -->';
    const read = (version: string) => {
        const markdown = front(version) + body;
        const document = indexPresentation(markdown, front(version).length)!;
        const words = (from: number, to: number) => markdown.slice(from, to);
        return {
            blocks: document.slides.map(slide => slide.blocks.map(block => words(block.contentFrom, block.to))),
            heading: words(document.sections[0]!.markerTo, document.sections[0]!.headingTo),
            section: words(document.sections[0]!.from, document.sections[0]!.to),
            slides: document.slides.map(slide => words(slide.from, slide.to)),
            length: markdown.length,
            last: document.slides[1]!.to
        };
    };
    for (const version of ['"1.1"', "'1.1'", String.raw`"1.\x31"`, '"1.1" # a newer app']) {
        const later = read(version);
        assert.deepEqual(later.blocks, [['Hello.\n\n', 'Say hi.\n\n'], ['B.\n\n']], version);
        assert.equal(later.heading, '# Intro\n\n', version);
        // The section and the pages hold their blocks, so a move or a deletion takes them along
        assert.equal(later.section, '<!-- section: intro -->\n# Intro\n\n<!-- aside: s -->\nShiny [words]{color=accent}.\n\n', version);
        assert.ok(later.slides[0]!.includes('After notes.') && later.slides[1]!.endsWith('<!-- tail -->'), version);
        assert.equal(later.last, later.length, 'a marker that ends the file needs no line break');
    }
    // In this minor's file, or one that states no version, the same lines are notes in the words
    for (const version of ['"1.0"', '1.1']) {
        const notes = read(version);
        assert.deepEqual(
            notes.blocks[0],
            ['Hello.\n\n<!-- sticker: t -->\nTilted words.\n\n', 'Say hi.\n\n  <!-- glow-twice -->\t\nAfter notes.\n\n'],
            version
        );
        assert.equal(notes.heading, notes.section.slice('<!-- section: intro -->\n'.length), version);
    }
});

test("in a newer minor's file a paragraph id, an escaped note, a comment of words and code stay in the words", () => {
    const front = '---\nmarkdownpoint: "1.1"\nid: 0f8c4d0e-6a1b-4c2d-9e3f-5a6b7c8d9e0f\n---\n\n';
    const words =
        'One.\n<!-- id: p-one -->\n<!--\\ sticker: t -->\n<!-- Sticker -->\n<!-- sticker: two words -->\n```\n<!-- sticker: t -->\n```\nEnd.\n';
    const markdown = `${front}<!-- slide: a -->\n<!-- text: title -->\n${words}`;
    const block = indexPresentation(markdown, front.length)!.slides[0]!.blocks[0]!;
    assert.equal(markdown.slice(block.contentFrom, block.to), words);
    // A later minor's block whose code never closes takes in the pages after it, which refuses the file
    const swallowing = `${front}<!-- slide: a -->\n<!-- sticker: t -->\n\`\`\`\n<!-- slide: b -->\n`;
    assert.equal(indexPresentation(swallowing, front.length), null);
});

test("a long comment line shaped as a later minor's marker reads in time in line with its length", () => {
    const front = '---\nmarkdownpoint: "1.1"\nid: 0f8c4d0e-6a1b-4c2d-9e3f-5a6b7c8d9e0f\n---\n\n';
    assertLinear(
        "a later minor's padded marker",
        spaces => `${front}<!-- slide: a -->\n<!-- text: title -->\n<!-- sticker${' '.repeat(spaces)}x -->\n`,
        markdown => indexPresentation(markdown, front.length),
        16_000
    );
});

test('a marker in words of code blocks, lists, quotes and HTML is one exactly where MarkdownPoint reads one', () => {
    // A slide's marker comes with a notes marker as indented, so the words after them stand in a block wherever they read
    // as markers.
    const marked = (indent: string) => `${indent}<!-- slide: x -->\n${indent}<!-- notes -->`;
    const ALPHABET = [
        '```',
        '~~~',
        '````',
        '```js',
        '  ```',
        '    ```',
        '- a',
        '  - b',
        '1. c',
        '- ```',
        '2. ```',
        '   ```',
        '-',
        '',
        'text',
        marked(''),
        marked('  '),
        marked('    '),
        '> q',
        '> ```',
        '> - ```',
        marked('>     '),
        '<div>',
        '</div>',
        '<!-- c -->',
        '<!--',
        '-->',
        '<!-- notes',
        '<!-- slide x',
        'a --> b',
        'x -->',
        '<pre>',
        '</pre>',
        '# h',
        '| a |',
        '|---|',
        '[x]: /u',
        '"t"',
        '<!-- aside -->',
        '  <!-- aside: x -->',
        '<!--\taside:\tcard.title\t-->',
        // Not marker-shaped: anything after the colon but ids, or white space other than spaces and tabs
        '<!-- aside: fix- -->',
        '<!--\u00a0aside -->'
    ];
    const id = '0c3b6a2e-1d4f-4a5b-9c6d-7e8f9a0b1c2d';
    const bytes = (text: string) => new TextEncoder().encode(text);
    let seed = 11;
    const random = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x80000000;
    let opened = 0;
    let refused = 0;
    // In a newer minor's file, the aside is a later minor's marker, which opens a block of its own and reads its code afresh
    for (const version of ['1.0', '1.1'])
        for (let round = 0; round < 600; round++) {
            const front = `---\nmarkdownpoint: "${version}"\nid: ${id}\n---\n\n`;
            const words = Array.from(
                { length: 1 + Math.floor(random() * 8) },
                () => ALPHABET[Math.floor(random() * ALPHABET.length)]!
            ).join('\n');
            for (const markdown of [
                `${front}<!-- slide: one -->\n<!-- notes -->\n${words}\n\n<!-- slide: two -->\n`,
                `${front}<!-- slide: one -->\n<!-- notes -->\n${words}\n`
            ]) {
                const index = indexPresentation(markdown, front.length);
                // The companion lists the slides the plugin finds, so the app opens the pair exactly when it finds the same.
                const ids = index?.slides.map(slide => slide.id) ?? ['one', 'two'];
                const json = JSON.stringify({
                    markdownpoint: version,
                    type: 'presentation',
                    id,
                    theme: 'basic',
                    slides: Object.fromEntries(ids.map(slide => [slide, { layout: 'title' }]))
                });
                const reading = readPresentationPair(
                    'Talk',
                    { name: 'presentation.mdpoint', bytes: bytes(json) },
                    { name: 'slides.md', bytes: bytes(markdown) }
                );
                const case_ = `${version} ${JSON.stringify(words)}`;
                if (index === null) {
                    refused++;
                    assert.equal(reading.opens, false, case_);
                } else {
                    opened++;
                    assert.ok(reading.opens, `${case_}: ${reading.opens ? '' : reading.problem.code}`);
                    assert.deepEqual(
                        reading.presentation.slides.map(slide => slide.id),
                        ids,
                        case_
                    );
                }
            }
        }
    assert.ok(opened > 200 && refused > 200, `${opened} opened, ${refused} refused`);
});
