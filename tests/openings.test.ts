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
import { EditorSelection, EditorState, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { editorInfoField, editorLivePreviewField } from './support/obsidian.ts';
import { indexPresentation } from '../src/format/document.ts';
import type { TextFieldLabels } from '../src/format/text-binding.ts';
import { heldOpenings, inOpening, keepsStructure, openingWrite } from '../src/editor/openings.ts';
import { missingPlaceholders } from '../src/editor/writing-fields.ts';
import { PresentationEditor } from '../src/editor/presentation-editor.ts';
import { NotesUi } from '../src/settings/notes-ui.ts';
import type { PresentationReader } from '../src/presentation/reader.ts';

const labels: TextFieldLabels = {
    names: { title: 'Title', body: 'Body', eyebrow: 'Eyebrow' },
    text: 'Text',
    numbered: ({ name, number }) => `${name} ${number}`
};
// Each slide's marker is followed by the blank line MarkdownPoint writes, a line no block holds.
const deck =
    '\n<!-- section: one -->\n# One\n\n' +
    '<!-- slide: blank -->\n\n' +
    '<!-- slide: empty -->\n\n' +
    '<!-- slide: words -->\n\n<!-- text: body -->\nWords.\n\n' +
    '<!-- slide: noted -->\n\n<!-- notes -->\nSay it.\n\n' +
    '<!-- slide: last -->\n';
const placeholders = new Map<string, readonly string[]>([
    ['empty', ['eyebrow', 'title', 'body']],
    ['words', ['title', 'body']]
]);
const slideOf = (markdown: string, id: string, bodyStart = 0) =>
    indexPresentation(markdown, bodyStart)!.slides.find(slide => slide.id === id)!;
const opening = (markdown: string, id: string) => slideOf(markdown, id).markerTo;

/** The source after `words` replace `from`–`to`, or null where they are refused. */
function typed(markdown: string, from: number, words: string, to = from, bodyStart = 0): string | null {
    const document = indexPresentation(markdown, bodyStart)!;
    const write = openingWrite(markdown, document, bodyStart, missingPlaceholders(document, placeholders, labels), from, to);
    if (!write) return null;
    const written = markdown.slice(0, write.at) + write.before + markdown.slice(write.at, from) + words + markdown.slice(to);
    const grown = write.before.length + words.length - (to - from);
    const map = (position: number) =>
        position >= to ? position + grown : position >= write.at ? position + write.before.length : position;
    return keepsStructure(markdown, document, bodyStart, written, write, map, write.at) ? written : null;
}

test('words typed on the line of a slide with no blocks write its first unwritten placeholder, else its notes, at the caret', () => {
    const blank = typed(deck, opening(deck, 'blank'), 'Hi');
    assert.equal(blank, deck.replace('<!-- slide: blank -->\n\n', '<!-- slide: blank -->\n\n<!-- notes -->\nHi\n'));
    const empty = typed(deck, opening(deck, 'empty'), 'Hi');
    assert.equal(empty, deck.replace('<!-- slide: empty -->\n\n', '<!-- slide: empty -->\n\n<!-- text: eyebrow -->\nHi\n'));
    assert.equal(typed(deck, deck.length, 'Hi'), `${deck}\n<!-- notes -->\nHi`);
    const crlf = deck.replaceAll('\n', '\r\n');
    assert.equal(
        typed(crlf, opening(crlf, 'blank'), 'Hi'),
        crlf.replace('<!-- slide: blank -->\r\n\r\n', '<!-- slide: blank -->\r\n\r\n<!-- notes -->\r\nHi\r\n')
    );
    // Spaces typed before the words stay with them, in the block
    const indented = deck.replace('<!-- slide: blank -->\n\n', '<!-- slide: blank -->\n    \n');
    assert.equal(
        typed(indented, opening(indented, 'blank') + 4, 'code'),
        deck.replace('<!-- slide: blank -->\n\n', '<!-- slide: blank -->\n\n<!-- notes -->\n    code\n')
    );
    // Spaces selected on the line give way to the words
    const spaced = deck.replace('<!-- slide: blank -->\n\n', '<!-- slide: blank -->\n   \n');
    const at = opening(spaced, 'blank');
    assert.equal(
        typed(spaced, at, 'Hi', at + 3),
        deck.replace('<!-- slide: blank -->\n\n', '<!-- slide: blank -->\n\n<!-- notes -->\nHi\n')
    );
    const document = indexPresentation(deck, 0)!;
    const write = (id: string) =>
        openingWrite(deck, document, 0, missingPlaceholders(document, placeholders, labels), opening(deck, id), opening(deck, id));
    assert.deepEqual(
        ['blank', 'empty'].map(id => write(id)?.notesOf),
        ['blank', null]
    );
});

test('no block takes words in the opening of a slide with blocks, of a composition or before the first marker', () => {
    for (const id of ['words', 'noted']) assert.equal(typed(deck, opening(deck, id), 'Hi'), null, id);
    const definitions = '<!-- slide: one -->\n\n<!-- notes -->\nSay.\n\n<!-- composition: card -->\n\n<!-- text: label -->\nLabel\n';
    assert.equal(typed(definitions, definitions.indexOf('\n<!-- text: label'), 'A '), null);
    const document = indexPresentation(deck, 0)!;
    assert.equal(inOpening(document, 0, deck.length, 0), true);
    assert.equal(typed(deck, 0, 'Hi'), null);
    assert.equal(inOpening(document, 0, deck.length, deck.indexOf('# One')), false);
    assert.equal(inOpening(document, 0, deck.length, deck.indexOf('Words.')), false);
});

test('words that would move or set free a marker are refused', () => {
    // A fence the words open takes in the next slide's markers until that slide's own fence closes it
    const fenced = '<!-- slide: blank -->\n\n<!-- slide: code -->\n\n<!-- text: body -->\n```\ncode\n```\n';
    const swallowed = '<!-- slide: blank -->\n\n<!-- notes -->\n```\n<!-- slide: code -->\n\n<!-- text: body -->\n```\ncode\n```\n';
    assert.deepEqual(
        indexPresentation(swallowed, 0)?.slides.map(slide => slide.id),
        ['blank']
    );
    assert.equal(typed(fenced, opening(fenced, 'blank'), '```'), null);
    // A fence that closes at a later block's own fence sets free a marker shown as code there
    const example = '<!-- slide: blank -->\n\n<!-- slide: own -->\n\n<!-- notes -->\n~~~\n<!-- text: example -->\n~~~\n';
    assert.equal(typed(example, opening(example, 'blank'), '~~~\n<!-- slide: own -->\n\n<!-- notes -->\n'), null);
    assert.equal(typed(fenced, opening(fenced, 'blank'), 'A\n<!-- notes -->\nB'), null);
});

test("in a newer minor's file a later minor's block ends a slide's opening, so its words stay its own", () => {
    const front = '---\nmarkdownpoint: "1.1"\nid: 0f8c4d0e-6a1b-4c2d-9e3f-5a6b7c8d9e0f\n---\n\n';
    const later = `${front}<!-- slide: glows -->\n\n<!-- glow -->\nShine.\n<!-- text: body -->\nWords.\n`;
    const document = indexPresentation(later, front.length)!;
    assert.equal(inOpening(document, front.length, later.length, later.indexOf('Shine.')), false);
    assert.equal(inOpening(document, front.length, later.length, slideOf(later, 'glows', front.length).markerTo), true);
    assert.equal(typed(later, slideOf(later, 'glows', front.length).markerTo, 'Hi', undefined, front.length), null);
});

function editor(markdown: string, livePreview = true): EditorState {
    const reader = {
        snapshot(_file: unknown, source: string) {
            const document = indexPresentation(source, 0);
            return (
                document && {
                    id: 'presentation',
                    bodyStart: 0,
                    document,
                    images: new Map(),
                    placeholders,
                    outline: { slides: document.slides.map(slide => ({ id: slide.id, skipped: false })), sections: [] }
                }
            );
        },
        matchesIdentity: () => true
    } as unknown as PresentationReader;
    const notes = new NotesUi({ loadLocalStorage: () => null, saveLocalStorage: () => undefined });
    const owner = new PresentationEditor(reader, notes, () => undefined);
    owner.onload();
    return EditorState.create({
        doc: markdown,
        extensions: [editorInfoField, ...(livePreview ? [editorLivePreviewField] : []), history(), owner.extension]
    });
}

function type(state: EditorState, at: number, words: string, caret = words.length, userEvent = 'input.type'): EditorState {
    return state.update({ changes: { from: at, insert: words }, selection: { anchor: at + caret }, userEvent }).state;
}

test('Live Preview writes the block as the author types; native undo takes it away with the words, and redo puts the caret after them', () => {
    const at = opening(deck, 'blank');
    let state = editor(deck).update({ selection: { anchor: at } }).state;
    state = type(state, at, '()', 1);
    const written = deck.replace('<!-- slide: blank -->\n\n', '<!-- slide: blank -->\n\n<!-- notes -->\n()\n');
    assert.equal(state.doc.toString(), written);
    assert.equal(state.selection.main.head, written.indexOf('()') + 1);
    state = type(state, state.selection.main.head, 'x');
    assert.equal(state.doc.toString(), written.replace('()', '(x)'));
    const run = (command: typeof undo) => command({ state, dispatch: transaction => (state = transaction.state) });
    assert.ok(run(undo));
    assert.equal(state.doc.toString(), deck);
    assert.equal(state.selection.main.head, at);
    assert.ok(run(redo));
    assert.equal(state.doc.toString(), written.replace('()', '(x)'));
    assert.equal(state.selection.main.head, written.indexOf('()') + 3);
    // What came with the words stays with them, as the state an auto-paired bracket keeps
    const paired = StateEffect.define<number>();
    const typing = editor(deck).update({
        changes: { from: at, insert: '()' },
        selection: { anchor: at + 1 },
        effects: paired.of(at + 1),
        userEvent: 'input.type'
    });
    assert.equal(typing.newDoc.toString(), written);
    assert.ok(typing.effects.some(effect => effect.is(paired)));
});

test('Live Preview refuses words no block takes and lets every other edit through as typed', () => {
    const state = editor(deck);
    const at = opening(deck, 'blank');
    for (const [position, label] of [
        [0, 'before the first marker'],
        [opening(deck, 'words'), "the line between a slide's marker and its first field"]
    ] as const)
        assert.equal(type(state, position, 'Hi').doc.toString(), deck, label);
    // A composition there would be typed twice if its words moved while it lasts
    assert.equal(type(state, at, 'か', 1, 'input.type.compose').doc.toString(), deck);
    // A pasted block with its own marker puts its words in a block already: it stands as pasted
    const block = '<!-- notes -->\nSaid.\n';
    for (const position of [at, opening(deck, 'words')])
        assert.equal(type(state, position, block).doc.toString(), deck.slice(0, position) + block + deck.slice(position));
    // Blank lines stand where they are typed
    assert.equal(type(state, at, '\n').doc.toString(), deck.slice(0, at) + '\n' + deck.slice(at));
    const words = deck.indexOf('Words.');
    assert.equal(type(state, words, 'My ').doc.toString(), deck.replace('Words.', 'My Words.'));
    // Two carets, one of them on a slide's line: both type, that one into the slide's writing
    const typeAt = (positions: number[]) =>
        state
            .update({
                changes: positions.map(position => ({ from: position, insert: 'A' })),
                selection: EditorSelection.create(positions.map((position, index) => EditorSelection.cursor(position + index + 1))),
                userEvent: 'input.type'
            })
            .state.doc.toString();
    assert.equal(
        typeAt([at, words]),
        deck.replace('Words.', 'AWords.').replace('<!-- slide: blank -->\n\n', '<!-- slide: blank -->\n\n<!-- notes -->\nA\n')
    );
    // Two slides' lines at once: nothing is typed
    assert.equal(typeAt([at, opening(deck, 'empty')]), deck);
    // Text dragged onto it leaves its place and goes into the writing the slide shows
    const moved = state.update({
        changes: [
            { from: at, insert: 'Words.' },
            { from: words, to: words + 'Words.'.length }
        ],
        selection: EditorSelection.single(at, at + 'Words.'.length),
        userEvent: 'move.drop'
    }).state;
    const dropped = deck.replace('Words.', '').replace('<!-- slide: blank -->\n\n', '<!-- slide: blank -->\n\n<!-- notes -->\nWords.\n');
    assert.equal(moved.doc.toString(), dropped);
    assert.deepEqual([moved.selection.main.from, moved.selection.main.to], [dropped.indexOf('Words.'), dropped.indexOf('Words.') + 6]);
    // Source mode stays ordinary Markdown, and so does an edit that is not the author's typing
    assert.equal(type(editor(deck, false), at, 'Hi').doc.toString(), deck.slice(0, at) + 'Hi' + deck.slice(at));
    assert.equal(state.update({ changes: { from: at, insert: 'Hi' } }).state.doc.toString(), deck.slice(0, at) + 'Hi' + deck.slice(at));
});

test("a slide's boundary holds its opening of one blank line before its first block, and no other", () => {
    const held = (markdown: string, bodyStart = 0) => Object.fromEntries(heldOpenings(markdown, indexPresentation(markdown, bodyStart)!));
    const line = (markdown: string, id: string, bodyStart = 0) => slideOf(markdown, id, bodyStart).blocks[0]!.from - 1;
    // Slides with no blocks keep their line, where words write their first writing
    assert.deepEqual(held(deck), { words: line(deck, 'words'), noted: line(deck, 'noted') });
    // Spaces on the line are still no words
    const spaced = deck.replace('<!-- slide: words -->\n\n', '<!-- slide: words -->\n  \n');
    assert.equal(held(spaced).words, line(spaced, 'words'));
    // An opening of more lines keeps them, for the author to delete; a compact slide has no line to hold
    assert.equal(held(deck.replace('<!-- slide: words -->\n\n', '<!-- slide: words -->\n\n\n')).words, undefined);
    assert.deepEqual(held('<!-- slide: one -->\n<!-- text: body -->\nB\n'), {});
    // Right under the frontmatter, as anywhere
    const front = '---\nmarkdownpoint: "1.1"\nid: 0f8c4d0e-6a1b-4c2d-9e3f-5a6b7c8d9e0f\n---\n';
    const top = `${front}<!-- slide: top -->\n\n<!-- text: body -->\nB\n`;
    assert.deepEqual(held(top, front.length), { top: line(top, 'top', front.length) });
    // A later minor's block that ends the opening is shown as written, so the line before it stays
    const later = `${front}<!-- slide: glows -->\n\n<!-- glow -->\nShine.\n<!-- text: body -->\nWords.\n\n<!-- slide: lit -->\n\n<!-- text: body -->\nLit.\n`;
    assert.deepEqual(held(later, front.length), { lit: line(later, 'lit', front.length) });
});

test("an opening a selection's end stands on stays shown; a selection that only passes over it leaves it held", () => {
    const document = indexPresentation(deck, 0)!;
    const words = slideOf(deck, 'words');
    const first = words.blocks[0]!.from;
    const holds = (...ranges: [number, number][]) =>
        heldOpenings(
            deck,
            document,
            ranges.map(([anchor, head]) => ({ anchor, head }))
        ).has('words');
    // A caret on the line, at its start or on its spaces, shows it
    assert.equal(holds([words.markerTo, words.markerTo]), false);
    const spaced = deck.replace('<!-- slide: words -->\n\n', '<!-- slide: words -->\n  \n');
    const spacedWords = slideOf(spaced, 'words');
    const spacedHolds = (head: number) => heldOpenings(spaced, indexPresentation(spaced, 0)!, [{ anchor: head, head }]).has('words');
    assert.equal(spacedHolds(spacedWords.markerTo + 2), false);
    // Either end of a selection on it shows it
    assert.equal(holds([words.markerTo, first + 3]), false);
    assert.equal(holds([words.from - 4, words.markerTo]), false);
    // One range of several on it is enough
    assert.equal(holds([first + 2, first + 2], [words.markerTo, words.markerTo]), false);
    // Carets on the marker and at the first block, and a selection across the whole opening, leave it held
    assert.equal(holds([words.from, words.from], [first, first]), true);
    assert.equal(holds([words.from - 4, first + 3]), true);
    assert.equal(holds([first + 3, words.from - 4]), true);
});

test('Live Preview passes the caret over each opening a boundary holds, and still does while an open fence stops the deck being read', () => {
    // A position the caret passes over stands inside an atomic range, not at its edge
    const passed = (state: EditorState, position: number) =>
        state.facet(EditorView.atomicRanges).some(ranges => {
            let inside = false;
            ranges({ state } as EditorView).between(position, position, (from, to) => {
                inside ||= from < position && to > position;
            });
            return inside;
        });
    const lineEnd = (markdown: string, id: string) => slideOf(markdown, id).blocks[0]!.from - 1;
    const state = editor(deck);
    assert.deepEqual(
        ['words', 'noted'].map(id => passed(state, lineEnd(deck, id))),
        [true, true]
    );
    // A caret on the line shows it
    assert.equal(passed(state.update({ selection: { anchor: opening(deck, 'words') } }).state, lineEnd(deck, 'words')), false);
    const words = deck.indexOf('Words.');
    const fenced = type(state, words, '```\n');
    assert.equal(indexPresentation(fenced.doc.toString(), 0), null);
    assert.deepEqual(
        ['words', 'noted'].map(id => passed(fenced, lineEnd(deck, id) + (id === 'noted' ? 4 : 0))),
        [true, true]
    );
});
