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
import { setIcon } from 'obsidian';
import { uiText } from '../ui-text.ts';
import { writingAreaDecorations } from './field-widgets.ts';
import type { SlideNotes } from './notes.ts';

export interface NotesActions {
    toggle(view: EditorView, slideId: string): void;
    edit(view: EditorView, slideId: string): void;
}

class NotesDisclosure extends WidgetType {
    constructor(
        private readonly slideId: string,
        private readonly open: boolean,
        private readonly missing: boolean,
        private readonly actions: NotesActions
    ) {
        super();
    }
    eq(other: NotesDisclosure): boolean {
        return this.slideId === other.slideId && this.open === other.open && this.missing === other.missing;
    }

    toDOM(view: EditorView): HTMLElement {
        const element = view.dom.ownerDocument.defaultView!.createDiv({ cls: 'markdownpoint-notes', attr: { 'data-slide': this.slideId } });
        const button = element.createEl('button', { cls: 'markdownpoint-notes-toggle', attr: { type: 'button' } });
        button.createSpan({ cls: 'markdownpoint-notes-chevron', attr: { 'aria-hidden': 'true' } });
        button.createSpan({ text: uiText.notes.label });
        button.addEventListener('click', () => this.actions.toggle(view, this.slideId));
        this.updateDOM(element, view);
        return element;
    }

    updateDOM(element: HTMLElement, view: EditorView): boolean {
        if (element.dataset.slide !== this.slideId) return false;
        const button = element.querySelector('.markdownpoint-notes-toggle')!;
        button.setAttribute('aria-expanded', String(this.open));
        setIcon(button.querySelector<HTMLElement>('.markdownpoint-notes-chevron')!, this.open ? 'chevron-down' : 'chevron-right');
        const empty = element.querySelector('.markdownpoint-notes-empty');
        if (!this.open || !this.missing) empty?.remove();
        else if (!empty) {
            const ghost = element.createEl('button', {
                cls: 'markdownpoint-notes-empty',
                text: uiText.notes.placeholder,
                attr: { type: 'button', 'aria-label': uiText.notes.label }
            });
            ghost.addEventListener('click', () => this.actions.edit(view, this.slideId));
        }
        return true;
    }
}

export function notesDecorations(
    state: EditorState,
    slots: readonly SlideNotes[],
    opened: ReadonlySet<string>,
    focused: boolean,
    entryPoints: ReadonlySet<number>,
    actions: NotesActions
): Range<Decoration>[] {
    const ranges: Range<Decoration>[] = [];
    for (const slot of slots) {
        const open = opened.has(slot.slideId);
        const widget = new NotesDisclosure(slot.slideId, open, slot.field === null, actions);
        if (slot.field) {
            ranges.push(
                Decoration.replace({ block: true, inclusiveStart: !entryPoints.has(slot.at), inclusiveEnd: false, widget }).range(
                    slot.at,
                    open ? slot.field.contentFrom : slot.field.to
                )
            );
            if (open) {
                // The disclosure shares a line block with the first note line, which hides that line from Obsidian's per-line text direction.
                if (slot.field.contentFrom < slot.field.to || slot.field.to === state.doc.length) {
                    ranges.push(Decoration.line({ attributes: { dir: 'auto' } }).range(slot.field.contentFrom));
                }
                ranges.push(...writingAreaDecorations(state, slot.field, focused, uiText.notes.label, 'markdownpoint-notes-field'));
            }
        } else ranges.push(Decoration.widget({ block: true, side: slot.at < state.doc.length ? -1 : 1, widget }).range(slot.at));
    }
    return ranges;
}
