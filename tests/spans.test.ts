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
import { test, vi } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { indexPresentation } from '../src/format/document.ts';
import { fieldSpans } from '../src/format/spans.ts';
import { presentationSpan } from '../src/format/link-tokens.ts';
import { SpanIndex, spanDecorations, hideRenderedSpans, pressLinkWords } from '../src/editor/span-marks.ts';
import { outlineSections, outlineSlides } from '../src/outline/model.ts';
import { readsAsPresentation } from '../src/presentation/reader.ts';
import { TFile, TFolder } from './support/obsidian.ts';
import type { Vault } from 'obsidian';

const word = '[**Mark**]{}[***do***]{}[*wn*]{}';

/** Each span as its source and the words an author reads. */
function read(source: string): [string, string][] {
    return fieldSpans(source).map(span => [source.slice(span.from, span.to), source.slice(span.wordsFrom, span.wordsTo)]);
}

test('spans read as the MarkdownPoint app reads them: a group, a color, a weight or both, each key once', () => {
    assert.deepEqual(presentationSpan('[ab]{} c'), { length: 6, content: 'ab' });
    for (const span of [
        '[ab]{font-weight=600}',
        '[ab]{font-weight="900"}',
        '[ab]{color=muted font-weight=300}',
        '[ab]{font-weight=700 color="#2F7D4F"}',
        '[ab]{color=#fff}'
    ])
        assert.deepEqual(presentationSpan(span), { length: span.length, content: 'ab' }, span);
    for (const literal of [
        '[]{}',
        '[ab]{font-weight=450}',
        '[ab]{font-weight=600.0}',
        '[ab]{color=accent color=muted}',
        '[ab]{font-weight=600 font-weight=700}',
        '[ab]{color=accent-}',
        '[ab]{color=#ffff0}',
        '[ab]{size=2}',
        '[ab] {}'
    ])
        assert.equal(presentationSpan(literal), null, literal);
});

test("a span's words drop the delimiters that enclose all of them, and keep any other run in view", () => {
    assert.deepEqual(read(word), [
        ['[**Mark**]{}', 'Mark'],
        ['[***do***]{}', 'do'],
        ['[*wn*]{}', 'wn']
    ]);
    assert.deepEqual(read('A [==hi==]{}[~~gh~~]{}[**==x==**]{} b'), [
        ['[==hi==]{}', 'hi'],
        ['[~~gh~~]{}', 'gh'],
        ['[**==x==**]{}', 'x']
    ]);
    assert.deepEqual(read('[*a* b*]{}[**a*b**]{}[***do***]{}'), [
        ['[*a* b*]{}', '*a* b*'],
        ['[**a*b**]{}', 'a*b'],
        ['[***do***]{}', 'do']
    ]);
    assert.deepEqual(read('[**a** b]{}[** c**]{}[a]{}'), [
        ['[**a** b]{}', '**a** b'],
        ['[** c**]{}', '** c**'],
        ['[a]{}', 'a']
    ]);
    assert.deepEqual(read('[**ink**]{color=accent} and [*a* b]{font-weight=600} [x]{color="#2F7D4F" font-weight=700}'), [
        ['[**ink**]{color=accent}', 'ink'],
        ['[*a* b]{font-weight=600}', '*a* b'],
        ['[x]{color="#2F7D4F" font-weight=700}', 'x']
    ]);
});

test('spans stand outside code, HTML and destinations, and inside links and other spans', () => {
    assert.deepEqual(read('[[*a*]{}b](slide:one) and [[*c*]{}d]{color=accent}'), [
        ['[[*a*]{}b](slide:one)', '[*a*]{}b'],
        ['[*a*]{}', 'a'],
        ['[[*c*]{}d]{color=accent}', '[*c*]{}d'],
        ['[*c*]{}', 'c']
    ]);
    for (const literal of [
        '`[a]{}`',
        '```\n[a]{}\n```\n',
        '    [a]{}\n',
        '<div>\n[a]{}\n</div>\n',
        '[go](x[a]{})',
        '\\[a]{}',
        '`[a]{color=accent}`',
        '[go](x[a]{font-weight=600})',
        '\\[a]{color=accent}',
        '[a]{size=2}',
        '[]{}',
        '- [a]{}\n\n  ```\n  b\n  ```\n',
        '[ref]: https://example.com/[slug]{}\n'
    ])
        assert.deepEqual(read(literal), [], literal);
    assert.deepEqual(read('[*x*]{}y [ref]\n\n[ref]: https://example.com/[slug]{}\n'), [['[*x*]{}', 'x']]);
    assert.deepEqual(read('# [*a*]{}b\n\n- [*c*]{}d\n- e\n\n| [*f*]{}g |\n| --- |\n'), [
        ['[*a*]{}', 'a'],
        ['[*c*]{}', 'c'],
        ['[*f*]{}', 'f']
    ]);
});

test("a link in a span's words reads as one, with its destination, as no other link or image does", () => {
    const linked = (source: string) =>
        fieldSpans(source).map(span => [source.slice(span.from, span.to), source.slice(span.wordsFrom, span.wordsTo), span.href ?? null]);
    assert.deepEqual(linked('Read the [[launch notes](https://example.com)]{color=accent} first.'), [
        ['[[launch notes](https://example.com)]{color=accent}', '[launch notes](https://example.com)', null],
        ['[launch notes](https://example.com)', 'launch notes', 'https://example.com']
    ]);
    assert.deepEqual(linked('[**see [the [plan]](<https://x.com/a b> "Title") now**]{font-weight=600}'), [
        [
            '[**see [the [plan]](<https://x.com/a b> "Title") now**]{font-weight=600}',
            'see [the [plan]](<https://x.com/a b> "Title") now',
            null
        ],
        ['[the [plan]](<https://x.com/a b> "Title")', 'the [plan]', 'https://x.com/a b']
    ]);
    assert.deepEqual(linked('[x [[y](slide:two)]{} z]{color=accent}'), [
        ['[x [[y](slide:two)]{} z]{color=accent}', 'x [[y](slide:two)]{} z', null],
        ['[[y](slide:two)]{}', '[y](slide:two)', null],
        ['[y](slide:two)', 'y', 'slide:two']
    ]);
    // A `!` a backslash escapes stays a character, and the link after it a link.
    assert.deepEqual(linked('[Wow\\![the plan](https://example.com)]{color=accent}')[1], [
        '[the plan](https://example.com)',
        'the plan',
        'https://example.com'
    ]);
    assert.deepEqual(linked('[[q](https://example.com/?a=1&amp;b=2)]{}')[1], [
        '[q](https://example.com/?a=1&amp;b=2)',
        'q',
        'https://example.com/?a=1&b=2'
    ]);
    // A destination's numbers are read CommonMark's way, as MarkdownPoint reads them.
    assert.equal(linked('[[q](x&#128;y)]{}')[1]![2], 'x\u0080y');
    assert.equal(linked('[[q](x&#00000065;y)]{}')[1]![2], 'x&#00000065;y');
    // A link without words, or with a destination past its line, keeps its source: Live Preview can't hide it.
    for (const source of [
        '[a ![i](p.png) b]{color=accent}',
        '[a \\\\![i](p.png) b]{color=accent}',
        '[`[x](u)`]{color=accent}',
        '[[a](b c)]{color=accent}',
        '[go](https://example.com) and [e]{}',
        'See [the [](https://example.com) plan]{} now',
        'See [the [plan](https://example.com\n"Title") now]{} and [[it](\nhttps://example.com)]{}'
    ])
        assert.deepEqual(
            linked(source).filter(([, , href]) => href !== null),
            [],
            source
        );
});

const deck =
    '<!-- slide: first -->\n<!-- text: title -->\n# ' +
    word +
    '\n\n<!-- text: body -->\nA [*x*]{}y [here]{color=accent}.\n\n<!-- notes -->\nSay [**it**]{}s [now]{font-weight=600}.\n\n' +
    '<!-- section: part -->\n# [*Pa*]{}rt\n\n<!-- composition: card -->\n<!-- control: label -->\n[*No*]{}rth\n';

test("the index finds a presentation's spans in text, notes, controls and section headings", () => {
    const document = indexPresentation(deck, 0)!;
    const state = EditorState.create({ doc: deck });
    const index = new SpanIndex();
    const spans = index.read(state, document);
    assert.deepEqual(
        spans.map(span => deck.slice(span.wordsFrom, span.wordsTo)),
        ['Mark', 'do', 'wn', 'x', 'here', 'it', 'now', 'Pa', 'No']
    );
    assert.deepEqual(index.read(state, document), spans);
    const linked = deck.replace('[here]{color=accent}', '[see [here](https://example.com)]{color=accent}');
    const link = new SpanIndex()
        .read(EditorState.create({ doc: linked }), indexPresentation(linked, 0)!)
        .find(span => span.href !== undefined);
    assert.deepEqual(link && [linked.slice(link.wordsFrom, link.wordsTo), link.href], ['here', 'https://example.com']);
    // A code span's backticks in a span's words stand where the presentation has them.
    const coded = deck.replace('[here]{color=accent}', '[`he`re]{color=accent}');
    const code = coded.indexOf('`he`');
    const runs = new SpanIndex().read(EditorState.create({ doc: coded }), indexPresentation(coded, 0)!).flatMap(span => span.code ?? []);
    assert.deepEqual(runs, [
        { from: code, to: code + 1 },
        { from: code + 3, to: code + 4 }
    ]);
});

function ranges(set: DecorationSet, doc: string): string[] {
    const found: string[] = [];
    for (const cursor = set.iter(); cursor.value; cursor.next()) found.push(doc.slice(cursor.from, cursor.to));
    return found;
}

test("Live Preview hides a word's group marks until a selection touches any group of that word", () => {
    const doc = `${word} and [*x*]{}y`;
    const groups = fieldSpans(doc);
    const away = spanDecorations(EditorState.create({ doc, selection: { anchor: doc.indexOf(' and') + 2 } }), groups);
    assert.deepEqual(ranges(away.hidden, doc), ['[**', '**]{}', '[***', '***]{}', '[*', '*]{}', '[*', '*]{}']);
    assert.deepEqual(ranges(away.words, doc), ['Mark', 'do', 'wn', 'x']);
    for (const anchor of [0, doc.indexOf('do'), word.length]) {
        const near = spanDecorations(EditorState.create({ doc, selection: { anchor } }), groups);
        assert.deepEqual(ranges(near.hidden, doc), ['[*', '*]{}'], String(anchor));
        assert.deepEqual(ranges(near.words, doc), ['x']);
    }
    const both = spanDecorations(
        EditorState.create({
            doc,
            selection: EditorSelection.create([EditorSelection.cursor(2), EditorSelection.cursor(doc.length - 2)]),
            extensions: EditorState.allowMultipleSelections.of(true)
        }),
        groups
    );
    assert.deepEqual(ranges(both.hidden, doc), []);
});

test("Live Preview hides a color or weight span's marks as a group's, until a selection touches that word", () => {
    const doc = 'A [**ink**]{color=accent} and [bold]{font-weight=600}[*er*]{} b';
    const spans = fieldSpans(doc);
    const away = spanDecorations(EditorState.create({ doc, selection: { anchor: 0 } }), spans);
    assert.deepEqual(ranges(away.hidden, doc), ['[**', '**]{color=accent}', '[', ']{font-weight=600}', '[*', '*]{}']);
    assert.deepEqual(ranges(away.words, doc), ['ink', 'bold', 'er']);
    const near = spanDecorations(EditorState.create({ doc, selection: { anchor: doc.indexOf('}') } }), spans);
    assert.deepEqual(ranges(near.hidden, doc), ['[', ']{font-weight=600}', '[*', '*]{}']);
    // The weight span and the group after it make one word, so the caret on either shows both.
    const word = spanDecorations(EditorState.create({ doc, selection: { anchor: doc.indexOf('er*') } }), spans);
    assert.deepEqual(ranges(word.hidden, doc), ['[**', '**]{color=accent}']);
});

test("Live Preview hides a link's marks in a span's words with the span's, and only the link's words read as a link", () => {
    const doc = 'See [the [whole plan](https://example.com/plan) in one page]{font-weight=600} today.';
    const spans = fieldSpans(doc);
    const away = spanDecorations(EditorState.create({ doc, selection: { anchor: 0 } }), spans);
    assert.deepEqual(ranges(away.hidden, doc), ['[', '[', '](https://example.com/plan)', ']{font-weight=600}']);
    const classes: [string, string][] = [];
    for (const cursor = away.words.iter(); cursor.value; cursor.next())
        classes.push([doc.slice(cursor.from, cursor.to), String((cursor.value.spec as { class?: string }).class)]);
    assert.deepEqual(classes, [
        ['the [whole plan](https://example.com/plan) in one page', 'markdownpoint-span markdownpoint-span-linked'],
        ['whole plan', 'markdownpoint-span-link']
    ]);
    // The caret on the link's words shows the whole span's source, as on any other word of it.
    const near = spanDecorations(EditorState.create({ doc, selection: { anchor: doc.indexOf('plan]') } }), spans);
    assert.deepEqual(ranges(near.hidden, doc), []);
    assert.deepEqual(ranges(near.words, doc), []);
    // A link without words has none to mark.
    const empty = 'See [the [](https://example.com) plan]{} now';
    assert.deepEqual(
        ranges(spanDecorations(EditorState.create({ doc: empty, selection: { anchor: 0 } }), fieldSpans(empty)).words, empty),
        ['the [](https://example.com) plan']
    );
});

test("Live Preview hides the backticks of code in a span's words, which Obsidian keeps in view inside brackets, and only there", () => {
    // Code outside a span, code in a group, a longer run, code in a color span and in a group inside it, and a backtick
    // no run closes.
    const doc = 'Code [table]{color=accent}, and ` a\\ `[`\\|b`]{} out ``a`b`` [x``c`d``]{} [` x\\ `[`\\|`]{}]{color=accent} [a`b]{}';
    const spans = fieldSpans(doc);
    const away = spanDecorations(EditorState.create({ doc, selection: { anchor: 0 } }), spans);
    // Each run once, with the innermost span that holds it; the padding stays, as Obsidian keeps it outside brackets.
    assert.deepEqual(ranges(away.hidden, doc), [
        ...['[', ']{color=accent}'],
        ...['[', '`', '`', ']{}'],
        ...['[', '``', '``', ']{}'],
        ...['[', '`', '`', '[', '`', '`', ']{}', ']{color=accent}'],
        ...['[', ']{}']
    ]);
    // The caret on the word shows its backticks with the rest of its source.
    const near = spanDecorations(EditorState.create({ doc, selection: { anchor: doc.indexOf('b`]') } }), spans);
    assert.deepEqual(ranges(near.hidden, doc).slice(0, 4), ['[', ']{color=accent}', '[', '``']);
    assert.equal(ranges(near.hidden, doc).length, 16);
});

/** The words Live Preview marks in `doc` with the caret at its start, and each mark's classes. */
function wordClasses(doc: string): [string, string][] {
    const found: [string, string][] = [];
    const { words } = spanDecorations(EditorState.create({ doc, selection: { anchor: 0 } }), fieldSpans(doc));
    for (const cursor = words.iter(); cursor.value; cursor.next())
        found.push([doc.slice(cursor.from, cursor.to), String((cursor.value.spec as { class?: string }).class)]);
    return found;
}

test("Live Preview reads a link whose words hold a span as a link, which Obsidian reads only up to the span's `]`", () => {
    const grouped = 'A [[*a*]{}b](slide:one) c';
    assert.deepEqual(
        ranges(spanDecorations(EditorState.create({ doc: grouped, selection: { anchor: 0 } }), fieldSpans(grouped)).hidden, grouped),
        [...['[', '[*', '*]{}', '](slide:one)']]
    );
    assert.deepEqual(
        wordClasses(grouped).filter(([, classes]) => classes.startsWith('markdownpoint')),
        [
            ['[*a*]{}b', 'markdownpoint-span-link'],
            ['a', 'markdownpoint-span']
        ]
    );
    // Code cut into a group in a link, as MarkdownPoint writes a pipe after an odd run of backslashes in a table cell.
    const coded = 'see [` x\\ `[`\\|`]{}](https://example.com) now';
    assert.deepEqual(
        ranges(spanDecorations(EditorState.create({ doc: coded, selection: { anchor: 0 } }), fieldSpans(coded)).hidden, coded),
        [...['[', '`', '`', '[', '`', '`', ']{}', '](https://example.com)']]
    );
    assert.deepEqual(
        fieldSpans(coded).map(span => span.href ?? null),
        ['https://example.com', null]
    );
});

test('Live Preview draws the styles and code a span inside another span or a link hides, which Obsidian reads nowhere there', () => {
    const drawn = (doc: string) => wordClasses(doc).filter(([, classes]) => classes.startsWith('cm-'));
    // A group in a link, as MarkdownPoint writes a style change inside a link's word.
    assert.deepEqual(drawn('A [[*a*]{}b](slide:one) c'), [['a', 'cm-em']]);
    // A span in a span, each style its delimiters draw, outermost first.
    assert.deepEqual(drawn('A [[*c*]{}d]{color=accent}'), [['c', 'cm-em']]);
    assert.deepEqual(drawn('A [x[**b**]{}[==h==]{}[~~s~~]{}[***bi***]{}[**==bh==**]{}]{color=accent}'), [
        ['b', 'cm-strong'],
        ['h', 'cm-highlight'],
        ['s', 'cm-strikethrough'],
        ['bi', 'cm-em cm-strong'],
        ['bh', 'cm-strong cm-highlight']
    ]);
    // The code of a group in a link or in a color span; the link's and the span's own code is Obsidian's.
    assert.deepEqual(drawn('see [` x\\ `[`\\|`]{}](https://example.com) now'), [['\\|', 'cm-inline-code']]);
    assert.deepEqual(drawn('A [` x\\ `[`` \\|` ``]{}]{color=accent}'), [[' \\|` ', 'cm-inline-code']]);
    // Obsidian draws a span's own styles and code outside other brackets, and the source shows them with the caret in it.
    assert.deepEqual(drawn('A [**Mark**]{}[***do***]{}[*wn*]{} [`a\\|b`]{} [**ink**]{color=accent}'), []);
    const near = '[[*c*]{}d]{color=accent}';
    assert.deepEqual(spanDecorations(EditorState.create({ doc: near, selection: { anchor: 3 } }), fieldSpans(near)).words.size, 0);
});

test("a press on a link's words in Live Preview keeps the caret off them, so the click opens the link", () => {
    // Obsidian's Element test, `instanceOf`, stands in for the DOM these tests run without.
    class Element {}
    const press = (classes: readonly string[], keys: { shiftKey?: boolean; altKey?: boolean; button?: number } = {}) => {
        const target = {
            instanceOf: (type: unknown) => type === Element,
            closest: (selectors: string) => (selectors.split(', ').some(selector => classes.includes(selector.slice(1))) ? target : null)
        };
        let prevented = false;
        const event = { button: 0, altKey: false, shiftKey: false, ...keys, targetNode: target, preventDefault: () => (prevented = true) };
        vi.stubGlobal('Element', Element);
        try {
            return [pressLinkWords(event as unknown as MouseEvent), prevented];
        } finally {
            vi.unstubAllGlobals();
        }
    };
    assert.deepEqual(press(['markdownpoint-span-link']), [true, true]);
    // A span's other words, and a press that selects, take the caret as Obsidian places it.
    assert.deepEqual(press(['markdownpoint-span', 'markdownpoint-span-linked']), [false, false]);
    assert.deepEqual(press(['markdownpoint-span-link'], { shiftKey: true }), [false, false]);
    assert.deepEqual(press(['markdownpoint-span-link'], { button: 2 }), [false, false]);
});

interface FakeNode {
    nodeType: number;
    nodeName: string;
    childNodes: FakeNode[];
    data: string;
    deleteData(at: number, length: number): void;
}

function text(data: string): FakeNode {
    const node: FakeNode = {
        nodeType: 3,
        nodeName: '#text',
        childNodes: [],
        data,
        deleteData(at, length) {
            node.data = node.data.slice(0, at) + node.data.slice(at + length);
        }
    };
    return node;
}

function element(name: string, ...childNodes: FakeNode[]): FakeNode {
    return { nodeType: 1, nodeName: name, childNodes, data: '', deleteData: () => undefined };
}

const shown = (node: FakeNode): string => (node.nodeType === 3 ? node.data : node.childNodes.map(shown).join(''));

function hidden(source: string, root: FakeNode): string {
    hideRenderedSpans(root as unknown as HTMLElement, source);
    return shown(root);
}

test('reading view drops the group marks it renders as characters, only where they pair as the source does', () => {
    const heading = element(
        'H1',
        text('['),
        element('STRONG', text('Mark')),
        text(']{}['),
        element('EM', element('STRONG', text('do'))),
        text(']{}['),
        element('EM', text('wn')),
        text(']{} '),
        element('CODE', text('[a]{}'))
    );
    assert.equal(hidden(`# ${word} \`[a]{}\``, heading), 'Markdown [a]{}');
    // An escaped bracket renders as one, so the rendered pairs outnumber the source's groups.
    const escaped = element('P', text('['), element('EM', text('x')), text(']{} and [y]{}'));
    assert.equal(hidden('[*x*]{} and \\[y]{}', escaped), '[x]{} and [y]{}');
    const linked = element('P', element('A', text('['), element('EM', text('a')), text(']{}b')));
    assert.equal(hidden('[[*a*]{}b](slide:one)', linked), 'ab');
    // An escaped bracket inside a group renders as one too: the pair it makes holds other words than the group's.
    const inside = element('P', text('[a[b]{}'));
    assert.equal(hidden('[a\\[b]{}', inside), '[a[b]{}');
    const nested = element('P', text('[a[b]{}c]{}'));
    assert.equal(hidden('[a[b]{}c]{}', nested), 'abc');
    // With a definition, Obsidian links the group's words and renders the escaped brackets alone as a pair.
    const referenced = element('P', element('A', text('x')), text('{} and [x]{}'));
    assert.equal(hidden('[x]{} and \\[x]{}\n\n[x]: https://example.com\n', referenced), 'x{} and [x]{}');
    const listed = element('UL', element('LI', text('['), element('EM', text('a')), text(']{}b')), element('LI', text('c')));
    assert.equal(hidden('- [*a*]{}b\n- c\n', listed), 'abc');
    const entity = element('P', text('['), element('STRONG', text('A&B')), text(']{}'));
    assert.equal(hidden('[**A&amp;B**]{}', entity), 'A&B');
});

test('reading view drops the marks of color and weight spans as it does a group, and keeps other brackets', () => {
    const source = 'A [**ink**]{color=accent} and [bold]{font-weight=600}[*er*]{} [x]{color="#2F7D4F"} [y]{size=2}';
    const paragraph = element(
        'P',
        text('A ['),
        element('STRONG', text('ink')),
        text(']{color=accent} and [bold]{font-weight=600}['),
        element('EM', text('er')),
        text(']{} [x]{color="#2F7D4F"} [y]{size=2}')
    );
    assert.equal(hidden(source, paragraph), 'A ink and bolder x [y]{size=2}');
    const nested = element('P', text('[['), element('EM', text('c')), text(']{}d]{color=accent}'));
    assert.equal(hidden('[[*c*]{}d]{color=accent}', nested), 'cd');
    // Reading view renders a link in a span's words as a link: only the span's marks remain as characters.
    const linked = element('P', text('Read the ['), element('A', text('launch notes')), text(']{color=accent} first.'));
    assert.equal(hidden('Read the [[launch notes](https://example.com)]{color=accent} first.', linked), 'Read the launch notes first.');
});

test("reading view drops a table's span marks, and the backslash Obsidian keeps of each pipe's escape in a cell's code", () => {
    // Code whose pipe follows an odd run of backslashes, cut into groups as MarkdownPoint writes it, and rendered as
    // Obsidian 1.15 renders it: GFM reads `\|` in a cell as `|`, code included, and Obsidian keeps code's backslash.
    const source =
        [
            '| Case | Cell |',
            '| :--- | :--- |',
            '| one cut | ` \\ `[`\\|`]{} |',
            '| inside | ` a\\ `[`\\|b`]{} |',
            '| two cuts | ` \\ `[` \\|\\ `]{}`\\|` |',
            '| link | see [` x\\ `[`\\|`]{}](https://example.com) now |',
            '| color | [` x\\ `[`\\|`]{}]{color=accent} |',
            '| control | [plain]{color=accent} words |'
        ].join('\n') + '\n';
    const code = (data: string) => element('CODE', text(data));
    const row = (name: string, ...cell: FakeNode[]) => element('TR', element('TD', text(name)), element('TD', ...cell));
    const rows = [
        row('one cut', code('\\'), text('['), code('\\|'), text(']{}')),
        row('inside', code('a\\'), text('['), code('\\|b'), text(']{}')),
        row('two cuts', code('\\'), text('['), code('\\|\\'), text(']{}'), code('\\|')),
        row('link', text('see '), element('A', code('x\\'), text('['), code('\\|'), text(']{}')), text(' now')),
        row('color', text('['), code('x\\'), text('['), code('\\|'), text(']{}]{color=accent}')),
        row('control', text('[plain]{color=accent} words'))
    ];
    const head = element('THEAD', element('TR', element('TH', text('Case')), element('TH', text('Cell'))));
    hideRenderedSpans(element('DIV', element('TABLE', head, element('TBODY', ...rows))) as unknown as HTMLElement, source);
    assert.deepEqual(
        rows.map(each => shown(each.childNodes[1]!)),
        ['\\|', 'a\\|b', '\\|\\|', 'see x\\| now', 'x\\|', 'plain words']
    );
    // Outside a table, code keeps its backslash, as it reads.
    const paragraph = element('P', code('a\\'), text('['), code('\\|b'), text(']{}'));
    assert.equal(hidden('` a\\ `[`\\|b`]{}', paragraph), 'a\\\\|b');
});

test('outline titles read the words of groups and spans, not their marks', () => {
    const markdown =
        '<!-- slide: first -->\n<!-- text: title -->\n# ' +
        word +
        ' and [bold]{font-weight=600} [ink]{color=accent}\n\n<!-- section: part -->\n# [*Pa*]{}rt ==one==\n\n<!-- slide: second -->\n';
    const document = indexPresentation(markdown, 0)!;
    assert.equal(outlineSlides(markdown, document, 'Title', new Set())[0]!.title, 'Markdown and bold ink');
    assert.equal(outlineSections(markdown, document)[0]!.title, 'Part one');
    const referenced = '<!-- section: intro -->\n# [Introduction][intro] [*Pa*]{}rt\n\n[intro]: https://example.com\n\n<!-- slide: a -->\n';
    assert.equal(outlineSections(referenced, indexPresentation(referenced, 0)!)[0]!.title, 'Introduction Part');
});

test('a span inside another hides both, inner marks first where they stand', () => {
    const doc = 'A [*a*[b]{}c*]{} d';
    const decorations = spanDecorations(EditorState.create({ doc, selection: { anchor: doc.length } }), fieldSpans(doc));
    // The lexer pairs only `*a*`, so the outer group's last star is a character of its words.
    assert.deepEqual(ranges(decorations.hidden, doc), ['[', '[', ']{}', ']{}']);
    assert.deepEqual(ranges(decorations.words, doc), ['*a*[b]{}c*', 'b']);
    const colored = 'A [[*c*]{}d]{color=accent} e';
    const away = spanDecorations(EditorState.create({ doc: colored, selection: { anchor: colored.length } }), fieldSpans(colored));
    assert.deepEqual(ranges(away.hidden, colored), ['[', '[*', '*]{}', ']{color=accent}']);
    // The inner group's `c` is marked twice: as a span's words, and with the italic it draws inside another span.
    assert.deepEqual(ranges(away.words, colored), ['[*c*]{}d', 'c', 'c']);
    // The spans inside a span and those right after it make one word, so the caret on any of them shows all of them.
    const joined = 'A [[b]{font-weight=600}c]{color=accent}[d]{} e';
    const spans = fieldSpans(joined);
    for (const anchor of [joined.indexOf('b'), joined.indexOf('c]'), joined.indexOf('d]')])
        assert.deepEqual(
            ranges(spanDecorations(EditorState.create({ doc: joined, selection: { anchor } }), spans).hidden, joined),
            [],
            String(anchor)
        );
    assert.deepEqual(ranges(spanDecorations(EditorState.create({ doc: joined, selection: { anchor: 0 } }), spans).hidden, joined), [
        '[',
        '[',
        ']{font-weight=600}',
        ']{color=accent}',
        '[',
        ']{}'
    ]);
});

function vault(files: Record<string, string>, reads: string[] = [], at = 'Talk', ignoresCase = false): Vault {
    const folder = new TFolder(at);
    folder.children = Object.keys(files).map(name => new TFile(`${at}/${name}`, new Uint8Array(), 0));
    return {
        configDir: '.config',
        // A volume that ignores case finds the plugins folder in another case too, unless asked for that spelling alone.
        adapter: {
            exists: (path: string, sensitive = false) =>
                Promise.resolve(path === '.config/plugins' || (ignoresCase && !sensitive && path.toLowerCase() === '.config/plugins'))
        },
        getRoot: () => new TFolder(''),
        getFolderByPath: (path: string) => (path === at ? folder : null),
        cachedRead: (file: TFile) => {
            reads.push(file.name);
            return Promise.resolve(files[file.name]!);
        }
    } as unknown as Vault;
}

test("reading view drops group marks only in a presentation's slides.md, as the reader recognizes one", async () => {
    const id = '0c3b6a2e-1d4f-4a5b-9c6d-7e8f9a0b1c2d';
    const markdown = `---\nmarkdownpoint: "1.0"\nid: ${id}\n---\n\n<!-- slide: a -->\n<!-- text: title -->\n${word}\n`;
    const companion = (fields: Record<string, unknown>) =>
        JSON.stringify({ markdownpoint: '1.0', type: 'presentation', id, theme: 'basic', slides: {}, ...fields });
    const reads: string[] = [];
    const deck = vault({ 'slides.md': markdown, 'presentation.mdpoint': companion({}) }, reads);
    assert.deepEqual(await Promise.all([1, 2, 3].map(() => readsAsPresentation(deck, 'Talk/slides.md', markdown))), [true, true, true]);
    assert.equal(await readsAsPresentation(deck, 'Talk/slides.md', markdown), true);
    assert.deepEqual(reads, ['presentation.mdpoint']);
    const file = deck.getFolderByPath('Talk')!.children.find(file => file.name === 'presentation.mdpoint');
    assert.ok(file instanceof TFile);
    file.stat = { mtime: 1, size: 0 };
    assert.equal(await readsAsPresentation(deck, 'Talk/slides.md', markdown), true);
    assert.deepEqual(reads, ['presentation.mdpoint', 'presentation.mdpoint']);
    for (const [files, path] of [
        [{ 'slides.md': markdown, 'presentation.mdpoint': companion({}) }, 'Talk/notes.md'],
        [{ 'slides.md': markdown, 'presentation.mdpoint': companion({ id: '1c3b6a2e-1d4f-4a5b-9c6d-7e8f9a0b1c2d' }) }, 'Talk/slides.md'],
        [{ 'slides.md': markdown, 'presentation.mdpoint': companion({ markdownpoint: '2.0' }) }, 'Talk/slides.md'],
        [{ 'slides.md': markdown, 'presentation.mdpoint': companion({}), 'other.mdpoint': companion({}) }, 'Talk/slides.md'],
        [{ 'slides.md': markdown, 'presentation.mdpoint': '{' }, 'Talk/slides.md']
    ] as const)
        assert.equal(await readsAsPresentation(vault(files), path, markdown), false, JSON.stringify(Object.keys(files)) + path);
});

test('a saved version under Versions/ never reads as a presentation where the volume ignores case, from the first read on', async () => {
    const id = '0c3b6a2e-1d4f-4a5b-9c6d-7e8f9a0b1c2d';
    const markdown = `---\nmarkdownpoint: "1.0"\nid: ${id}\n---\n\n<!-- slide: a -->\n`;
    const files = {
        'slides.md': markdown,
        'presentation.mdpoint': JSON.stringify({ markdownpoint: '1.0', type: 'presentation', id, theme: 'basic', slides: {} })
    };
    const at = 'Talk/Versions/2026-10-30T16.20.05Z-k3pz';
    assert.equal(await readsAsPresentation(vault(files, [], at, true), `${at}/slides.md`, markdown), false);
    assert.equal(await readsAsPresentation(vault(files, [], at, false), `${at}/slides.md`, markdown), true);
});

test('a companion reads as MarkdownPoint reads it: past a byte order mark, and refused for a key written twice', async () => {
    const id = '0c3b6a2e-1d4f-4a5b-9c6d-7e8f9a0b1c2d';
    const markdown = `---\nmarkdownpoint: "1.0"\nid: ${id}\n---\n\n<!-- slide: a -->\n`;
    const fields = `"markdownpoint": "1.0", "type": "presentation", "theme": "basic", "slides": {}`;
    const opens = (companion: string) =>
        readsAsPresentation(vault({ 'slides.md': markdown, 'presentation.mdpoint': companion }), 'Talk/slides.md', markdown);
    assert.equal(await opens(`${String.fromCharCode(0xfeff)}{${fields}, "id": "${id}"}`), true);
    // The last of a key written twice would name this presentation, where MarkdownPoint refuses the file.
    assert.equal(await opens(`{${fields}, "id": "1c3b6a2e-1d4f-4a5b-9c6d-7e8f9a0b1c2d", "id": "${id}"}`), false);
});
