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

import {
    gatheredOrder,
    reconcileSelection,
    selectionAfter,
    selectionAfterRemoval,
    selectionOf,
    steppedOrder,
    type ListSelection,
    type ListSelectionAction
} from '../src/selection/list-selection.ts';

const ORDER = [1, 2, 3, 4, 5, 6, 7, 8];

/** A selection as its items in list order and its cursor, so a failure reads as the list shows it. */
const shown = (state: ListSelection<number>): string =>
    `${ORDER.filter(id => state.selected.has(id)).join(',')} @${state.cursor ?? 'none'}`;

type Input = ListSelectionAction<number> | ((state: ListSelection<number>) => ListSelectionAction<number>);

/** Each input in turn from `start`, with the selection each leaves. */
function play(start: ListSelection<number>, inputs: readonly Input[], order: readonly number[] = ORDER): string[] {
    let state = start;
    return inputs.map(input => shown((state = selectionAfter(order, state, typeof input === 'function' ? input(state) : input))));
}

/** Shift+↑ and Shift+↓ in a list: a step on to the item before or after the cursor. */
const up: Input = state => ({ kind: 'step', to: ORDER[ORDER.indexOf(state.cursor!) - 1]! });
const down: Input = state => ({ kind: 'step', to: ORDER[ORDER.indexOf(state.cursor!) + 1]! });

const NONE = selectionOf<number>([], null);

test("Johan's example: click 1, Shift-click 3, Command-click 5, then Shift-Up and Shift-Down", () => {
    assert.deepEqual(play(NONE, [{ kind: 'select', id: 1 }, { kind: 'range', id: 3 }, { kind: 'toggle', id: 5 }, up, down]), [
        '1 @1',
        '1,2,3 @3',
        '1,2,3,5 @5',
        '1,2,3,4,5 @1',
        '2,3,4,5 @2'
    ]);
});

test('a click selects the item alone, whatever was selected', () => {
    assert.deepEqual(play(selectionOf([1, 2, 6], 6), [{ kind: 'select', id: 4 }]), ['4 @4']);
});

test('Command-click puts an item in with the cursor on it, and takes one out leaving the cursor, or moving it to the first selected', () => {
    assert.deepEqual(
        play(selectionOf([2], 2), [
            { kind: 'toggle', id: 6 },
            { kind: 'toggle', id: 4 },
            { kind: 'toggle', id: 6 },
            { kind: 'toggle', id: 2 }
        ]),
        ['2,6 @6', '2,4,6 @4', '2,4 @4', '4 @4'],
        '6 joins with the cursor; 4 joins; 6 leaves, the cursor staying on 4; 2 leaves, the cursor staying'
    );
    assert.deepEqual(
        play(selectionOf([3, 5, 7], 5), [{ kind: 'toggle', id: 5 }]),
        ['3,7 @3'],
        "the cursor's item leaves: the first selected in list order"
    );
    const alone = selectionOf([4], 4);
    assert.equal(selectionAfter(ORDER, alone, { kind: 'toggle', id: 4 }), alone, 'the last selected item stays');
});

test('Shift-click adds the range from the cursor to the item, keeping what was selected, and moves the cursor there', () => {
    assert.deepEqual(play(selectionOf([8], 8), [{ kind: 'range', id: 6 }]), ['6,7,8 @6'], 'backward');
    assert.deepEqual(play(selectionOf([1, 7], 3), [{ kind: 'range', id: 5 }]), ['1,3,4,5,7 @5'], 'items outside the range stay');
    assert.deepEqual(play(selectionOf([2, 3], 3), [{ kind: 'range', id: 3 }]), ['2,3 @3'], 'onto the cursor itself');
    assert.deepEqual(play(NONE, [{ kind: 'range', id: 4 }]), ['4 @4'], 'with no cursor it selects the item alone');
});

test('Shift-Down and Shift-Up grow a run, shrink it when they turn back, and jump the cursor over a selected run they reach', () => {
    assert.deepEqual(
        play(selectionOf([3], 3), [down, down, up, up, up]),
        ['3,4 @4', '3,4,5 @5', '3,4 @4', '3 @3', '2,3 @2'],
        'down twice, then back up past where it began'
    );
    assert.deepEqual(
        play(selectionOf([1, 5, 6], 1), [down, down, down, down]),
        ['1,2,5,6 @2', '1,2,3,5,6 @3', '1,2,3,4,5,6 @6', '1,2,3,4,5,6,7 @7'],
        'reaching 4, the cursor jumps the run 5–6'
    );
});

test('a step to where the cursor stands, or with no cursor, changes nothing', () => {
    const state = selectionOf([1, 2], 1);
    assert.equal(selectionAfter(ORDER, state, { kind: 'step', to: 1 }), state);
    assert.equal(selectionAfter(ORDER, NONE, { kind: 'step', to: 2 }), NONE);
});

test('in a grid, Shift-Down to the tile below takes the tiles on the way, and Shift-Up back gives them back', () => {
    // Four tiles a row: 1–4 above 5–8.
    assert.deepEqual(
        play(selectionOf([2], 2), [
            { kind: 'step', to: 6 },
            { kind: 'step', to: 2 }
        ]),
        ['2,3,4,5,6 @6', '2 @2']
    );
    assert.deepEqual(play(selectionOf([2, 7, 8], 2), [{ kind: 'step', to: 6 }]), ['2,3,4,5,6,7,8 @8'], 'and jumps the selected run beyond');
});

test("Shift-Home and Shift-End, a range to the list's first or last item, keep what was selected", () => {
    assert.deepEqual(play(selectionOf([2, 6], 6), [{ kind: 'range', id: 8 }]), ['2,6,7,8 @8']);
    assert.deepEqual(play(selectionOf([2, 6], 6), [{ kind: 'range', id: 1 }]), ['1,2,3,4,5,6 @1']);
    assert.deepEqual(
        play(selectionOf([6], 6), [{ kind: 'range', id: 8 }, up]),
        ['6,7,8 @8', '6,7 @7'],
        'and Shift-Up turns back from there'
    );
});

test('Select All selects every item, the cursor staying, or on the first item when there was none', () => {
    assert.deepEqual(play(selectionOf([5], 5), [{ kind: 'all' }]), ['1,2,3,4,5,6,7,8 @5']);
    assert.deepEqual(play(NONE, [{ kind: 'all' }]), ['1,2,3,4,5,6,7,8 @1']);
    assert.equal(selectionAfter([], NONE, { kind: 'all' }), NONE, 'an empty list');
});

// Ported as it stands from Notebook Navigator's findNextFileAfterRemoval (notes/selection.md): a set with gaps leaves the
// item in its first gap selected, not the one after its last.
test('after a deletion the item kept after the first one deleted is selected, else the nearest before it, else none', () => {
    assert.equal(shown(selectionAfterRemoval(ORDER, new Set([3, 4, 6]))), '5 @5', 'after the first deleted, past the others');
    assert.equal(shown(selectionAfterRemoval(ORDER, new Set([2, 4, 6]))), '3 @3', 'a set with gaps: the item in its first gap');
    assert.equal(shown(selectionAfterRemoval(ORDER, new Set([7, 8]))), '6 @6', 'the last ones: the nearest before');
    assert.equal(shown(selectionAfterRemoval([1, 2], new Set([1, 2]))), ' @none', 'everything');
    assert.equal(shown(selectionAfterRemoval(ORDER, new Set([9]))), ' @none', 'nothing in the list');
});

test('a selection whose items left the list, by an Undo or a collaborator, keeps those still there', () => {
    const state = selectionOf([2, 4, 6], 4);
    assert.equal(reconcileSelection(ORDER, state), state, 'all still there: the same selection');
    assert.equal(shown(reconcileSelection([1, 2, 3, 5, 6, 7, 8], state)), '2,6 @2', "the cursor's item gone: the first selected");
    assert.equal(shown(reconcileSelection([1, 3, 4, 5], state)), '4 @4', 'others gone: the cursor stays');
    assert.equal(shown(reconcileSelection([1, 3], state)), ' @none', 'all gone');
});

test("ids of any kind, such as a list's string ids, select alike", () => {
    const order = ['intro', 'growth', 'costs', 'team'];
    let state = selectionOf<string>([], null);
    for (const action of [
        { kind: 'select', id: 'growth' },
        { kind: 'range', id: 'team' },
        { kind: 'toggle', id: 'costs' }
    ] as const) {
        state = selectionAfter(order, state, action);
    }
    assert.deepEqual([...state.selected].sort(), ['growth', 'team']);
    assert.equal(state.cursor, 'team', "the item taken out wasn't the cursor's, so the cursor stays");
});

test('items moved gather at the line in the order they stood, though it falls among them', () => {
    const order = ['a', 'b', 'c', 'd', 'e'];
    assert.deepEqual(gatheredOrder(order, ['b', 'd'], 'a', 'before'), ['b', 'd', 'a', 'c', 'e']);
    assert.deepEqual(gatheredOrder(order, ['d', 'b'], 'e', 'after'), ['a', 'c', 'e', 'b', 'd'], 'in the order they stood, not as named');
    assert.deepEqual(gatheredOrder(order, ['b', 'd'], 'c', 'after'), ['a', 'c', 'b', 'd', 'e'], 'a line among them gathers them there');
    assert.deepEqual(
        gatheredOrder(order, ['b', 'd'], 'd', 'after'),
        ['a', 'c', 'b', 'd', 'e'],
        'after one of them is after the one not moved before it'
    );
    assert.equal(gatheredOrder(order, ['b'], 'a', 'after'), null, 'where nothing moves');
    assert.equal(gatheredOrder(order, ['b'], 'x', 'after'), null, 'a line at no item');
});

test('items moved step past the one beside them, keeping their gaps, and those at the end stay while the others close up', () => {
    const stepped = (moved: readonly number[], toward: 'up' | 'down') => steppedOrder(ORDER, ORDER, moved, toward)?.join(',') ?? null;
    assert.equal(stepped([2, 4, 7], 'up'), '2,1,4,3,5,7,6,8', 'each moves one place, the gaps between them kept');
    assert.equal(stepped([2, 4, 7], 'down'), '1,3,2,5,4,6,8,7');
    assert.equal(stepped([3, 4], 'down'), '1,2,5,3,4,6,7,8', 'a run steps as one');
    assert.equal(stepped([4, 3], 'up'), '1,3,4,2,5,6,7,8', 'in the order they stand, not as named');
    assert.equal(stepped([1, 3], 'up'), '1,3,2,4,5,6,7,8', 'the first stays at the top, and the other closes up to it');
    assert.equal(stepped([6, 8], 'down'), '1,2,3,4,5,7,6,8');
    assert.equal(stepped([1, 2], 'up'), null, 'nothing moves at the end');
    assert.equal(stepped([7, 8], 'down'), null);
    assert.equal(stepped([], 'up'), null);
    // A list that shows some of its items steps among those, and every other item keeps its place.
    const order = ['a', 'b', 'c', 'd', 'e'];
    const shown = ['a', 'c', 'e'];
    assert.deepEqual(steppedOrder(order, shown, ['c'], 'down'), ['a', 'b', 'e', 'd', 'c']);
    assert.deepEqual(steppedOrder(order, shown, ['c'], 'up'), ['c', 'b', 'a', 'd', 'e']);
    assert.deepEqual(
        steppedOrder(order, shown, ['a', 'e'], 'down'),
        ['c', 'b', 'a', 'd', 'e'],
        'the last stays, and the first steps past the next shown'
    );
    assert.equal(steppedOrder(order, shown, ['e'], 'down'), null, 'at the end');
    assert.equal(steppedOrder(order, shown, ['b'], 'down'), null, "an item not shown doesn't step");
});
