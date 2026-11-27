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
import { EditorSelection, EditorState, StateEffect } from '@codemirror/state';
import type { TransactionSpec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { codeFolding, foldEffect } from '@codemirror/language';
import { editorInfoField, editorLivePreviewField } from './support/obsidian.ts';
import { indexPresentation } from '../src/format/document.ts';
import { isRecord } from '../src/format/recognition.ts';
import { slideNotes } from '../src/editor/notes.ts';
import { notesDecorations } from '../src/editor/notes-widgets.ts';
import { PresentationEditor } from '../src/editor/presentation-editor.ts';
import { NotesUi } from '../src/settings/notes-ui.ts';
import type { PresentationReader } from '../src/presentation/reader.ts';

/** Where the notes decorations let a line take the direction of its own text. */
function autoDirectionLines(markdown: string, open: boolean): number[] {
    const slots = slideNotes(markdown, indexPresentation(markdown, 0)!, 'Notes');
    const opened = new Set(open ? slots.map(slot => slot.slideId) : []);
    const actions = { toggle: () => undefined, edit: () => undefined };
    return notesDecorations(EditorState.create({ doc: markdown }), slots, opened, false, new Set(), actions, new Set())
        .filter(range => {
            const spec: unknown = range.value.spec;
            return isRecord(spec) && isRecord(spec.attributes) && spec.attributes.dir === 'auto';
        })
        .map(range => range.from);
}

test("an open note's first line takes its own text direction beside the hidden notes marker", () => {
    const markdown =
        '<!-- slide: first -->\n<!-- text: title -->\nIdea.\n<!-- notes -->\nPause here.\nThen go on.\n<!-- slide: second -->\n';
    assert.deepEqual(autoDirectionLines(markdown, true), [markdown.indexOf('Pause here.')]);
    assert.deepEqual(autoDirectionLines(markdown, false), []);
    assert.deepEqual(autoDirectionLines('<!-- slide: first -->\n<!-- notes -->\n<!-- slide: second -->\n', true), []);
});

/** The draft's presenter notes rows; the widget class is internal to the editor. */
function notesRows(state: EditorState): number {
    let rows = 0;
    for (const decorations of state.facet(EditorView.decorations)) {
        if (typeof decorations === 'function') continue;
        for (const cursor = decorations.iter(); cursor.value; cursor.next()) {
            const spec: unknown = cursor.value.spec;
            if (isRecord(spec) && spec.widget?.constructor.name === 'NotesDisclosure') rows++;
        }
    }
    return rows;
}

/** The editor over `source` in Live Preview, reading it as MarkdownPoint does. */
function presentationState(source: string, notes: NotesUi): EditorState {
    const reader = {
        snapshot(_file: unknown, markdown: string) {
            const document = indexPresentation(markdown, 0);
            return (
                document && {
                    id: 'presentation',
                    bodyStart: 0,
                    document,
                    images: new Map(),
                    placeholders: new Map(),
                    outline: { slides: document.slides.map(slide => ({ id: slide.id, skipped: false })), sections: [] }
                }
            );
        },
        matchesIdentity: () => true
    } as unknown as PresentationReader;
    const owner = new PresentationEditor(reader, notes, () => undefined);
    return EditorState.create({ doc: source, extensions: [editorInfoField, editorLivePreviewField, owner.extension] });
}

const closedNotesUi = () => new NotesUi({ loadLocalStorage: () => null, saveLocalStorage: () => undefined });

test('slides without notes keep their notes row while an unclosed fence stops parsing', () => {
    const source = '<!-- slide: first -->\n<!-- text: body -->\nWords.\n\n<!-- slide: second -->\n<!-- text: body -->\nMore.\n';
    let state = presentationState(source, closedNotesUi());
    assert.equal(notesRows(state), 2);
    state = state.update({ changes: { from: source.indexOf('Words.'), insert: '~~~js\n' } }).state;
    assert.equal(indexPresentation(state.doc.toString(), 0), null);
    assert.equal(notesRows(state), 2);
});

test("the author's keys and pointer stop on the last line shown, not at the file's end inside closed notes", () => {
    const first = '<!-- slide: first -->\n<!-- text: title -->\nIdea.\n\n';
    const source = `${first}<!-- slide: last -->\n<!-- text: body -->\nLast words.\n\n<!-- notes -->\nPause.\n`;
    const end = source.indexOf('Last words.') + 'Last words.'.length;
    const notes = closedNotesUi();
    let state = presentationState(source, notes);
    const at = (spec: TransactionSpec) => state.update(spec).state.selection.main;
    for (const userEvent of ['select', 'select.pointer']) assert.equal(at({ selection: { anchor: source.length }, userEvent }).head, end);
    // Right past the words: the folded blank line and the notes' row are no stops either
    for (const anchor of [end + 1, source.indexOf('<!-- notes -->')])
        assert.equal(at({ selection: { anchor }, userEvent: 'select' }).head, end);
    // Up from there goes back to the column Down left
    const down = at({ selection: EditorSelection.create([EditorSelection.cursor(source.length, 0, undefined, 37)]), userEvent: 'select' });
    assert.deepEqual([down.head, down.goalColumn], [end, 37]);
    // A selection that runs through the notes, as Select All's, keeps them; the editor's own caret goes where it is put
    assert.equal(at({ selection: { anchor: 0, head: source.length }, userEvent: 'select' }).head, source.length);
    assert.equal(at({ selection: { anchor: source.length } }).head, source.length);
    notes.setOpen('presentation', 'last', true);
    state = state.update({ selection: { anchor: 0 } }).state;
    assert.equal(at({ selection: { anchor: source.length }, userEvent: 'select' }).head, source.length);
    // The last line shown: an empty field's ghost line; a compact field's ghost, which the keys enter by giving it its
    // line; the blank line a field shows, not the one it folds; the blank line under a section's heading, above a slide
    // of notes alone
    const title = `${first}<!-- slide: last -->\n<!-- text: title -->\nLast words.\n\n`;
    const part = `<!-- section: one -->\n# One\n\n${first}<!-- section: part -->\n# Part\n\n`;
    for (const [above, landing] of [
        [`${title}<!-- text: body -->\n\n`, `${title}<!-- text: body -->\n`.length],
        [`${title}<!-- text: body -->\n`, `${title}<!-- text: body -->\n`.length],
        [`${title}\n`, title.length - '\n'.length],
        [`${part}<!-- slide: last -->\n\n`, `${part.trimEnd()}\n`.length]
    ] as const) {
        const markdown = `${above}<!-- notes -->\nPause.\n`;
        state = presentationState(markdown, closedNotesUi());
        assert.equal(at({ selection: { anchor: markdown.length }, userEvent: 'select' }).head, landing, above);
    }
    // Right from the title's words reaches the compact field past the hidden stops between, and gives it its line
    const compact = `${title}<!-- text: body -->\n<!-- notes -->\nPause.\n`;
    state = presentationState(compact, closedNotesUi());
    assert.equal(at({ selection: { anchor: title.length - 1 }, userEvent: 'select' }).head, title.length - 1);
    const entered = state.update({ selection: { anchor: compact.indexOf('<!-- notes -->') }, userEvent: 'select' }).state;
    assert.equal(entered.doc.toString(), compact.replace('-->\n<!-- notes', '-->\n\n<!-- notes'));
    // A click, which gives no compact field its line, stops on the title's words
    assert.equal(at({ selection: { anchor: compact.length }, userEvent: 'select.pointer' }).head, title.length - '\n\n'.length);
    // A compact field a fold hides is passed: the keys stop on the folded heading's line
    const hidden = `${first}<!-- slide: last -->\n<!-- text: title -->\n## Steps\nOne.\n\n<!-- text: body -->\n<!-- notes -->\nPause.\n`;
    const steps = hidden.indexOf('## Steps') + '## Steps'.length;
    state = presentationState(hidden, closedNotesUi());
    state = state.update({ effects: StateEffect.appendConfig.of(codeFolding()) }).state;
    state = state.update({ effects: foldEffect.of({ from: steps, to: hidden.length }) }).state;
    assert.equal(at({ selection: { anchor: hidden.length }, userEvent: 'select' }).head, steps);
    // A heading folded to the end of the file keeps its fold: the keys stop on its line
    const folded = `${first}<!-- slide: last -->\n<!-- text: body -->\n## Steps\nOne.\nTwo.\n\n<!-- notes -->\nPause.\n`;
    const heading = folded.indexOf('## Steps') + '## Steps'.length;
    state = presentationState(folded, closedNotesUi());
    state = state.update({ effects: StateEffect.appendConfig.of(codeFolding()) }).state;
    state = state.update({ effects: foldEffect.of({ from: heading, to: folded.length }) }).state;
    assert.equal(at({ selection: { anchor: folded.length }, userEvent: 'select' }).head, heading);
});
