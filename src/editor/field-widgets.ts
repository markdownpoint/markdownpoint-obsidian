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

import type { EditorState, Range } from '@codemirror/state';
import { Decoration, WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import type { WritingField } from './writing-fields.ts';

export function focusWritingField(view: EditorView, field: WritingField): void {
    const position = field.contentFrom;
    const compact = position === field.to && field.to < view.state.doc.length;
    if (compact) insertWritingBlock(view, { from: position - 1, insert: '\n', cursor: position });
    else {
        view.dispatch({ selection: { anchor: position } });
        view.focus();
    }
}

export function insertWritingBlock(view: EditorView, insertion: { from: number; insert: string; cursor: number }): void {
    // Native history maps this insertion caret on redo. The previous caret may
    // belong to another field or hidden presentation metadata.
    view.dispatch({ selection: { anchor: insertion.from } });
    view.dispatch({ changes: { from: insertion.from, insert: insertion.insert }, selection: { anchor: insertion.cursor } });
    view.focus();
}

class FieldHeader extends WidgetType {
    constructor(
        private readonly label: string,
        private readonly populated: boolean,
        private readonly reveal: boolean,
        private readonly opening: boolean
    ) {
        super();
    }
    eq(other: FieldHeader): boolean {
        return this.label === other.label && this.populated === other.populated && this.opening === other.opening;
    }
    toDOM(view: EditorView): HTMLElement {
        const element = view.dom.ownerDocument.defaultView!.createDiv({
            cls: [
                'markdownpoint-field-header',
                ...(this.populated ? [] : ['is-empty']),
                ...(this.reveal ? ['is-revealing'] : []),
                ...(this.opening ? ['is-opening'] : [])
            ]
        });
        element.createDiv({ cls: 'markdownpoint-field-label', text: this.label });
        return element;
    }
}

class FieldGhost extends WidgetType {
    constructor(
        private readonly field: WritingField,
        private readonly compact: boolean,
        private readonly extraClass = ''
    ) {
        super();
    }
    eq(other: FieldGhost): boolean {
        return (
            this.field.label === other.field.label &&
            this.field.contentFrom === other.field.contentFrom &&
            this.compact === other.compact &&
            this.extraClass === other.extraClass
        );
    }
    toDOM(view: EditorView): HTMLElement {
        const element = view.dom.ownerDocument.defaultView!.createSpan({
            cls: [
                'markdownpoint-field-ghost',
                `markdownpoint-field-${this.field.role}`,
                ...(this.compact ? ['is-compact'] : []),
                ...(this.extraClass ? [this.extraClass] : [])
            ],
            text: this.field.label,
            attr: { 'aria-hidden': 'true' }
        });
        element.addEventListener('mousedown', event => {
            if (event.button !== 0) return;
            event.preventDefault();
            // A compact empty block needs one native blank line for its caret. No
            // placeholder words are inserted, and the edit uses normal history.
            focusWritingField(view, this.field);
        });
        return element;
    }
}

export function fieldDecorations(
    state: EditorState,
    fields: readonly WritingField[],
    previous: readonly WritingField[],
    focused: boolean,
    entryPoints: ReadonlySet<number>
): Range<Decoration>[] {
    const ranges: Range<Decoration>[] = [];
    const prior = new Map(previous.map(field => [field.key, field]));
    for (const field of fields) {
        const old = prior.get(field.key);
        ranges.push(
            Decoration.replace({
                block: true,
                inclusiveStart: !entryPoints.has(field.from),
                widget: new FieldHeader(field.label, field.populated, old?.populated === false && field.populated, field.opening)
            }).range(field.from, state.doc.lineAt(field.from).to)
        );
        ranges.push(...writingAreaDecorations(state, field, focused));
    }
    return ranges;
}

export function writingAreaDecorations(
    state: EditorState,
    field: WritingField,
    focused: boolean,
    accessibleName = field.label,
    extraClass = ''
): Range<Decoration>[] {
    const ranges: Range<Decoration>[] = [];
    const cursor = state.selection.main.head;
    const compact = field.contentFrom === field.to && field.to < state.doc.length;
    const active = focused && cursor >= field.contentFrom && (cursor < field.to || (field.to === state.doc.length && cursor === field.to));
    const collapsedFrom =
        field.contentTo > field.contentFrom && field.contentTo < field.to && state.doc.lineAt(field.contentTo).from === field.contentTo
            ? field.contentTo
            : field.to;
    if (collapsedFrom < field.to) {
        ranges.push(Decoration.replace({ block: true, inclusiveEnd: false }).range(collapsedFrom, field.to));
    }
    if (!field.populated && !active)
        ranges.push(
            Decoration.widget({
                widget: new FieldGhost(field, compact, compact ? extraClass : ''),
                block: compact,
                side: compact ? -2 : 1
            }).range(field.contentFrom)
        );
    if (!compact) {
        for (let number = state.doc.lineAt(field.contentFrom).number; number <= state.doc.lines; number++) {
            const line = state.doc.line(number);
            if (line.from > field.to || (line.from === field.to && field.to !== state.doc.length)) break;
            if (line.from >= collapsedFrom && line.from < field.to) continue;
            const terminal =
                line.from === field.to &&
                line.from > field.contentFrom &&
                !(focused && state.selection.ranges.some(range => range.from <= line.to && range.to >= line.from));
            ranges.push(
                Decoration.line({
                    class: `markdownpoint-writing-field markdownpoint-field-${field.role} ${extraClass}${terminal ? ' markdownpoint-terminal-line' : ''}`,
                    ...(line.from === field.contentFrom ? { attributes: { 'aria-label': accessibleName } } : {})
                }).range(line.from)
            );
        }
    }
    return ranges;
}
