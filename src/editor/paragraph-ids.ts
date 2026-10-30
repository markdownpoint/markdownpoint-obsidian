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

import { EditorState } from '@codemirror/state';
import type { ChangeSpec, Extension, Text, Transaction } from '@codemirror/state';
import { Decoration, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { blockTokens } from '../format/block-grammar.ts';
import type { PresentationDocument } from '../format/document.ts';
import { wordFields } from './span-marks.ts';

/**
 * A paragraph's id at the end of its last line: the id a step's paragraph cue names it by, read as MarkdownPoint reads
 * it, with any spaces or tabs around and inside the comment.
 */
const PARAGRAPH_ID = /<!--[ \t]*id:[ \t]*([a-z](?:[a-z0-9]|-(?!-))*[a-z0-9]|[a-z])[ \t]*-->[ \t]*$/;
const hiddenId = Decoration.replace({});

/**
 * The id a line of words ends with, and its comment from the spaces and tabs before it, or null: a comment alone on its
 * line is a note, and one after a backslash is words.
 */
function idOnLine(text: string): { id: string; comment: string; index: number } | null {
    const id = PARAGRAPH_ID.exec(text);
    if (!id) return null;
    let slashes = 0;
    while (text[id.index - 1 - slashes] === '\\') slashes++;
    let index = id.index;
    while (index > 0 && (text[index - 1] === ' ' || text[index - 1] === '\t')) index--;
    return slashes % 2 === 0 && /\S/.test(text.slice(0, index)) ? { id: id[1]!, comment: text.slice(index), index } : null;
}
/** Where each line of a presentation's words ends with a paragraph's id. */
export function paragraphIds(state: EditorState, document: PresentationDocument): { from: number; to: number }[] {
    const ids: { from: number; to: number }[] = [];
    for (const field of wordFields(document)) {
        if (field.to <= field.from) continue;
        for (let line = state.doc.lineAt(field.from); ; line = state.doc.line(line.number + 1)) {
            const id = idOnLine(line.text);
            if (id) ids.push({ from: line.from + id.index, to: line.to });
            if (line.to >= field.to || line.number === state.doc.lines) break;
        }
    }
    return ids;
}

/**
 * Hide each paragraph's id, which says nothing to a reader, as Live Preview hides a line's marks: a line that holds the
 * caret or a selection shows it.
 */
export function paragraphIdDecorations(state: EditorState, ids: readonly { from: number; to: number }[]): DecorationSet {
    return Decoration.set(
        ids.flatMap(id => {
            const line = state.doc.lineAt(id.from);
            return state.selection.ranges.some(range => range.from <= line.to && range.to >= line.from)
                ? []
                : [hiddenId.range(id.from, id.to)];
        })
    );
}

/** A span of the words. */
interface Range {
    from: number;
    to: number;
}

/** A block of words, from its first line's start to its last line's end: where its words start, and whether it has any. */
interface Block extends Range {
    start: number;
    words: boolean;
}

/** A token the block grammar reads, as far as the blocks of words need. */
interface WordToken {
    type: string;
    raw: string;
    text?: string;
    tokens?: WordToken[];
    items?: WordToken[];
}

const linesIn = (raw: string): number => raw.split('\n').length - 1;

/** A task's box at the start of its words, as a loose list's paragraph keeps it. */
const TASK = /^\[[ xX]\](?:[ \t]+|$)/;

/** Where a line's words start from `at`, past the spaces and tabs of an indent. */
function startOf(line: string, at: number): number {
    while (at < line.length && (line[at] === ' ' || line[at] === '\t')) at++;
    return at;
}

/**
 * The blocks of words of the lines from `from` up to `to`, as the block grammar reads them: each heading, paragraph and
 * list item's opening words, in quotes and list items too, and never code. A token's lines stand as the words' lines do,
 * a quote's marks and an item's indent taken off each, so each block is the lines its token reads. Null where a token's
 * first line is not the words' line it should stand on: those words are not read.
 */
function blocksOf(doc: Text, from: number, to: number): Block[] | null {
    const blocks: Block[] = [];
    if (to <= from) return blocks;
    const first = doc.lineAt(from);
    let read = true;
    const walk = (tokens: readonly WordToken[], line: number): void => {
        for (const token of tokens) {
            if (token.type === 'paragraph' || token.type === 'heading' || token.type === 'text') {
                // A heading underlined with `===` or `---` ends on its words' line, the underline after it.
                const last = line + linesIn(token.type === 'heading' ? (token.text ?? '') : token.raw.trimEnd());
                const source = doc.line(Math.min(line, doc.lines));
                const firstLine = token.raw.split('\n')[0]!;
                // Where the grammar has normalized away a line, as a quote's whitespace can, the lines are not the words'.
                read &&= last <= doc.lines && source.text.trimEnd().endsWith(firstLine.trimEnd());
                if (!read) return;
                const text = (token.text ?? '').split('\n')[0]!;
                // The token reads its first line with a quote's marks and an item's marker and indent taken off, and its
                // words start where its text does in that, past a task's box, which a loose list's text keeps.
                const prefix = Math.max(0, source.length - firstLine.length);
                const box = TASK.exec(text)?.[0].length ?? 0;
                blocks.push({
                    from: source.from,
                    to: doc.line(last).to,
                    start: source.from + startOf(source.text, Math.min(source.length, prefix + Math.max(0, firstLine.indexOf(text)) + box)),
                    // A paragraph of a line break alone is an empty one.
                    words: /\S/.test((token.text ?? '').replace(TASK, '').replace(/<!--[\s\S]*?-->|<br[ \t]*\/?>/gi, ''))
                });
            } else if (token.type === 'blockquote') walk(token.tokens ?? [], line);
            else if (token.type === 'list') {
                let item = line;
                for (const each of token.items ?? []) {
                    walk(each.tokens ?? [], item);
                    item += linesIn(each.raw);
                }
            }
            line += linesIn(token.raw);
        }
    };
    walk(blockTokens(doc.sliceString(first.from, to)), first.number);
    return read ? blocks : null;
}

/** The block of `blocks`, in order, holding `at`. */
function blockAt(blocks: readonly Block[], at: number): number {
    let low = 0;
    let high = blocks.length - 1;
    while (low <= high) {
        const middle = (low + high) >> 1;
        const block = blocks[middle]!;
        if (at < block.from) high = middle - 1;
        else if (at > block.to) low = middle + 1;
        else return middle;
    }
    return -1;
}

/** The id ending a block's last line, and its comment as written, the spaces before it included. */
function idOf(doc: Text, block: Block): { id: string; comment: string; from: number; to: number } | null {
    const line = doc.lineAt(block.to);
    const id = idOnLine(line.text);
    return id ? { id: id.id, comment: id.comment, from: line.from + id.index, to: line.to } : null;
}

/** What Obsidian writes for Enter in a block: a line break, and the marks that carry a quote or a list on. */
const SPLIT = /^\n(?:[ \t]*>)*[ \t]*(?:(?:[*+-]|\d{1,9}[.)])[ \t]+(?:\[[ xX]\][ \t]+)?)?$/;
/** What it deletes for Backspace or Delete between two blocks: a line break, or an item's marker. */
const JOIN = /^(?:\n|(?:[ \t]*>)*[ \t]*(?:[*+-]|\d{1,9}[.)])[ \t]+(?:\[[ xX]\][ \t]+)?)$/;

/** An id's comment as it was written, read where it stands in `doc`. */
function commentAt(doc: Text, from: number, comment: string): Range | null {
    const at = doc.sliceString(from, from + comment.length) === comment ? from : -1;
    return at < 0 ? null : { from: at, to: at + comment.length };
}

/**
 * The changes that keep a paragraph's id as MarkdownPoint does when the whole edit is Enter in the middle of a block's
 * words, which leaves the id on the first part, or a join of two adjacent blocks, which keeps the first one's and drops
 * the second's. Any other edit, or one of these mixed with another change, leaves the ids as the author's words do.
 */
function gestureChanges(transaction: Transaction, document: PresentationDocument): ChangeSpec[] {
    const before = transaction.startState.doc;
    const after = transaction.newDoc;
    const edits: Array<{ fromA: number; toA: number; inserted: string }> = [];
    transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => edits.push({ fromA, toA, inserted: inserted.toString() }));
    const edit = edits.length === 1 ? edits[0]! : null;
    if (!edit) return [];
    const deleted = before.sliceString(edit.fromA, edit.toA);
    const split = !deleted && SPLIT.test(edit.inserted);
    if (!split && !(!edit.inserted && JOIN.test(deleted))) return [];
    const field = wordFields(document).find(each => each.from <= edit.fromA && edit.toA <= each.to);
    if (!field) return [];
    const old = blocksOf(before, field.from, field.to);
    const blocks = blocksOf(after, transaction.changes.mapPos(field.from, -1), transaction.changes.mapPos(field.to, 1));
    if (!old || !blocks) return [];
    const map = (at: number, side: -1 | 1): number => transaction.changes.mapPos(at, side);
    if (split) {
        // The block whose words the line break stands among, before its id: its first part keeps the id.
        const block = old.find(each => each.start < edit.fromA && edit.fromA <= each.to);
        const id = block?.words ? idOf(before, block) : null;
        if (!block || !id || edit.fromA > id.from) return [];
        const first = blockAt(blocks, map(block.start, -1));
        const moved = commentAt(after, map(id.from, 1), id.comment);
        if (first < 0 || !blocks[first]!.words || !moved || blockAt(blocks, moved.from) === first) return [];
        return [
            { from: blocks[first]!.to, insert: ` <!-- id: ${id.id} -->` },
            { from: moved.from, to: moved.to }
        ];
    }
    // The two blocks the deletion stands between, now one: it keeps the first one's id, or none where that had none.
    const at = old.findIndex((each, index) => index > 0 && old[index - 1]!.start <= edit.fromA && edit.toA <= each.start);
    if (at < 1) return [];
    const [first, second] = [old[at - 1]!, old[at]!];
    const joined = blockAt(blocks, map(first.start, -1));
    if (joined < 0 || joined !== blockAt(blocks, map(second.start, 1))) return [];
    const kept = first.words ? idOf(before, first) : null;
    const dropped = second.words ? idOf(before, second) : null;
    const changes: ChangeSpec[] = [];
    const keptAt = kept && commentAt(after, map(kept.from, 1), kept.comment);
    if (keptAt) changes.push({ from: keptAt.from, to: keptAt.to });
    const droppedAt = dropped && commentAt(after, map(dropped.from, 1), dropped.comment);
    const comment = kept ? ` <!-- id: ${kept.id} -->` : '';
    if (droppedAt) changes.push({ from: droppedAt.from, to: droppedAt.to, insert: comment });
    else if (comment) changes.push({ from: blocks[joined]!.to, insert: comment });
    return changes;
}

/**
 * Keeps each paragraph's id as MarkdownPoint does while the author presses Enter in a block's words or joins two blocks by
 * Backspace or Delete, for the presentation `document` reads from the editor's state. Undo and Redo bring back the words
 * as they were, ids and all, and words read anew, as a file changed elsewhere, keep theirs.
 */
export function keptParagraphIds(document: (state: EditorState) => PresentationDocument | null): Extension {
    return EditorState.transactionFilter.of(transaction => {
        // Typing and deleting alone: a paste, a drop or a cut is the author's words as they come.
        const keyed =
            (transaction.isUserEvent('input') && !transaction.isUserEvent('input.paste') && !transaction.isUserEvent('input.drop')) ||
            (transaction.isUserEvent('delete') && !transaction.isUserEvent('delete.cut'));
        if (!transaction.docChanged || !keyed) return transaction;
        const presentation = document(transaction.startState);
        const changes = presentation ? gestureChanges(transaction, presentation) : [];
        return changes.length ? [transaction, { changes, sequential: true }] : transaction;
    });
}

/** Live Preview's hidden paragraph ids, for the presentation `document` reads from the editor's state. */
export function paragraphIdMarks(document: (state: EditorState) => PresentationDocument | null): Extension {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet = Decoration.none;
            private document: PresentationDocument | null = null;
            private ids: readonly { from: number; to: number }[] = [];

            constructor(view: EditorView) {
                this.refresh(view.state, true);
            }

            update(update: ViewUpdate): void {
                const reread = update.docChanged || document(update.state) !== this.document;
                if (reread || update.selectionSet) this.refresh(update.state, reread);
            }

            private refresh(state: EditorState, reread: boolean): void {
                if (reread) {
                    this.document = document(state);
                    this.ids = this.document ? paragraphIds(state, this.document) : [];
                }
                this.decorations = paragraphIdDecorations(state, this.ids);
            }
        },
        { decorations: value => value.decorations }
    );
}
