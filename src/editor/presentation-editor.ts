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

import { Annotation, ChangeSet, EditorSelection, StateEffect, StateField, EditorState, Transaction } from '@codemirror/state';
import type { Extension, TransactionSpec } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, MouseSelectionStyle } from '@codemirror/view';
import { Component, MarkdownView, editorInfoField, editorLivePreviewField } from 'obsidian';
import type { Editor, TFile } from 'obsidian';
import type { PresentationReader, PresentationSnapshot } from '../presentation/reader.ts';
import type { SlideImagePreview } from '../presentation/image-reader.ts';
import { imageSpacing, ImageSpace } from './image-spacing.ts';
import { slideThumbnails } from './thumbnail-widgets.ts';
import { keptParagraphIds, paragraphIdMarks } from './paragraph-ids.ts';
import { spanMarks } from './span-marks.ts';
import type { SlideStructure } from '../format/structure.ts';
import { outlineSlideNumbers } from '../outline/model.ts';
import { uiNumber, uiText } from '../ui-text.ts';
import { boundaryChangesAllowed, slideStructureChange } from './boundary-protection.ts';
import { compactFieldAt, missingPlaceholders, validatedPlaceholderInsertion, writingFields } from './writing-fields.ts';
import type { MissingPlaceholder, WritingField } from './writing-fields.ts';
import {
    blankFold,
    selectionOnBlank,
    fieldDecorations,
    focusWritingField,
    insertWritingBlock,
    missingFieldDecorations
} from './field-widgets.ts';
import { validatedNotesInsertion, slideNotes } from './notes.ts';
import type { SlideNotes } from './notes.ts';
import { notesDecorations } from './notes-widgets.ts';
import type { NotesActions } from './notes-widgets.ts';
import type { NotesUi } from '../settings/notes-ui.ts';
import { payloadContentEnd } from '../format/payload.ts';
import { indexPresentation, slideAtPosition } from '../format/document.ts';
import type { DocumentSlide } from '../format/document.ts';
import { historyReorderSelection, slideReorderTransaction } from './reorder.ts';
import type { SlideReorder } from '../format/reorder.ts';
import { undo, redo } from '@codemirror/commands';
import type { SlideData } from '../presentation/slide-data.ts';
import { planSlideDeletion } from '../format/delete.ts';
import { slideDeletionTransaction } from './delete.ts';
import { historyBoundarySelection, slideEditTransactions } from './structural-history.ts';
import { planSlideInsertion } from '../format/insert.ts';
import type { PreparedPart } from '../format/insert.ts';
import { slideInsertionTransaction } from './insert.ts';
import {
    compositionTakeBack,
    compositionWrite,
    heldOpenings,
    holdsOpening,
    inOpening,
    keepsStructure,
    openingEntry,
    openingWrite
} from './openings.ts';
import type { OpeningWrite } from './openings.ts';
import { aboveRule, slideForGap } from './menu-target.ts';

const refreshPresentation = StateEffect.define<boolean>();
// Words typed on a slide's line went into its presenter notes, which the draft then shows open
const wroteNotes = Annotation.define<boolean>();
const editorFocus = StateEffect.define<boolean>();
const noImageSpaces: ReadonlyMap<string, number> = new Map();

interface DraftState {
    readonly empty: boolean;
    readonly id: string | null;
    readonly snapshot: PresentationSnapshot | null;
    readonly markers: readonly DraftMarker[];
    readonly decorations: DecorationSet;
    readonly fields: readonly WritingField[];
    readonly missing: readonly MissingPlaceholder[];
    readonly notes: readonly SlideNotes[];
    readonly openedNotes: ReadonlySet<string>;
    readonly focused: boolean;
    readonly showImages: boolean;
    readonly imageSpaces: ReadonlyMap<string, number>;
    /** The organizational blank lines an edit left a caret on, by where each starts: shown until the caret leaves. */
    readonly openBlanks: ReadonlySet<number>;
    /** The openings the boundaries hold, by slide, with where each line ends. */
    readonly openings: ReadonlyMap<string, number>;
    /** Each opening a boundary holds, with its line break: source the draft hides, which the caret passes over. */
    readonly hidden: DecorationSet;
}

interface DraftMarker {
    readonly from: number;
    readonly markerTo: number;
    readonly text: string;
    readonly label: string | null;
    readonly slideId?: string;
    readonly structure?: SlideStructure | null;
    readonly images?: readonly SlideImagePreview[];
    readonly slideTo?: number;
    /** A later minor's marker, which edits never cross or enter, shown as written with its block. */
    readonly kept?: true;
}

/** A composition an input method began in the block its key wrote on a slide's line, until it is settled. */
interface OpeningComposition {
    readonly write: OpeningWrite;
    /** Where the block's marker starts, and where what the author's input wrote after it ends. */
    from: number;
    to: number;
    bodyStart: number;
    /** Closed notes the key opened, which close again if the composition leaves them nothing. */
    readonly opened: { readonly id: string; readonly slideId: string } | null;
}

/** A press with the primary button alone, once, which a slide's boundary takes. */
function plainPress(event: MouseEvent): boolean {
    return event.button === 0 && event.detail <= 1 && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
}

class SlideBoundary extends WidgetType {
    constructor(
        private readonly label: string,
        private readonly slideId?: string,
        // The boundary holds the blank line between the marker and the first block, its height included
        private readonly opening = false
    ) {
        super();
    }
    eq(other: SlideBoundary): boolean {
        return this.label === other.label && this.slideId === other.slideId && this.opening === other.opening;
    }
    toDOM(view: EditorView): HTMLElement {
        const element = view.dom.ownerDocument.defaultView!.createDiv({
            cls: ['markdownpoint-slide-boundary', ...(this.opening ? ['holds-opening'] : [])]
        });
        if (this.slideId) element.dataset.slide = this.slideId;
        element.createSpan({ text: this.label, cls: 'markdownpoint-slide-number' });
        return element;
    }
    // A plain press reaches CodeMirror, whose style for it enters the slide or selects; menus listen on the DOM
    ignoreEvent(event: Event): boolean {
        return !(this.slideId && event.type === 'mousedown' && plainPress(event as MouseEvent));
    }
}

class EmptyDraft extends WidgetType {
    // Every empty draft looks the same, so a rebuild can keep the existing element
    eq(): boolean {
        return true;
    }

    toDOM(view: EditorView): HTMLElement {
        return view.dom.ownerDocument.defaultView!.createDiv({ cls: 'markdownpoint-empty-draft', text: uiText.slides.empty });
    }
}

/** Live Preview uses the reader's source snapshot; Source mode stays ordinary Markdown. */
export class PresentationEditor extends Component {
    readonly extension: Extension;
    private readonly field: StateField<DraftState>;
    private readonly views = new Set<EditorView>();
    private readonly pending = new WeakSet<EditorView>();
    private readonly pendingCaret = new WeakSet<EditorView>();
    private readonly compositions = new WeakMap<EditorView, OpeningComposition>();
    private running = false;
    private readonly notesActions: NotesActions = {
        toggle: (view, slideId) => {
            const draft = view.state.field(this.field);
            if (!this.running || !draft.id) return;
            this.notesUi.setOpen(draft.id, slideId, !draft.openedNotes.has(slideId));
            const file = view.state.field(editorInfoField, false)?.file;
            if (file) this.refresh(file);
        },
        edit: (view, slideId) => {
            const draft = view.state.field(this.field);
            const slot = draft.notes.find(slot => slot.slideId === slideId);
            if (!this.running || !slot || !draft.openedNotes.has(slideId)) return;
            if (slot.field) focusWritingField(view, slot.field);
            else if (draft.snapshot) {
                const insertion = validatedNotesInsertion(view.state.doc.toString(), draft.snapshot.document, slideId);
                if (insertion) insertWritingBlock(view, insertion);
            }
        }
    };

    private readonly writePlaceholder = (view: EditorView, key: string): void => {
        const draft = view.state.field(this.field);
        const placeholder = draft.missing.find(placeholder => placeholder.key === key);
        if (!this.running || !placeholder || !draft.snapshot) return;
        const insertion = validatedPlaceholderInsertion(view.state.doc.toString(), draft.snapshot.document, placeholder);
        if (insertion) insertWritingBlock(view, insertion);
    };

    constructor(
        private readonly reader: PresentationReader,
        private readonly notesUi: NotesUi,
        private readonly caretChanged: (editor: MarkdownView, slideId: string) => void,
        private readonly data: SlideData | null = null,
        private readonly showSlideImages: () => boolean = () => true
    ) {
        super();
        const field = (this.field = StateField.define<DraftState>({
            create: state => this.build(state),
            update: (value, transaction) => {
                if (!transaction.docChanged && !transaction.selection && !transaction.reconfigured && !transaction.effects.length)
                    return value;
                return this.build(transaction.state, value, transaction);
            },
            provide: field => EditorView.decorations.from(field, value => value.decorations)
        }));
        const views = this.views;
        this.extension = [
            imageSpacing,
            field,
            spanMarks(state => state.field(field).snapshot?.document ?? null),
            paragraphIdMarks(state => state.field(field).snapshot?.document ?? null),
            keptParagraphIds(state => state.field(field).snapshot?.document ?? null),
            slideThumbnails(view => {
                const draft = view.state.field(field);
                return {
                    id: draft.id,
                    slides: new Map(
                        draft.markers.flatMap(marker =>
                            marker.slideId
                                ? [
                                      [
                                          marker.slideId,
                                          {
                                              structure: marker.structure ?? null,
                                              images: draft.showImages ? (marker.images ?? []) : []
                                          }
                                      ] as const
                                  ]
                                : []
                        )
                    )
                };
            }),
            ViewPlugin.define(view => {
                views.add(view);
                let container: HTMLElement | null = null;
                const sync = () => {
                    const info = view.state.field(editorInfoField, false);
                    const next = info instanceof MarkdownView ? info.contentEl : null;
                    if (container !== next) container?.removeClass('markdownpoint-presentation');
                    container = next;
                    const draft = view.state.field(field);
                    container?.toggleClass('markdownpoint-presentation', draft.snapshot !== null || draft.markers.length > 0);
                };
                sync();
                this.reportCaret(view);
                return {
                    update: update => {
                        sync();
                        const composition = this.compositions.get(view);
                        for (const transaction of update.transactions) {
                            this.restoreHistoryCaret(view, transaction);
                            if (!composition || !transaction.docChanged) continue;
                            // The author's input writes at the composition's end; any other edit stays outside it
                            const changes = transaction.changes;
                            composition.from = changes.mapPos(composition.from, 1);
                            composition.to = changes.mapPos(composition.to, transaction.isUserEvent('input') ? 1 : -1);
                            composition.bodyStart = changes.mapPos(composition.bodyStart, -1);
                        }
                        // Notes take words, or undo and redo put the caret in closed ones: they show open
                        if (
                            update.transactions.some(
                                transaction =>
                                    transaction.annotation(wroteNotes) || transaction.isUserEvent('undo') || transaction.isUserEvent('redo')
                            )
                        )
                            view.dom.ownerDocument.defaultView?.queueMicrotask(() => {
                                if (this.running && this.views.has(view)) this.revealSelectedNotes(view);
                            });
                        if (
                            update.selectionSet ||
                            update.docChanged ||
                            update.focusChanged ||
                            update.transactions.some(
                                transaction =>
                                    transaction.reconfigured || transaction.effects.some(effect => effect.is(refreshPresentation))
                            )
                        ) {
                            this.reportCaret(view);
                        }
                    },
                    destroy: () => {
                        views.delete(view);
                        container?.removeClass('markdownpoint-presentation');
                    }
                };
            }),
            EditorView.focusChangeEffect.of((_state, focused) => editorFocus.of(focused)),
            EditorView.domEventHandlers({
                keydown: (event, view) => {
                    this.compositionKey(view, event);
                    return false;
                },
                // A key an input method took without composing, or a composition's end once CodeMirror has read it
                keyup: (_event, view) => {
                    this.settleComposition(view);
                    return false;
                },
                compositionend: (_event, view) => {
                    view.dom.ownerDocument.defaultView?.setTimeout(() => this.settleComposition(view));
                    return false;
                },
                focus: (_event, view) => {
                    // Let a pointer's native selection settle before revealing a folded
                    // area. Keyboard focus may retain a caret in notes at document end.
                    view.dom.ownerDocument.defaultView?.queueMicrotask(() => {
                        if (this.running && this.views.has(view) && view.hasFocus) this.revealSelectedNotes(view);
                    });
                }
            }),
            EditorView.mouseSelectionStyle.of((view, event) => this.boundaryPress(view, event)),
            EditorView.atomicRanges.of(view => view.state.field(field).decorations),
            EditorView.atomicRanges.of(view => view.state.field(field).hidden),
            EditorState.transactionFilter.of(transaction => {
                const draft = transaction.startState.field(field);
                const markers = draft.markers;
                if (
                    draft.empty &&
                    transaction.docChanged &&
                    transaction.annotation(slideStructureChange) !== true &&
                    ['input', 'delete', 'move'].some(event => transaction.isUserEvent(event))
                )
                    return [];
                const noteFields = draft.notes.flatMap(slot => (slot.field ? [slot.field] : []));
                const fields = [
                    ...draft.fields,
                    ...draft.notes.flatMap(slot => (slot.field && draft.openedNotes.has(slot.slideId) ? [slot.field] : []))
                ];
                if (
                    !transaction.docChanged &&
                    transaction.selection &&
                    transaction.annotation(Transaction.userEvent) === 'select' &&
                    transaction.newSelection.ranges.length === 1 &&
                    transaction.newSelection.main.empty
                ) {
                    const compact = compactFieldAt(fields, transaction.newSelection.main.head, transaction.startState.doc.length);
                    if (compact)
                        return [
                            transaction,
                            {
                                changes: { from: compact.contentFrom, insert: '\n' },
                                selection: { anchor: compact.contentFrom },
                                sequential: true
                            }
                        ];
                }
                if (
                    !boundaryChangesAllowed(
                        transaction,
                        [...markers, ...draft.fields, ...noteFields].map(range => ({
                            from: range.from,
                            markerTo: 'contentFrom' in range ? range.contentFrom : range.markerTo
                        }))
                    )
                )
                    return [];
                return this.openingInput(transaction, draft) ?? transaction;
            })
        ];
    }

    /**
     * Words the author types, pastes or drops where no block holds them: on the line of a slide with no blocks they go
     * into the writing its draft shows below, and anywhere else nowhere, since MarkdownPoint refuses a file with them.
     */
    private openingInput(transaction: Transaction, draft: DraftState): readonly (Transaction | TransactionSpec)[] | null {
        const snapshot = draft.snapshot;
        if (!snapshot || !transaction.docChanged || transaction.annotation(slideStructureChange) === true) return null;
        if (!transaction.isUserEvent('input') && !transaction.isUserEvent('move')) return null;
        const start = transaction.startState.doc;
        const typed: { from: number; to: number; fromB: number }[] = [];
        transaction.changes.iterChanges((fromA, toA, fromB, _toB, inserted) => {
            if (inserted.toString().trim() && inOpening(snapshot.document, snapshot.bodyStart, start.length, fromA))
                typed.push({ from: fromA, to: toA, fromB });
        });
        const change = typed[0];
        if (!change) return null;
        // An edit that leaves every word in a block, as a pasted block with its own marker, stands as made
        if (indexPresentation(transaction.newDoc.toString(), snapshot.bodyStart)) return null;
        // One slide's line at a time takes words; a composition would be typed twice if its words moved while it lasts
        if (typed.length > 1 || transaction.isUserEvent('input.type.compose')) return [];
        const markdown = start.toString();
        const write = openingWrite(markdown, snapshot.document, snapshot.bodyStart, draft.missing, change.from, change.to);
        if (!write) return [];
        // The words stay as typed, with what came with them, an auto-paired bracket's caret and state included: only
        // their block's marker is written, at the start of their line
        const at = transaction.changes.mapPos(write.at, -1);
        const marker = ChangeSet.of({ from: at, insert: write.before }, transaction.newDoc.length);
        const edit = transaction.changes.compose(marker);
        const proposed = marker.apply(transaction.newDoc).toString();
        const map = (position: number) => edit.mapPos(position, 1);
        if (!keepsStructure(markdown, snapshot.document, snapshot.bodyStart, proposed, write, map, at)) return [];
        return [transaction, { changes: marker, sequential: true, annotations: write.notesOf ? wroteNotes.of(true) : [] }];
    }

    /**
     * An input method's key on the line of a slide with no blocks writes the block typed words take there before its
     * composition starts, as typing, and native history joins the composition to it: one undo takes both. A composition
     * that comes with no such key stays refused, as on any line no block holds.
     */
    private compositionKey(view: EditorView, event: { readonly keyCode: number; readonly isComposing: boolean }): void {
        // Chromium gives each key an input method takes key code 229, as MarkdownPoint's own boundary for them reads it
        if (!this.running || event.keyCode !== 229 || event.isComposing || view.compositionStarted) return;
        this.settleComposition(view);
        const state = view.state;
        const draft = state.field(this.field);
        const snapshot = draft.snapshot;
        const caret = state.selection.main;
        if (!snapshot || state.selection.ranges.length > 1 || !caret.empty) return;
        const write = compositionWrite(state.doc.toString(), snapshot.document, snapshot.bodyStart, draft.missing, caret.head);
        if (!write) return;
        // Notes show open as the composition starts in them
        const opened = write.notesOf && draft.id && !draft.openedNotes.has(write.notesOf) ? { id: draft.id, slideId: write.notesOf } : null;
        if (opened) this.notesUi.setOpen(opened.id, opened.slideId, true);
        const start = state.doc;
        view.dispatch({
            changes: { from: write.at, insert: write.before },
            selection: { anchor: write.at + write.before.length },
            userEvent: 'input.type'
        });
        if (view.state.doc !== start)
            this.compositions.set(view, {
                write,
                from: write.at,
                to: write.at + write.before.length,
                bodyStart: snapshot.bodyStart,
                opened
            });
        else if (opened) this.notesUi.setOpen(opened.id, opened.slideId, false);
    }

    /**
     * Once no composition is under way, a block written for one keeps its words; without words its marker goes back,
     * and with words that would move or set free a marker everything does. Both go outside history, so the edit that
     * wrote the block maps away with them and leaves no step to undo.
     */
    private settleComposition(view: EditorView): void {
        const composition = this.compositions.get(view);
        if (!composition || view.compositionStarted) return;
        this.compositions.delete(view);
        const { write, from, to, bodyStart, opened } = composition;
        const back = compositionTakeBack(view.state.doc.toString(), bodyStart, write, from, to);
        if (!back) return;
        if (opened) this.notesUi.setOpen(opened.id, opened.slideId, false);
        view.dispatch({ changes: back, annotations: Transaction.addToHistory.of(false) });
    }

    /**
     * A plain press on a slide's boundary, decided by where it lands in the DOM rather than by the hit test of the
     * CodeMirror the author's Obsidian ships. The boundary holds hidden source at both its edges, so a press on it
     * selects nothing, as on any widget without words, and released within CodeMirror's drag threshold it enters the
     * slide's first writing.
     */
    private boundaryPress(view: EditorView, press: MouseEvent): MouseSelectionStyle | null {
        if (!this.running || !plainPress(press)) return null;
        const node = press.targetNode;
        const element = node?.instanceOf(Element) ? node : node?.parentElement;
        const boundary = element?.closest<HTMLElement>('.markdownpoint-slide-boundary[data-slide]');
        const slideId = boundary?.dataset.slide;
        if (!boundary || !slideId || !view.contentDOM.contains(boundary)) return null;
        const gap = aboveRule(boundary, press.clientY);
        const pressed = view.state.doc;
        let moved = false;
        // Registered before CodeMirror's own listeners, these end with them
        const ownerDocument = view.dom.ownerDocument;
        const end = () => {
            ownerDocument.removeEventListener('mousemove', move);
            ownerDocument.removeEventListener('mouseup', release);
        };
        const move = (event: MouseEvent) => {
            if (event.buttons === 0) end();
        };
        // A press the document changed under is no click, as CodeMirror drops one the author types during. The click
        // enters once CodeMirror's own release is done, which would map its caret through the atoms of the press.
        const click = () => this.running && this.views.has(view) && view.state.doc === pressed;
        const release = (event: MouseEvent) => {
            end();
            if (moved || event.button !== 0 || !click()) return;
            ownerDocument.defaultView?.setTimeout(() => {
                if (click()) this.enterBoundary(view, slideId, gap ? press.clientX : null);
            });
        };
        ownerDocument.addEventListener('mousemove', move);
        ownerDocument.addEventListener('mouseup', release);
        return {
            get: current => {
                // CodeMirror's drag threshold, measured as it measures it
                moved ||= Math.max(Math.abs(current.clientX - press.clientX), Math.abs(current.clientY - press.clientY)) >= 10;
                return view.state.selection;
            },
            update: () => false
        };
    }

    /**
     * A press released where it started on a slide's boundary enters the slide's first writing, as that writing's
     * ghost does. In the gap above the rule, which belongs to the preceding slide, it lands where Up from this slide's
     * first writing lands, at the press's column, `gapX`.
     */
    private enterBoundary(view: EditorView, slideId: string, gapX: number | null): void {
        const snapshot = view.state.field(this.field).snapshot;
        const slide = snapshot?.document.slides.find(slide => slide.id === slideId);
        if (!snapshot || !slide) return;
        const preceding = slideForGap(snapshot.document, slide, view.state.doc.toString(), snapshot.bodyStart);
        if (gapX === null || preceding === slide) {
            this.enter(view, slide, true);
            return;
        }
        // Up from the boundary, which Up from the first writing passes over
        const goal = gapX - view.contentDOM.getBoundingClientRect().left;
        const landing = view.moveVertically(EditorSelection.cursor(slide.from, 1, undefined, goal), false);
        if (landing.head >= preceding.markerTo && landing.head < preceding.to) {
            view.dispatch({ selection: landing, userEvent: 'select.pointer', scrollIntoView: true });
            view.focus();
        }
        // Up passes over a slide that shows no line, as one of closed notes alone, which the press then enters as a click
        // on its boundary does, where that writes nothing
        else this.enter(view, preceding, false);
    }

    /**
     * Puts the caret in a slide's first writing, as its ghost does, and in view; an unwritten placeholder is written,
     * and a compact field given its line, only where `write` allows, the editor otherwise only focused.
     */
    private enter(view: EditorView, slide: DocumentSlide, write: boolean): void {
        const draft = view.state.field(this.field);
        const length = view.state.doc.length;
        const fields = [...draft.fields, ...draft.notes.flatMap(slot => (slot.field ? [slot.field] : []))];
        const entry = draft.snapshot && openingEntry(draft.snapshot.document, slide, draft.missing, fields, length);
        const writes =
            entry?.kind === 'placeholder' ||
            (entry?.kind === 'field' && compactFieldAt([entry.field], entry.field.contentFrom, length) !== undefined);
        if (!entry || (writes && !write)) {
            view.focus();
            return;
        }
        if (entry.kind === 'placeholder') this.writePlaceholder(view, entry.key);
        else if (entry.kind === 'field') {
            focusWritingField(view, entry.field);
            this.revealSelectedNotes(view);
        } else view.dispatch({ selection: { anchor: entry.at }, userEvent: 'select.pointer' });
        view.dispatch({ scrollIntoView: true });
        view.focus();
    }

    onload(): void {
        this.running = true;
    }
    onunload(): void {
        this.running = false;
        this.views.clear();
    }

    reorder(editor: Editor, ids: Iterable<string>, action: SlideReorder): boolean {
        const view = [...this.views].find(view => view.state.field(editorInfoField, false)?.editor === editor);
        const file = view?.state.field(editorInfoField, false)?.file;
        if (!this.running || !view || !file) return false;
        const snapshot = this.reader.snapshot(file, view.state.doc.toString());
        if (!snapshot) return false;
        const transaction = slideReorderTransaction(view.state, snapshot.document, ids, action);
        if (!transaction) return false;
        view.dispatch(slideEditTransactions(view.state, transaction));
        return true;
    }

    history(editor: Editor, direction: 'undo' | 'redo'): boolean {
        const view = [...this.views].find(view => view.state.field(editorInfoField, false)?.editor === editor);
        const file = view?.state.field(editorInfoField, false)?.file;
        if (!this.running || !view || !file || !this.reader.matchesIdentity(file, view.state.doc.toString())) return false;
        const changed = (direction === 'undo' ? undo : redo)({ state: view.state, dispatch: transaction => view.dispatch(transaction) });
        const owner = view.state.field(editorInfoField, false);
        if (changed && owner instanceof MarkdownView) {
            this.reader.syncEditor(owner);
            this.publishCaret(view);
        }
        return changed;
    }

    deleteSlides(editor: Editor, ids: Iterable<string>, canApply: () => boolean): Promise<boolean> {
        const selected = new Set(ids);
        return this.editSlideRecords(editor, canApply, (state, snapshot, companion) => {
            const plan = planSlideDeletion(state.doc.toString(), snapshot.document, companion, selected);
            return (
                plan && {
                    companion,
                    ids: selected,
                    transaction: (current, livePreview) => slideDeletionTransaction(current, snapshot.document, plan, livePreview)
                }
            );
        });
    }

    insertSlides(editor: Editor, slides: readonly PreparedPart[], afterSlideId: string | null, canApply: () => boolean): Promise<boolean> {
        const prepared = slides.map(slide => ({ ...slide }));
        return this.editSlideRecords(editor, canApply, (state, snapshot, companion) => {
            const plan = planSlideInsertion(state.doc.toString(), snapshot.document, companion, prepared, afterSlideId, snapshot.bodyStart);
            if (!plan) return null;
            return {
                companion: plan.companion,
                ids: prepared.map(slide => slide.id),
                transaction: (current, livePreview) =>
                    slideInsertionTransaction(current, plan, prepared[0]!.id, livePreview, snapshot.bodyStart)
            };
        });
    }

    private async editSlideRecords(
        editor: Editor,
        canApply: () => boolean,
        prepare: (
            state: EditorState,
            snapshot: PresentationSnapshot,
            companion: string
        ) => {
            readonly companion: string;
            readonly ids: Iterable<string>;
            transaction(state: EditorState, livePreview: boolean): TransactionSpec | null;
        } | null
    ): Promise<boolean> {
        const view = [...this.views].find(view => view.state.field(editorInfoField, false)?.editor === editor);
        const owner = view?.state.field(editorInfoField, false);
        if (!this.running || !this.data || !view || !(owner instanceof MarkdownView) || !owner.file) return false;
        const file = owner.file;
        await this.reader.refreshView(owner);
        if (!this.running || !this.views.has(view) || owner.file !== file || owner.getMode() !== 'source' || !canApply()) return false;
        const before = view.state.doc;
        const snapshot = this.reader.snapshot(file, before.toString());
        const companion = snapshot && this.reader.companionFor(file, snapshot);
        if (!snapshot || companion === null) return false;
        const plan = prepare(view.state, snapshot, companion);
        if (!plan || !(await this.data.remember(file.path, snapshot.id, plan.companion, plan.ids))) return false;
        if (
            !this.running ||
            !this.views.has(view) ||
            owner.file !== file ||
            owner.getMode() !== 'source' ||
            view.state.doc !== before ||
            !this.reader.matchesIdentity(file, before.toString()) ||
            !canApply()
        )
            return false;
        const transaction = plan.transaction(view.state, view.state.field(editorLivePreviewField, false) === true);
        if (!transaction) return false;
        view.dispatch(slideEditTransactions(view.state, transaction));
        this.reader.syncEditor(owner);
        return true;
    }

    private reportCaret(view: EditorView): void {
        if (this.pendingCaret.has(view)) return;
        this.pendingCaret.add(view);
        // Publish after CodeMirror's update and native pointer selection settle.
        // Re-read the current state so a queued report cannot restore an old caret.
        view.dom.ownerDocument.defaultView?.queueMicrotask(() => {
            this.pendingCaret.delete(view);
            if (!this.running || !this.views.has(view) || !view.hasFocus) return;
            this.publishCaret(view);
        });
    }

    private publishCaret(view: EditorView): void {
        const editor = view.state.field(editorInfoField, false);
        if (!this.running || !this.views.has(view) || !(editor instanceof MarkdownView) || !editor.file) return;
        const snapshot = this.reader.snapshot(editor.file, view.state.doc.toString());
        const position = Math.max(0, Math.min(view.state.selection.main.head, view.state.doc.length - 1));
        const slide = snapshot && slideAtPosition(snapshot.document, position);
        if (slide) this.caretChanged(editor, slide.id);
    }

    private restoreHistoryCaret(view: EditorView, transaction: Transaction): void {
        if (!transaction.docChanged || !(transaction.isUserEvent('undo') || transaction.isUserEvent('redo'))) return;
        const file = transaction.state.field(editorInfoField, false)?.file;
        if (!file) return;
        const before =
            transaction.startState.field(this.field).snapshot ?? this.reader.snapshot(file, transaction.startState.doc.toString());
        const after = transaction.state.field(this.field).snapshot ?? this.reader.snapshot(file, transaction.newDoc.toString());
        if (!before || !after || before.id !== after.id) return;
        const selection =
            historyReorderSelection(transaction, before.document, after.document) ??
            (transaction.state.field(editorLivePreviewField, false) === true
                ? historyBoundarySelection(transaction, before.document, after.document)
                : null);
        if (!selection) return;
        view.dom.ownerDocument.defaultView?.queueMicrotask(() => {
            if (
                this.running &&
                this.views.has(view) &&
                view.state.field(editorInfoField, false)?.file === file &&
                view.state.doc === transaction.newDoc &&
                view.state.selection.eq(transaction.newSelection)
            ) {
                view.dispatch({ selection, userEvent: 'select.markdownpoint', scrollIntoView: true });
                this.publishCaret(view);
            }
        });
    }

    focus(editor: Editor): boolean {
        const view = [...this.views].find(view => view.state.field(editorInfoField, false)?.editor === editor);
        if (!view || view.state.field(editorLivePreviewField, false) !== true) return false;
        const draft = view.state.field(this.field);
        if (!draft.markers.length) return false;
        this.revealSelectedNotes(view);
        if (view.state.selection.ranges.length !== 1 || !view.state.selection.main.empty) {
            view.focus();
            return true;
        }
        const head = view.state.selection.main.head;
        const field = [...draft.fields, ...draft.notes.flatMap(slot => (slot.field ? [slot.field] : []))].find(
            field => head >= field.from && head < field.contentFrom
        );
        const marker = draft.markers.find(marker => head >= marker.from && head < marker.markerTo);
        const beforeSlides = head < (draft.markers.find(marker => marker.label !== null)?.from ?? 0);
        const inSection = draft.snapshot?.document.sections.some(section => head >= section.markerTo && head < section.to);
        if (field) focusWritingField(view, field);
        else if (marker || (beforeSlides && !inSection)) {
            const slide = draft.snapshot?.document.slides.find(slide => head < slide.to);
            const next = draft.fields.find(field => field.from >= (marker?.markerTo ?? 0) && (!slide || field.from < slide.to));
            if (next) focusWritingField(view, next);
            else {
                const position = slide?.blocks[0]?.contentFrom ?? marker?.markerTo;
                if (position !== undefined) view.dispatch({ selection: { anchor: position } });
                this.revealSelectedNotes(view);
                view.focus();
            }
        } else view.focus();
        return true;
    }

    private revealSelectedNotes(view: EditorView): void {
        const draft = view.state.field(this.field);
        if (!draft.id) return;
        const hidden = draft.notes.filter(slot => {
            const field = slot.field;
            return (
                field &&
                !draft.openedNotes.has(slot.slideId) &&
                view.state.selection.ranges.some(
                    range =>
                        range.to >= field.from && (range.from < field.to || (field.to === view.state.doc.length && range.from === field.to))
                )
            );
        });
        if (!hidden.length) return;
        for (const slot of hidden) this.notesUi.setOpen(draft.id, slot.slideId, true);
        view.dispatch({ effects: refreshPresentation.of(view.hasFocus) });
        const file = view.state.field(editorInfoField, false)?.file;
        if (file) this.refresh(file);
    }

    refreshAll(): void {
        for (const view of this.views) view.dispatch({ effects: refreshPresentation.of(view.hasFocus) });
    }

    refresh(file: TFile): void {
        for (const view of this.views) {
            if (view.state.field(editorInfoField, false)?.file !== file || this.pending.has(view)) continue;
            this.pending.add(view);
            view.dom.ownerDocument.defaultView?.queueMicrotask(() => {
                this.pending.delete(view);
                if (this.running && this.views.has(view)) view.dispatch({ effects: refreshPresentation.of(view.hasFocus) });
            });
        }
    }

    private build(state: EditorState, previous?: DraftState, transaction?: Transaction): DraftState {
        const markdown = state.doc.toString();
        const file = state.field(editorInfoField, false)?.file;
        const preview = state.field(editorLivePreviewField, false) === true;
        const snapshot = file && preview ? this.reader.snapshot(file, markdown) : null;
        let focused = previous?.focused ?? false;
        for (const effect of transaction?.effects ?? [])
            if (effect.is(editorFocus) || effect.is(refreshPresentation)) focused = effect.value;
        const id = snapshot?.id ?? previous?.id;
        const openedNotes = this.notesUi.opened(id ?? '');
        const showImages = preview && this.showSlideImages();
        const spacing = state.field(imageSpacing, false);
        const imageSpaces = showImages && spacing && spacing.presentationId === id ? spacing.heights : noImageSpaces;
        const selectionChanged = transaction?.selection && !transaction.startState.selection.eq(transaction.newSelection);
        if (
            snapshot &&
            previous?.snapshot === snapshot &&
            openedNotes === previous.openedNotes &&
            !selectionChanged &&
            focused === previous.focused &&
            showImages === previous.showImages &&
            imageSpaces === previous.imageSpaces
        )
            return previous;
        if (
            snapshot &&
            !snapshot.document.slides.length &&
            !snapshot.document.sections.length &&
            !markdown.slice(snapshot.bodyStart).trim()
        ) {
            return {
                id: snapshot.id,
                snapshot,
                empty: true,
                fields: [],
                missing: [],
                notes: [],
                openedNotes,
                focused,
                showImages,
                imageSpaces,
                markers: [{ from: 0, markerTo: state.doc.length, text: markdown, label: null }],
                decorations: Decoration.set([Decoration.replace({ block: true, widget: new EmptyDraft() }).range(0, state.doc.length)]),
                openBlanks: new Set<number>(),
                openings: new Map<string, number>(),
                hidden: Decoration.none
            };
        }
        let markers: readonly DraftMarker[] = [];
        if (snapshot) {
            const numbers = outlineSlideNumbers(snapshot.outline.slides, number => uiNumber.format(number));
            const structures = new Map(snapshot.outline.slides.map(slide => [slide.id, slide.structure]));
            markers = [
                ...snapshot.document.slides.map(slide => ({
                    from: slide.from,
                    markerTo: slide.markerTo,
                    text: state.doc.sliceString(slide.from, slide.markerTo),
                    label: numbers.get(slide.id) ?? '',
                    slideId: slide.id,
                    structure: structures.get(slide.id),
                    images: snapshot.images.get(slide.id),
                    slideTo: slide.to
                })),
                ...snapshot.document.sections.map(section => ({
                    from: section.from,
                    markerTo: section.markerTo,
                    text: state.doc.sliceString(section.from, section.markerTo),
                    label: null
                })),
                ...snapshot.document.laterMarkers.map(marker => ({
                    from: marker.from,
                    markerTo: marker.markerTo,
                    text: state.doc.sliceString(marker.from, marker.markerTo),
                    label: null,
                    kept: true as const
                }))
            ];
        } else if (file && preview && previous?.markers.length && this.reader.matchesIdentity(file, markdown)) {
            // Incomplete Markdown (for example an unfinished code fence) must not
            // unlock known separators. Map them, then verify their actual source.
            const mapped = transaction?.docChanged
                ? previous.markers.map(marker => ({
                      ...marker,
                      from: transaction.changes.mapPos(marker.from, 1),
                      markerTo: transaction.changes.mapPos(marker.markerTo, -1),
                      ...(marker.slideTo !== undefined ? { slideTo: transaction.changes.mapPos(marker.slideTo, 1) } : {})
                  }))
                : previous.markers;
            if (
                mapped.every(
                    marker =>
                        marker.from < marker.markerTo &&
                        state.doc.lineAt(marker.from).from === marker.from &&
                        state.doc.sliceString(marker.from, marker.markerTo) === marker.text
                )
            )
                markers = mapped;
        }
        const mapField = (field: WritingField): WritingField | null => {
            const from = transaction?.docChanged ? transaction.changes.mapPos(field.from, 1) : field.from;
            const contentFrom = transaction?.docChanged ? transaction.changes.mapPos(field.contentFrom, -1) : field.contentFrom;
            const to = transaction?.docChanged ? transaction.changes.mapPos(field.to, 1) : field.to;
            return state.doc.lineAt(from).from === from && state.doc.sliceString(from, contentFrom) === field.markerText
                ? {
                      ...field,
                      from,
                      contentFrom,
                      contentTo: payloadContentEnd(markdown, contentFrom, to),
                      to,
                      populated: state.doc.sliceString(contentFrom, to).trim().length > 0
                  }
                : null;
        };
        let fields = snapshot ? writingFields(markdown, snapshot.document, uiText.fields) : [];
        if (!snapshot && markers.length && previous?.fields.length) {
            fields = previous.fields.flatMap(field => {
                const mapped = mapField(field);
                return mapped ? [mapped] : [];
            });
        }
        let missing = snapshot ? missingPlaceholders(snapshot.document, snapshot.placeholders, uiText.fields) : [];
        if (!snapshot && markers.length && previous)
            missing = previous.missing.flatMap(placeholder => {
                const at = transaction?.docChanged ? transaction.changes.mapPos(placeholder.at, 1) : placeholder.at;
                return at === state.doc.length || state.doc.lineAt(at).from === at ? [{ ...placeholder, at }] : [];
            });
        // A placeholder shown above a slide's first field opens the slide in its place.
        const opening = new Set(missing.flatMap(placeholder => (placeholder.opening ? [placeholder.at] : [])));
        if (opening.size) fields = fields.map(field => (field.opening && opening.has(field.from) ? { ...field, opening: false } : field));
        let notes = snapshot ? slideNotes(markdown, snapshot.document, uiText.notes.placeholder) : [];
        if (!snapshot && markers.length && previous)
            notes = previous.notes.flatMap(slot => {
                if (!slot.field) {
                    // A slide without notes keeps its empty row at the next marker or the end of the document
                    const at = transaction?.docChanged ? transaction.changes.mapPos(slot.at, 1) : slot.at;
                    return at === state.doc.length || state.doc.lineAt(at).from === at ? [{ ...slot, at }] : [];
                }
                const field = mapField(slot.field);
                return field ? [{ ...slot, at: field.from, field }] : [];
            });
        const noteFields = notes.flatMap(slot => (slot.field && openedNotes.has(slot.slideId) ? [slot.field] : []));
        const entryPoints = new Set(
            [...fields, ...noteFields]
                .filter(field => field.contentFrom === field.to && field.to < state.doc.length)
                .map(field => field.contentFrom)
        );
        // An organizational blank line an edit leaves a caret on stays shown while a selection's end stands on it, so the
        // caret shown is where the author writes; one the keys reach stays folded, as before. Closed notes keep theirs too,
        // for when they open, as undo and redo open them.
        const edited = transaction?.docChanged === true;
        const kept = new Set(
            [...(previous?.openBlanks ?? [])].map(from => (transaction && edited ? transaction.changes.mapPos(from) : from))
        );
        const openBlanks = new Set(
            [...fields, ...notes.flatMap(slot => (slot.field ? [slot.field] : []))].flatMap(field => {
                const from = blankFold(state, field);
                return from !== null && (edited || kept.has(from)) && selectionOnBlank(state, field, from) ? [from] : [];
            })
        );
        // While the deck can't be read, as while a code fence is still open, an opening held before stays held while its
        // line is as it was, so the caret passes over it as before
        const openings = snapshot
            ? heldOpenings(markdown, snapshot.document, state.selection.ranges)
            : new Map(
                  markers.flatMap(marker => {
                      const end = marker.slideId === undefined ? undefined : previous?.openings.get(marker.slideId);
                      if (marker.slideId === undefined || end === undefined) return [];
                      const to = transaction?.docChanged ? transaction.changes.mapPos(end + 1) : end + 1;
                      return holdsOpening(markdown, marker.markerTo, to, state.selection.ranges) ? [[marker.slideId, to - 1] as const] : [];
                  })
              );
        const held = (marker: DraftMarker) => (marker.slideId === undefined ? undefined : openings.get(marker.slideId));
        // Missing notes are block widgets before the next marker, not editable entry
        // points. Excluding that marker's start would create an empty cursor line.
        const ranges = markers.flatMap(marker => {
            if (marker.kept) return [];
            const opening = held(marker);
            return Decoration.replace({
                block: true,
                inclusiveStart: !entryPoints.has(marker.from),
                ...(marker.label === null
                    ? { inclusiveEnd: false }
                    : { widget: new SlideBoundary(marker.label, marker.slideId, opening !== undefined) })
            }).range(marker.from, marker.label === null ? marker.markerTo : (opening ?? state.doc.lineAt(marker.from).to));
        });
        ranges.push(...fieldDecorations(state, fields, previous?.fields ?? [], focused, entryPoints, openBlanks));
        ranges.push(...missingFieldDecorations(state, missing, this.writePlaceholder));
        ranges.push(...notesDecorations(state, notes, openedNotes, focused, entryPoints, this.notesActions, openBlanks));
        if (showImages)
            for (const marker of markers) {
                if (!marker.slideId || marker.slideTo === undefined || !marker.images?.length) continue;
                ranges.push(
                    Decoration.widget({
                        block: true,
                        side: marker.slideTo < state.doc.length ? 0 : 2,
                        widget: new ImageSpace(marker.slideId, imageSpaces.get(marker.slideId) ?? 0)
                    }).range(marker.slideTo)
                );
            }
        for (const section of snapshot?.document.sections ?? []) {
            const first = state.doc.sliceString(section.markerTo, section.headingTo).search(/\S/);
            if (first >= 0)
                ranges.push(
                    Decoration.line({
                        class: `markdownpoint-section-heading${section === snapshot?.document.sections[0] ? ' markdownpoint-first-section' : ''}`
                    }).range(state.doc.lineAt(section.markerTo + first).from)
                );
        }
        return {
            id: markers.length ? (id ?? null) : null,
            snapshot,
            empty: false,
            markers,
            fields,
            missing,
            notes,
            openedNotes,
            focused,
            showImages,
            imageSpaces,
            decorations: Decoration.set(ranges, true),
            openBlanks,
            openings,
            hidden: Decoration.set(
                markers.flatMap(marker => {
                    const end = held(marker);
                    return end === undefined ? [] : [Decoration.mark({}).range(marker.from, end + 1)];
                }),
                true
            )
        };
    }
}
