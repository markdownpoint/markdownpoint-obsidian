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
import { history, historyField, undo, redo, undoDepth } from '@codemirror/commands';
import { EditorState, EditorSelection } from '@codemirror/state';
import type { Transaction } from '@codemirror/state';
import { boundaryChangesAllowed } from '../src/editor/boundary-protection.ts';
import { historyReorderSelection, slideReorderTransaction } from '../src/editor/reorder.ts';
import { indexPresentation, slideAtPosition } from '../src/format/document.ts';
import type { PresentationDocument } from '../src/format/document.ts';
import { slideEditTransactions } from '../src/editor/structural-history.ts';

const slideStepTransaction = (state: EditorState, document: PresentationDocument, ids: Iterable<string>, direction: 'up' | 'down') =>
    slideReorderTransaction(state, document, ids, { kind: 'step', direction });

const markdown =
    '<!-- slide: alpha -->\n<!-- text: body -->\nAlpha\n\n<!-- slide: bravo -->\n<!-- text: body -->\nBeta\n\n<!-- slide: charlie -->\n<!-- text: body -->\nGamma';
const documentOf = (state: EditorState) => indexPresentation(state.doc.toString(), 0)!;
const idsOf = (state: EditorState) => documentOf(state).slides.map(slide => slide.id);
function editor(selection = EditorSelection.single(markdown.indexOf('Beta') + 2)): EditorState {
    return EditorState.create({
        doc: markdown,
        selection,
        extensions: [
            history(),
            EditorState.allowMultipleSelections.of(true),
            EditorState.transactionFilter.of(transaction => {
                const document = documentOf(transaction.startState);
                const markers = [
                    ...document.slides,
                    ...document.sections,
                    ...document.slides.flatMap(slide => slide.blocks.map(block => ({ from: block.from, markerTo: block.contentFrom })))
                ];
                return boundaryChangesAllowed(transaction, markers) ? transaction : [];
            })
        ]
    });
}

test('each slide step is one native undo event, separate from typing before and after it', () => {
    let state = editor();
    const target = {
        get state() {
            return state;
        },
        dispatch: (transaction: Transaction) => {
            state = transaction.state;
        }
    };
    state = state.update({
        changes: { from: state.selection.main.head, insert: 'X' },
        selection: { anchor: state.selection.main.head + 1 },
        userEvent: 'input.type'
    }).state;
    const typed = state.doc.toString();
    const step = slideStepTransaction(state, documentOf(state), ['bravo'], 'up');
    assert.ok(step);
    state = slideEditTransactions(state, step).at(-1)!.state;
    assert.deepEqual(idsOf(state), ['bravo', 'alpha', 'charlie']);
    assert.equal(state.selection.main.head, state.doc.toString().indexOf('BeXta') + 3);
    const moved = state.doc.toString();
    state = state.update({
        changes: { from: state.selection.main.head, insert: 'Y' },
        selection: { anchor: state.selection.main.head + 1 },
        userEvent: 'input.type'
    }).state;
    const finished = state.doc.toString();
    assert.equal(undoDepth(state), 3);
    assert.equal(undo(target), true);
    assert.equal(state.doc.toString(), moved);
    assert.equal(undo(target), true);
    assert.equal(state.doc.toString(), typed);
    assert.equal(state.selection.main.head, typed.indexOf('BeXta') + 3);
    assert.equal(undo(target), true);
    assert.equal(state.doc.toString(), markdown);
    for (let index = 0; index < 3; index++) assert.equal(redo(target), true);
    assert.equal(state.doc.toString(), finished);
});

test('repeated slide steps stay separate in native undo and redo', () => {
    let state = editor();
    const target = {
        get state() {
            return state;
        },
        dispatch: (transaction: Transaction) => {
            state = transaction.state;
        }
    };
    state = slideEditTransactions(state, slideStepTransaction(state, documentOf(state), ['bravo'], 'up')!).at(-1)!.state;
    const first = state.doc.toString();
    state = slideEditTransactions(state, slideStepTransaction(state, documentOf(state), ['bravo'], 'down')!).at(-1)!.state;
    assert.equal(state.doc.toString(), markdown);
    assert.equal(undoDepth(state), 2);
    undo(target);
    assert.equal(state.doc.toString(), first);
    undo(target);
    assert.equal(state.doc.toString(), markdown);
    redo(target);
    assert.equal(state.doc.toString(), first);
    assert.equal(state.selection.main.head, state.doc.toString().indexOf('Beta') + 2);
});

test('multiple native text selections keep their words, directions and main range after moving', () => {
    const beta = markdown.indexOf('Beta'),
        gamma = markdown.indexOf('Gamma');
    const state = editor(EditorSelection.create([EditorSelection.range(beta + 4, beta), EditorSelection.range(gamma, gamma + 5)], 1));
    const next = state.update(slideStepTransaction(state, documentOf(state), ['bravo'], 'up')!).state;
    assert.deepEqual(
        next.selection.ranges.map(range => next.doc.sliceString(range.from, range.to)),
        ['Beta', 'Gamma']
    );
    assert.ok(next.selection.ranges[0]!.anchor > next.selection.ranges[0]!.head);
    assert.equal(next.doc.sliceString(next.selection.main.from, next.selection.main.to), 'Gamma');
});

test('a former EOF caret stays with its text when its slide moves earlier', () => {
    const state = editor(EditorSelection.single(markdown.length));
    const next = state.update(slideStepTransaction(state, documentOf(state), ['charlie'], 'up')!).state;
    assert.equal(next.selection.main.head, next.doc.toString().indexOf('Gamma') + 5);
    assert.equal(slideAtPosition(documentOf(next), next.selection.main.head)?.id, 'charlie');
});

test('ordinary native text moves remain protected while the validated slide operation is allowed', () => {
    const state = editor();
    const from = markdown.indexOf('<!-- slide: bravo -->');
    const ordinary = state.update({ changes: { from, to: markdown.length, insert: 'Moved words' }, userEvent: 'move.drop' });
    assert.equal(ordinary.docChanged, false);
    const planned = slideStepTransaction(state, documentOf(state), ['bravo'], 'up');
    assert.ok(planned);
    assert.equal(state.update(planned).docChanged, true);
    assert.equal(slideStepTransaction(state, documentOf(state), ['alpha'], 'up'), null);
});

test('a split-group drop is one native undo event and retains the independent writing caret', () => {
    let state = editor();
    const caret = state.selection.main.head;
    const target = {
        get state() {
            return state;
        },
        dispatch: (transaction: Transaction) => {
            state = transaction.state;
        }
    };
    const drop = slideReorderTransaction(state, documentOf(state), ['charlie', 'alpha'], {
        kind: 'drop',
        target: { kind: 'slide', id: 'bravo', edge: 'after' }
    });
    assert.ok(drop);
    state = slideEditTransactions(state, drop).at(-1)!.state;
    assert.deepEqual(idsOf(state), ['bravo', 'alpha', 'charlie']);
    assert.equal(state.selection.main.head, state.doc.toString().indexOf('Beta') + 2);
    assert.equal(undoDepth(state), 1);
    assert.equal(undo(target), true);
    assert.equal(state.doc.toString(), markdown);
    assert.equal(state.selection.main.head, caret);
    assert.equal(redo(target), true);
    assert.deepEqual(idsOf(state), ['bravo', 'alpha', 'charlie']);
    assert.equal(state.selection.main.head, state.doc.toString().indexOf('Beta') + 2);
});

test('repeated native history cycles and serialization retain the writing slide and character', () => {
    let state = editor();
    state = slideEditTransactions(state, slideStepTransaction(state, documentOf(state), ['bravo'], 'up')!).at(-1)!.state;
    const target = {
        get state() {
            return state;
        },
        dispatch: (transaction: Transaction) => {
            const selection = historyReorderSelection(transaction, documentOf(transaction.startState), documentOf(transaction.state));
            state = selection ? transaction.state.update({ selection, userEvent: 'select.markdownpoint' }).state : transaction.state;
        }
    };
    for (let cycle = 0; cycle < 4; cycle++) {
        state = EditorState.fromJSON(state.toJSON({ history: historyField }), { extensions: [history()] }, { history: historyField });
        assert.equal(undoDepth(state), 1);
        assert.ok(undo(target));
        assert.equal(state.doc.toString(), markdown);
        assert.equal(state.selection.main.head, markdown.indexOf('Beta') + 2);
        assert.ok(redo(target));
        assert.deepEqual(idsOf(state), ['bravo', 'alpha', 'charlie']);
        assert.equal(state.selection.main.head, state.doc.toString().indexOf('Beta') + 2);
    }
});

test('history recognizes section crossings even when the slide order stays the same', () => {
    const source =
        '<!-- section: opening -->\n# Opening\n<!-- slide: alpha -->\n<!-- text: body -->\nAlpha\n<!-- section: ending -->\n# Ending\n<!-- slide: bravo -->\n<!-- text: body -->\nBeta\n';
    let state = EditorState.create({ doc: source, selection: { anchor: source.indexOf('Beta') + 2 }, extensions: [history()] });
    state = slideEditTransactions(state, slideStepTransaction(state, documentOf(state), ['bravo'], 'up')!).at(-1)!.state;
    assert.deepEqual(idsOf(state), ['alpha', 'bravo']);
    const target = {
        get state() {
            return state;
        },
        dispatch: (transaction: Transaction) => {
            const selection = historyReorderSelection(transaction, documentOf(transaction.startState), documentOf(transaction.state));
            state = selection ? transaction.state.update({ selection, userEvent: 'select.markdownpoint' }).state : transaction.state;
        }
    };
    for (let cycle = 0; cycle < 3; cycle++) {
        assert.ok(undo(target));
        assert.equal(state.doc.toString(), source);
        assert.equal(state.selection.main.head, source.indexOf('Beta') + 2);
        assert.ok(redo(target));
        assert.equal(state.selection.main.head, state.doc.toString().indexOf('Beta') + 2);
    }
});

test('history caret remapping leaves ordinary text undo and slide insertion/removal to their native selections', () => {
    for (const removeSlide of [false, true]) {
        let state = editor();
        const part = documentOf(state).slides[1]!;
        state = state.update({
            changes: removeSlide ? { from: part.from, to: part.to } : { from: state.selection.main.head, insert: 'X' }
        }).state;
        assert.ok(
            undo({
                state,
                dispatch: transaction => {
                    assert.equal(
                        historyReorderSelection(transaction, documentOf(transaction.startState), documentOf(transaction.state)),
                        null
                    );
                }
            })
        );
    }
});
