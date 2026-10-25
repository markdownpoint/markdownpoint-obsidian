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
import { OutlineSession } from '../src/outline/session.ts';
import type { OutlinePresentation } from '../src/outline/model.ts';

function deck(ids: readonly string[], path = 'presentation/slides.md'): OutlinePresentation {
    return {
        documentId: 'test-document',
        path,
        sections: [],
        slides: ids.map((id, index) => ({ id, title: id, line: index * 8, skipped: false }))
    };
}

test('modifier selection uses MDP rules while the writing slide stays in place', () => {
    const session = new OutlineSession();
    session.follow(deck(['one', 'two', 'three', 'four', 'five']));
    assert.equal(session.state.activeSlideId, 'one');
    session.select({ kind: 'range', id: 'three' });
    session.select({ kind: 'toggle', id: 'five' });
    assert.deepEqual([...session.state.selection.selected], ['one', 'two', 'three', 'five']);
    assert.equal(session.state.selection.cursor, 'five');
    assert.equal(session.state.activeSlideId, 'one');
    session.select({ kind: 'step', to: 'four' });
    assert.equal(session.state.selection.cursor, 'one', 'the cursor jumps the selected run');
    session.select({ kind: 'step', to: 'two' });
    assert.deepEqual([...session.state.selection.selected].sort(), ['five', 'four', 'three', 'two']);
    assert.equal(session.state.activeSlideId, 'one');
    session.select({ kind: 'select', id: 'four' });
    assert.deepEqual([...session.state.selection.selected], ['four']);
    assert.equal(session.state.activeSlideId, 'four');
});

test('caret movement and content updates preserve the selected group and selection cursor', () => {
    const session = new OutlineSession();
    session.follow(deck(['one', 'two', 'three']));
    session.select({ kind: 'toggle', id: 'three' });
    const selection = session.state.selection;
    assert.equal(session.activate('two'), true);
    assert.equal(session.state.selection, selection);
    const edited = deck(['one', 'two', 'three']);
    session.follow({ ...edited, slides: edited.slides.map(slide => ({ ...slide, title: 'Edited words', line: slide.line + 4 })) });
    assert.equal(session.state.activeSlideId, 'two');
    assert.equal(session.state.selection, selection);
    assert.equal(session.state.presentation?.slides[1]?.title, 'Edited words');
});

test('external removal and reorder reconcile stable IDs without selecting section rows', () => {
    const session = new OutlineSession();
    const presentation = deck(['one', 'two', 'three', 'four']);
    session.follow({ ...presentation, sections: [{ id: 'section', title: 'Section', line: 0 }] });
    session.select({ kind: 'all' });
    assert.deepEqual([...session.state.selection.selected], ['one', 'two', 'three', 'four']);
    session.select({ kind: 'toggle', id: 'three' });
    session.follow(deck(['four', 'two']));
    assert.deepEqual([...session.state.selection.selected], ['two', 'four']);
    assert.equal(session.state.selection.cursor, 'four');
    assert.equal(session.state.activeSlideId, 'four');
    session.follow(deck(['new']));
    assert.deepEqual([...session.state.selection.selected], ['new']);
    assert.equal(session.state.selection.cursor, 'new');
});

test('another presentation starts a fresh selection even when slide IDs are shared', () => {
    const session = new OutlineSession();
    session.follow(deck(['one', 'two']));
    session.select({ kind: 'all' });
    session.activate('two');
    session.follow(deck(['one', 'two'], 'another/slides.md'));
    assert.deepEqual([...session.state.selection.selected], ['one']);
    assert.equal(session.state.activeSlideId, 'one');
    session.follow(null);
    assert.equal(session.state.selection.cursor, null);
    assert.equal(session.state.selection.selected.size, 0);
    assert.equal(session.state.activeSlideId, null);
});

test('missing targets and an empty presentation cannot create stale selections', () => {
    const session = new OutlineSession();
    session.follow(deck(['one']));
    const state = session.state;
    assert.equal(session.select({ kind: 'range', id: 'missing' }), false);
    assert.equal(session.select({ kind: 'step', to: 'missing' }), false);
    assert.equal(session.activate('missing'), false);
    assert.equal(session.state, state);
    session.follow(deck([]));
    assert.equal(session.select({ kind: 'all' }), false);
    assert.equal(session.state.selection.selected.size, 0);
    assert.equal(session.state.selection.cursor, null);
});

test('a menu retains a selected group and selects another row without moving the writing location', () => {
    const session = new OutlineSession();
    session.follow(deck(['one', 'two', 'three']));
    session.select({ kind: 'toggle', id: 'three' });
    const selected = session.state.selection;
    assert.ok(session.selectForMenu('three'));
    assert.equal(session.state.selection, selected);
    assert.ok(session.selectForMenu('two'));
    assert.deepEqual([...session.state.selection.selected], ['two']);
    assert.equal(session.state.activeSlideId, 'one');
});

test('replacing a presentation at the same path invalidates a captured action selection', () => {
    const session = new OutlineSession();
    const original = deck(['one', 'two']);
    session.follow(original);
    session.selectForMenu('two');
    const captured = session.state.selection;
    session.follow({ ...original, documentId: 'another-document' });
    assert.notEqual(session.state.selection, captured);
    assert.equal(session.state.selection.cursor, 'one');
});

test('deletion selects the next surviving slide while preserving an independent writing slide', () => {
    const session = new OutlineSession();
    session.follow(deck(['one', 'two', 'three', 'four']));
    session.selectForMenu('two');
    session.select({ kind: 'range', id: 'three' });
    session.follow(deck(['one', 'four']));
    assert.deepEqual([...session.state.selection.selected], ['four']);
    assert.equal(session.state.activeSlideId, 'one');
    session.activate('four');
    session.follow(deck(['one']));
    assert.equal(session.state.selection.cursor, 'one');
    assert.equal(session.state.activeSlideId, 'one');
    session.follow(deck([]));
    assert.equal(session.state.selection.cursor, null);
    assert.equal(session.state.activeSlideId, null);
});
