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
import { history, redo, undo } from '@codemirror/commands';
import { EditorSelection, EditorState } from '@codemirror/state';
import type { Transaction } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { indexPresentation } from '../src/format/document.ts';
import { keptParagraphIds, ParagraphIdIndex, paragraphIdDecorations } from '../src/editor/paragraph-ids.ts';

const deck =
    '<!-- slide: first -->\n<!-- text: title -->\n# Title <!-- id: t1x9a2 -->\n\n<!-- text: body -->\n' +
    'One line <!-- id: a7k2p9 -->\n\nTwo lines\nend here <!-- id: k3x9a2 -->\n\n- Item <!-- id: p7m2q1 -->\n  - Nested <!-- id: b8c4d0 -->\n\n' +
    'A note <!-- not an id -->\n\n<!-- notes -->\nSay it.\n';

/** The source each decoration covers. */
function covered(set: DecorationSet, doc: string): string[] {
    const found: string[] = [];
    for (const cursor = set.iter(); cursor.value; cursor.next()) found.push(doc.slice(cursor.from, cursor.to));
    return found;
}

test('Live Preview hides each paragraph id, the space before it included, until a selection touches its line', () => {
    const document = indexPresentation(deck, 0)!;
    const away = EditorState.create({ doc: deck, selection: { anchor: 0 } });
    const ids = new ParagraphIdIndex().read(away, document);
    assert.deepEqual(
        covered(paragraphIdDecorations(away, ids), deck),
        [' <!-- id: t1x9a2 -->', ' <!-- id: a7k2p9 -->', ' <!-- id: k3x9a2 -->', ' <!-- id: p7m2q1 -->', ' <!-- id: b8c4d0 -->'],
        "a heading's, a paragraph's last line's and each item's; an author's note stays"
    );
    const onLine = EditorState.create({ doc: deck, selection: { anchor: deck.indexOf('end here') } });
    assert.deepEqual(covered(paragraphIdDecorations(onLine, ids), deck).length, 4, 'the caret on a line shows its id');
    const across = EditorState.create({ doc: deck, selection: EditorSelection.single(deck.indexOf('One'), deck.indexOf('Item')) });
    assert.deepEqual(
        covered(paragraphIdDecorations(across, ids), deck),
        [' <!-- id: t1x9a2 -->', ' <!-- id: b8c4d0 -->'],
        'a selection shows the ids of every line it touches'
    );
});

test('an id written with any spaces or tabs around and inside its comment is hidden as one; a misspelled one or one alone on its line after a blank line is a note', () => {
    const loose = deckOf(
        'One<!-- id: a7k2p9 -->\n\nTwo\t<!--id:k3x9a2-->\t\n\nThree <!-- ID: p7m2q1 -->\n\nFour <!-- id: K3X9A2 -->\n\nFive\n\n<!-- id: b8c4d0 -->\n\nSix \\<!-- id: c5d6e7 -->\n\nSeven \\\\<!-- id: d6e7f8 -->'
    );
    const state = EditorState.create({ doc: loose, selection: { anchor: 0 } });
    assert.deepEqual(
        covered(paragraphIdDecorations(state, new ParagraphIdIndex().read(state, indexPresentation(loose, 0)!)), loose),
        ['<!-- id: a7k2p9 -->', '\t<!--id:k3x9a2-->\t', '<!-- id: d6e7f8 -->'],
        'an escaped comment is words; an escaped backslash before one is not'
    );
    // A long line of spaces and tabs is read in one pass.
    const long = deckOf(`Words${' \t'.repeat(40_000)}end`);
    const started = performance.now();
    new ParagraphIdIndex().read(EditorState.create({ doc: long }), indexPresentation(long, 0)!);
    assert.ok(performance.now() - started < 50, `${performance.now() - started} ms`);
});

test('a block with no words holds no id, as MarkdownPoint reads it: a line break or a note before the comment are no words, and its paragraph’s earlier line is', () => {
    const source = deckOf(
        '<br> <!-- id: a7k2p9 -->\n\n<br/><!-- a note --> <!-- id: k3x9a2 -->\n\nWords\n<br> <!-- id: p7m2q1 -->\n\n- <BR /> <!-- id: b8c4d0 -->\n\nMid <!-- id: c5d6e7 -->\nline'
    );
    const state = EditorState.create({ doc: source, selection: { anchor: 0 } });
    assert.deepEqual(
        covered(paragraphIdDecorations(state, new ParagraphIdIndex().read(state, indexPresentation(source, 0)!)), source),
        [' <!-- id: p7m2q1 -->'],
        "only a block with words holds one, at its last line's end"
    );
});

test("a loose list's paragraph indented by a tab holds its id, as the words around it hold theirs", () => {
    const source = deckOf(
        'Before <!-- id: z1x9a2 -->\n\n- Item <!-- id: a7k2p9 -->\n\n\tMore words <!-- id: k3x9a2 -->\n\nAfter <!-- id: p7m2q1 -->'
    );
    const state = EditorState.create({ doc: source, selection: { anchor: 0 } });
    assert.deepEqual(
        covered(paragraphIdDecorations(state, new ParagraphIdIndex().read(state, indexPresentation(source, 0)!)), source),
        [' <!-- id: z1x9a2 -->', ' <!-- id: a7k2p9 -->', ' <!-- id: k3x9a2 -->', ' <!-- id: p7m2q1 -->'],
        'the grammar reads the tab as spaces'
    );
});

test('words whose lines the grammar rewrites, as a quote can, hide the id each of their lines ends with', () => {
    const source = deckOf('Before <!-- id: z1x9a2 -->\n\n> - Item <!-- id: a7k2p9 -->\n>  \nAfter <!-- id: p7m2q1 -->');
    const state = EditorState.create({ doc: source, selection: { anchor: 0 } });
    assert.deepEqual(
        covered(paragraphIdDecorations(state, new ParagraphIdIndex().read(state, indexPresentation(source, 0)!)), source),
        [' <!-- id: z1x9a2 -->', ' <!-- id: a7k2p9 -->', ' <!-- id: p7m2q1 -->'],
        "the quote's blank line of two spaces stands as one space in the grammar's reading, so its lines are read alone"
    );
});

test("a composition's ids before a slide's are hidden in the source's order", () => {
    const source = `<!-- composition: card -->\n<!-- text: label -->\nA label <!-- id: c1x9a2 -->\n\n${deck}`;
    const state = EditorState.create({ doc: source, selection: { anchor: source.length } });
    assert.deepEqual(covered(paragraphIdDecorations(state, new ParagraphIdIndex().read(state, indexPresentation(source, 0)!)), source), [
        ' <!-- id: c1x9a2 -->',
        ' <!-- id: t1x9a2 -->',
        ' <!-- id: a7k2p9 -->',
        ' <!-- id: k3x9a2 -->',
        ' <!-- id: p7m2q1 -->',
        ' <!-- id: b8c4d0 -->'
    ]);
});

test('the index reads again only the words that changed, and finds the others where they moved', () => {
    const two = `${deck}\n<!-- slide: second -->\n<!-- text: body -->\nLater <!-- id: q2w3e4 -->\n`;
    const index = new ParagraphIdIndex();
    const away = (doc: string) => EditorState.create({ doc, selection: { anchor: 0 } });
    const found = (doc: string) => covered(paragraphIdDecorations(away(doc), index.read(away(doc), indexPresentation(doc, 0)!)), doc);
    const before = found(two);
    const longer = two.replace('One line', 'One longer line');
    assert.deepEqual(found(longer), before, 'the second slide’s id, read before, is found after the first slide’s words grew');
    assert.deepEqual(found(longer.replace('Later <!-- id: q2w3e4 -->', 'Later')), before.slice(0, -1));
});

test("a section's heading holds no paragraph id: one written there stays in sight, and Enter in its words moves none", () => {
    const sectioned = `<!-- section: intro -->\n# Start <!-- id: s1x9a2 -->\n\n${deck}`;
    const state = EditorState.create({ doc: sectioned, selection: { anchor: sectioned.length } });
    assert.deepEqual(
        covered(paragraphIdDecorations(state, new ParagraphIdIndex().read(state, indexPresentation(sectioned, 0)!)), sectioned),
        [' <!-- id: t1x9a2 -->', ' <!-- id: a7k2p9 -->', ' <!-- id: k3x9a2 -->', ' <!-- id: p7m2q1 -->', ' <!-- id: b8c4d0 -->']
    );
    const at = sectioned.indexOf('art <!--');
    assert.equal(edited(sectioned, { from: at, insert: '\n' }), `${sectioned.slice(0, at)}\n${sectioned.slice(at)}`);
});

/** The deck after one change an author makes in it, its ids kept as MarkdownPoint keeps them. */
function edited(doc: string, change: { from: number; to?: number; insert?: string }, userEvent = 'input'): string {
    const state = EditorState.create({ doc, extensions: keptParagraphIds(state => indexPresentation(state.doc.toString(), 0)) });
    return state.update({ changes: change, userEvent }).state.doc.toString();
}

/** The deck as the change leaves it, the author's words as typed. */
const typed = (doc: string, change: { from: number; to?: number; insert?: string }): string =>
    doc.slice(0, change.from) + (change.insert ?? '') + doc.slice(change.to ?? change.from);

/** A deck whose one text holds `words`. */
const deckOf = (words: string): string => `<!-- slide: first -->\n<!-- text: body -->\n${words}\n<!-- notes -->\nSay it.\n`;

test("Enter in a paragraph's words leaves its id on the first part once a blank line parts it, and before the id on its words' line", () => {
    const at = deck.indexOf(' here');
    const once = edited(deck, { from: at, insert: '\n' });
    assert.equal(once, typed(deck, { from: at, insert: '\n' }), 'a line break inside a paragraph parts nothing');
    assert.match(edited(once, { from: at + 1, insert: '\n' }), /Two lines\nend <!-- id: k3x9a2 -->\n\n here\n/);
    const id = deck.indexOf(' <!-- id: a7k2p9');
    assert.match(edited(deck, { from: id, insert: '\n' }), /One line <!-- id: a7k2p9 -->\n\n\nTwo lines/);
    // At the start of its words, or after its id, the id stays on them.
    for (const from of [deck.indexOf('Two lines'), deck.indexOf('\n', deck.indexOf('One line'))])
        assert.equal(edited(deck, { from, insert: '\n' }), typed(deck, { from, insert: '\n' }));
});

test('Enter in a list item, a numbered item, a task, a quote or a heading leaves its id on the first part', () => {
    const cases: Array<[string, string, string, RegExp]> = [
        ['- Item <!-- id: a7k2p9 -->', 'em <!--', '\n- ', /- It <!-- id: a7k2p9 -->\n- em\n/],
        ['1. First <!-- id: a7k2p9 -->', 'rst <!--', '\n2. ', /1\. Fi <!-- id: a7k2p9 -->\n2\. rst\n/],
        ['- [ ] Task <!-- id: a7k2p9 -->', 'sk <!--', '\n- [ ] ', /- \[ \] Ta <!-- id: a7k2p9 -->\n- \[ \] sk\n/],
        ['# Heading <!-- id: a7k2p9 -->', 'ding <!--', '\n', /# Hea <!-- id: a7k2p9 -->\nding\n/]
    ];
    for (const [words, after, insert, expected] of cases) {
        const doc = deckOf(words);
        assert.match(edited(doc, { from: doc.indexOf(after), insert }), expected, words);
    }
    // A quote's line goes on in the same paragraph; Enter again leaves an empty line of the quote between its parts.
    const quote = deckOf('> Quoted <!-- id: a7k2p9 -->');
    const once = edited(quote, { from: quote.indexOf('ted <!--'), insert: '\n> ' });
    assert.equal(once, typed(quote, { from: quote.indexOf('ted <!--'), insert: '\n> ' }));
    assert.match(edited(once, { from: once.indexOf('ted <!--'), insert: '\n> ' }), /> Quo <!-- id: a7k2p9 -->\n> \n> ted\n/);
});

test("a join of two blocks keeps the first one's id and drops the second's, or keeps none where the first had none", () => {
    const blank = deck.indexOf('\n\nTwo lines');
    assert.match(edited(deck, { from: blank, to: blank + 1 }, 'delete'), /One line\nTwo lines\nend here <!-- id: a7k2p9 -->\n\n- Item/);
    const nested = deck.indexOf('- Nested');
    assert.match(edited(deck, { from: nested, to: nested + 2 }, 'delete'), /- Item\n {2}Nested <!-- id: p7m2q1 -->\n/);
    const plain = deck.replace('One line <!-- id: a7k2p9 -->', 'One line');
    const gap = plain.indexOf('\n\nTwo lines');
    assert.match(edited(plain, { from: gap, to: gap + 1 }, 'delete'), /One line\nTwo lines\nend here\n\n- Item/);
    const heading = deckOf('# A <!-- id: a7k2p9 -->\nB <!-- id: k3x9a2 -->');
    const line = heading.indexOf('\nB');
    assert.equal(
        edited(heading, { from: line, to: line + 1 }, 'delete'),
        heading.replace('# A <!-- id: a7k2p9 -->\nB <!-- id: k3x9a2 -->', '# AB <!-- id: a7k2p9 -->')
    );
});

test("an id alone on the line right after a block's words, as a formatter wraps it, is hidden on its line, and Enter and a join move it whole", () => {
    const wrapped = deckOf(
        'One\n<!-- id: a7k2p9 -->\n\n# Two\n<!-- id: k3x9a2 -->\n\nThree\n===\n  <!-- id: p7m2q1 -->\n\n- Four\n  <!-- id: b8c4d0 -->\n\n> Five\n> <!-- id: c5d6e7 -->\n\nSix\n\n<!-- id: d6e7f8 -->\n\n<br>\n<!-- id: e7f8a9 -->'
    );
    const state = EditorState.create({ doc: wrapped, selection: { anchor: 0 } });
    assert.deepEqual(
        covered(paragraphIdDecorations(state, new ParagraphIdIndex().read(state, indexPresentation(wrapped, 0)!)), wrapped),
        ['<!-- id: a7k2p9 -->', '<!-- id: k3x9a2 -->', '<!-- id: p7m2q1 -->', '<!-- id: b8c4d0 -->', '<!-- id: c5d6e7 -->'],
        'one after a blank line, or after a block with no words, is a note'
    );
    // Enter leaves it on the first part, written on its line.
    const item = deckOf('- Item\n  <!-- id: a7k2p9 -->');
    assert.equal(edited(item, { from: item.indexOf('em\n'), insert: '\n- ' }), deckOf('- It <!-- id: a7k2p9 -->\n- em'));
    const heading = deckOf('# Heading\n<!-- id: a7k2p9 -->');
    assert.equal(edited(heading, { from: heading.indexOf('ding'), insert: '\n' }), deckOf('# Hea <!-- id: a7k2p9 -->\nding'));
    // A join drops the second block's and keeps the first one's, or none; a heading's underline stays.
    const joins: Array<[string, string, string]> = [
        ['One <!-- id: a7k2p9 -->', 'Two', 'One\nTwo <!-- id: a7k2p9 -->'],
        ['One', 'Two', 'One\nTwo'],
        ['One', 'Two\n===', 'One\nTwo\n==='],
        ['One <!-- id: a7k2p9 -->', 'Two\n---', 'One\nTwo <!-- id: a7k2p9 -->\n---']
    ];
    for (const [first, second, joined] of joins) {
        const doc = deckOf(`${first}\n\n${second}\n<!-- id: k3x9a2 -->`);
        const blank = doc.indexOf('\n\nTwo');
        assert.equal(edited(doc, { from: blank, to: blank + 1 }, 'delete'), deckOf(joined), `${first} and ${second}`);
    }
    // Delete at the end of words whose id is on the line after joins the next words to them through it: the id is kept once.
    const first = deckOf('One\n<!-- id: a7k2p9 -->\nTwo <!-- id: k3x9a2 -->');
    const end = first.indexOf('\n<!-- id: a7k2p9');
    assert.equal(edited(first, { from: end, to: end + 1 }, 'delete'), deckOf('One\nTwo <!-- id: a7k2p9 -->'));
});

test('Enter and a join read an id written loosely, and write the one they keep as MarkdownPoint writes it', () => {
    const doc = deckOf('One line\t<!--id:a7k2p9-->\n\nTwo <!-- id: k3x9a2 -->');
    const at = doc.indexOf(' line');
    const once = edited(doc, { from: at, insert: '\n' });
    assert.match(edited(once, { from: at + 1, insert: '\n' }), /One <!-- id: a7k2p9 -->\n\n line\n\nTwo/);
    const blank = doc.indexOf('\n\nTwo');
    assert.match(edited(doc, { from: blank, to: blank + 1 }, 'delete'), /One line\nTwo <!-- id: a7k2p9 -->\n/);
});

test('every other edit leaves the ids as the author typed it: typing, retyping, pastes, marks, deletions, a reload, two changes at once and code', () => {
    const words = deck.indexOf('One line');
    const comment = deck.indexOf(' <!-- id: a7k2p9 -->');
    const changes: Array<{ from: number; to?: number; insert?: string }> = [
        { from: words + 3, insert: ' long' },
        { from: words, to: words + 8, insert: 'Retyped' },
        { from: words, insert: 'New paragraph\n\n' },
        { from: words, insert: 'Pasted\n\nAnother ' },
        { from: comment, to: comment + ' <!-- id: a7k2p9 -->'.length, insert: ' added\n\nNext' },
        { from: words, insert: '> ' },
        { from: words, to: deck.indexOf('Two lines') },
        { from: deck.indexOf(' here'), insert: '\n\n' }
    ];
    for (const change of changes) assert.equal(edited(deck, change), typed(deck, change), JSON.stringify(change));
    const state = EditorState.create({ doc: deck, extensions: keptParagraphIds(state => indexPresentation(state.doc.toString(), 0)) });
    const at = deck.indexOf(' here');
    assert.equal(
        state.update({ changes: { from: at, insert: '\n\n' } }).state.doc.toString(),
        typed(deck, { from: at, insert: '\n\n' }),
        'words read anew'
    );
    const two = [
        { from: deck.indexOf(' here'), insert: '\n' },
        { from: deck.indexOf('em <!--'), insert: '\n- ' }
    ];
    assert.equal(
        state.update({ changes: two, userEvent: 'input' }).state.doc.toString(),
        state.update({ changes: two }).state.doc.toString()
    );
    const heading = deck.indexOf('tle <!--');
    assert.equal(edited(deck, { from: heading, insert: '\n' }, 'input.paste'), typed(deck, { from: heading, insert: '\n' }), 'a paste');
    const blank = deck.indexOf('\n\nTwo lines');
    assert.equal(edited(deck, { from: blank, to: blank + 1 }, 'delete.cut'), typed(deck, { from: blank, to: blank + 1 }), 'a cut');
    const code = deckOf('```\nCode <!-- id: k3x9a2 -->\n```');
    assert.equal(
        edited(code, { from: code.indexOf('de <!--'), insert: '\n' }),
        typed(code, { from: code.indexOf('de <!--'), insert: '\n' })
    );
    const quoted = deckOf('>  Alpha <!-- id: a7k2p9 -->');
    assert.equal(
        edited(quoted, { from: quoted.indexOf('pha'), insert: '\n> ' }),
        typed(quoted, { from: quoted.indexOf('pha'), insert: '\n> ' }),
        'words the grammar renumbers'
    );
});

test('Undo and Redo bring back the words as they were, ids and all', () => {
    let state = EditorState.create({
        doc: deck,
        extensions: [history(), keptParagraphIds(state => indexPresentation(state.doc.toString(), 0))]
    });
    const dispatch = (transaction: Transaction): void => {
        state = transaction.state;
    };
    const item = deck.indexOf('em <!--');
    state = state.update({ changes: { from: item, insert: '\n- ' }, userEvent: 'input' }).state;
    const parted = state.doc.toString();
    assert.match(parted, /- It <!-- id: p7m2q1 -->\n- em\n/);
    undo({ state, dispatch });
    assert.equal(state.doc.toString(), deck);
    redo({ state, dispatch });
    assert.equal(state.doc.toString(), parted);
});
