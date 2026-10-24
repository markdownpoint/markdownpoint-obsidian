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

import { StateEffect, StateField, EditorState, Transaction } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { Component, MarkdownView, editorInfoField, editorLivePreviewField } from "obsidian";
import type { Editor, TFile } from "obsidian";
import type { PresentationReader, PresentationSnapshot } from "../presentation/reader.ts";
import { outlineSlideNumbers } from "../outline/model.ts";
import { uiNumber, uiText } from "../ui-text.ts";
import { boundaryChangesAllowed } from "./boundary-protection.ts";
import { compactFieldAt, writingFields } from "./writing-fields.ts";
import type { WritingField } from "./writing-fields.ts";
import { fieldDecorations, focusWritingField, insertWritingBlock } from "./field-widgets.ts";
import { validatedNotesInsertion, slideNotes } from "./notes.ts";
import type { SlideNotes } from "./notes.ts";
import { notesDecorations } from "./notes-widgets.ts";
import type { NotesActions } from "./notes-widgets.ts";
import type { NotesUi } from "../settings/notes-ui.ts";
import { payloadContentEnd } from "../format/payload.ts";
import { slideAtPosition } from "../format/document.ts";
import { slideStepTransaction } from "./reorder.ts";
import { undo, redo } from "@codemirror/commands";

const refreshPresentation = StateEffect.define<boolean>();
const editorFocus = StateEffect.define<boolean>();

interface DraftState {
  readonly id: string | null;
  readonly snapshot: PresentationSnapshot | null;
  readonly markers: readonly DraftMarker[];
  readonly decorations: DecorationSet;
  readonly fields: readonly WritingField[];
  readonly notes: readonly SlideNotes[];
  readonly openedNotes: ReadonlySet<string>;
  readonly focused: boolean;
}

interface DraftMarker {
  readonly from: number;
  readonly markerTo: number;
  readonly text: string;
  readonly label: string | null;
}

class SlideBoundary extends WidgetType {
  constructor(private readonly label: string) { super(); }
  eq(other: SlideBoundary): boolean { return this.label === other.label; }
  toDOM(view: EditorView): HTMLElement {
    const element = view.dom.ownerDocument.defaultView!.createDiv({ cls: "markdownpoint-slide-boundary" });
    element.createSpan({ text: this.label, cls: "markdownpoint-slide-number" });
    return element;
  }
}

/** Live Preview uses the reader's source snapshot; Source mode stays ordinary Markdown. */
export class PresentationEditor extends Component {
  readonly extension: Extension;
  private readonly field: StateField<DraftState>;
  private readonly views = new Set<EditorView>();
  private readonly pending = new WeakSet<EditorView>();
  private readonly pendingCaret = new WeakSet<EditorView>();
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
    },
  };

  constructor(
    private readonly reader: PresentationReader,
    private readonly notesUi: NotesUi,
    private readonly caretChanged: (editor: MarkdownView, slideId: string) => void,
  ) {
    super();
    const field = this.field = StateField.define<DraftState>({
      create: state => this.build(state),
      update: (value, transaction) => {
        if (!transaction.docChanged && !transaction.selection && !transaction.reconfigured && !transaction.effects.length) return value;
        return this.build(transaction.state, value, transaction);
      },
      provide: field => EditorView.decorations.from(field, value => value.decorations),
    });
    const views = this.views;
    this.extension = [
      field,
      ViewPlugin.define(view => {
        views.add(view);
        let container: HTMLElement | null = null;
        const sync = () => {
          const info = view.state.field(editorInfoField, false);
          const next = info instanceof MarkdownView ? info.contentEl : null;
          if (container !== next) container?.removeClass("markdownpoint-presentation");
          container = next;
          container?.toggleClass("markdownpoint-presentation", view.state.field(field).markers.length > 0);
        };
        sync();
        this.reportCaret(view);
        return {
          update: update => {
            sync();
            if (update.selectionSet || update.docChanged || update.focusChanged ||
              update.transactions.some(transaction => transaction.reconfigured || transaction.effects.some(effect => effect.is(refreshPresentation)))) {
              this.reportCaret(view);
            }
          },
          destroy: () => { views.delete(view); container?.removeClass("markdownpoint-presentation"); },
        };
      }),
      EditorView.focusChangeEffect.of((_state, focused) => editorFocus.of(focused)),
      EditorView.domEventHandlers({
        focus: (_event, view) => {
          // Let a pointer's native selection settle before revealing a folded
          // area. Keyboard focus may retain a caret in notes at document end.
          view.dom.ownerDocument.defaultView?.queueMicrotask(() => {
            if (this.running && this.views.has(view) && view.hasFocus) this.revealSelectedNotes(view);
          });
        },
      }),
      EditorView.atomicRanges.of(view => view.state.field(field).decorations),
      EditorState.transactionFilter.of(transaction => {
        const markers = transaction.startState.field(field).markers;
        const draft = transaction.startState.field(field);
        const noteFields = draft.notes.flatMap(slot => slot.field ? [slot.field] : []);
        const fields = [...draft.fields, ...draft.notes.flatMap(slot => slot.field && draft.openedNotes.has(slot.slideId) ? [slot.field] : [])];
        if (!transaction.docChanged && transaction.selection && transaction.annotation(Transaction.userEvent) === "select" &&
          transaction.newSelection.ranges.length === 1 && transaction.newSelection.main.empty) {
          const compact = compactFieldAt(fields, transaction.newSelection.main.head, transaction.startState.doc.length);
          if (compact) return [transaction, {
            changes: { from: compact.contentFrom, insert: "\n" }, selection: { anchor: compact.contentFrom }, sequential: true,
          }];
        }
        return boundaryChangesAllowed(transaction, [...markers, ...draft.fields, ...noteFields].map(range => ({ from: range.from, markerTo: "contentFrom" in range ? range.contentFrom : range.markerTo }))) ? transaction : [];
      }),
    ];
  }

  onload(): void { this.running = true; }
  onunload(): void { this.running = false; this.views.clear(); }

  step(editor: Editor, ids: Iterable<string>, direction: "up" | "down"): boolean {
    const view = [...this.views].find(view => view.state.field(editorInfoField, false)?.editor === editor);
    const file = view?.state.field(editorInfoField, false)?.file;
    if (!this.running || !view || !file) return false;
    const snapshot = this.reader.snapshot(file, view.state.doc.toString());
    if (!snapshot) return false;
    const transaction = slideStepTransaction(view.state, snapshot.document, ids, direction);
    if (!transaction) return false;
    view.dispatch(transaction);
    return true;
  }

  history(editor: Editor, direction: "undo" | "redo"): boolean {
    const view = [...this.views].find(view => view.state.field(editorInfoField, false)?.editor === editor);
    const file = view?.state.field(editorInfoField, false)?.file;
    if (!this.running || !view || !file || !this.reader.matchesIdentity(file, view.state.doc.toString())) return false;
    return (direction === "undo" ? undo : redo)({ state: view.state, dispatch: transaction => view.dispatch(transaction) });
  }

  private reportCaret(view: EditorView): void {
    if (this.pendingCaret.has(view)) return;
    this.pendingCaret.add(view);
    // Publish after CodeMirror's update and native pointer selection settle.
    // Re-read the current state so a queued report cannot restore an old caret.
    view.dom.ownerDocument.defaultView?.queueMicrotask(() => {
      this.pendingCaret.delete(view);
      if (!this.running || !this.views.has(view) || !view.hasFocus) return;
      const editor = view.state.field(editorInfoField, false);
      if (!(editor instanceof MarkdownView) || !editor.file) return;
      const snapshot = this.reader.snapshot(editor.file, view.state.doc.toString());
      if (!snapshot) return;
      const position = Math.max(0, Math.min(view.state.selection.main.head, view.state.doc.length - 1));
      const slide = slideAtPosition(snapshot.document, position);
      if (slide) this.caretChanged(editor, slide.id);
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
    const field = [...draft.fields, ...draft.notes.flatMap(slot => slot.field ? [slot.field] : [])].find(field => head >= field.from && head < field.contentFrom);
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
      return field && !draft.openedNotes.has(slot.slideId) && view.state.selection.ranges.some(range =>
        range.to >= field.from && (range.from < field.to || (field.to === view.state.doc.length && range.from === field.to)));
    });
    if (!hidden.length) return;
    for (const slot of hidden) this.notesUi.setOpen(draft.id, slot.slideId, true);
    view.dispatch({ effects: refreshPresentation.of(view.hasFocus) });
    const file = view.state.field(editorInfoField, false)?.file;
    if (file) this.refresh(file);
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
    const snapshot = file && preview
      ? this.reader.snapshot(file, markdown) : null;
    let focused = previous?.focused ?? false;
    for (const effect of transaction?.effects ?? []) if (effect.is(editorFocus) || effect.is(refreshPresentation)) focused = effect.value;
    const id = snapshot?.id ?? previous?.id;
    const openedNotes = this.notesUi.opened(id ?? "");
    if (snapshot && previous?.snapshot === snapshot && openedNotes === previous.openedNotes && !transaction?.selection && focused === previous.focused) return previous;
    let markers: readonly DraftMarker[] = [];
    if (snapshot) {
      const numbers = outlineSlideNumbers(snapshot.outline.slides, number => uiNumber.format(number));
      markers = [
        ...snapshot.document.slides.map(slide => ({ from: slide.from, markerTo: slide.markerTo, text: state.doc.sliceString(slide.from, slide.markerTo), label: numbers.get(slide.id) ?? "" })),
        ...snapshot.document.sections.map(section => ({ from: section.from, markerTo: section.markerTo, text: state.doc.sliceString(section.from, section.markerTo), label: null })),
      ];
    } else if (file && preview && previous?.markers.length && this.reader.matchesIdentity(file, markdown)) {
      // Incomplete Markdown (for example an unfinished code fence) must not
      // unlock known separators. Map them, then verify their actual source.
      const mapped = transaction?.docChanged ? previous.markers.map(marker => ({
        ...marker, from: transaction.changes.mapPos(marker.from, 1), markerTo: transaction.changes.mapPos(marker.markerTo, -1),
      })) : previous.markers;
      if (mapped.every(marker => marker.from < marker.markerTo && state.doc.lineAt(marker.from).from === marker.from &&
        state.doc.sliceString(marker.from, marker.markerTo) === marker.text)) markers = mapped;
    }
    const mapField = (field: WritingField): WritingField | null => {
      const from = transaction?.docChanged ? transaction.changes.mapPos(field.from, 1) : field.from;
      const contentFrom = transaction?.docChanged ? transaction.changes.mapPos(field.contentFrom, -1) : field.contentFrom;
      const to = transaction?.docChanged ? transaction.changes.mapPos(field.to, 1) : field.to;
      return state.doc.lineAt(from).from === from && state.doc.sliceString(from, contentFrom) === field.markerText
        ? { ...field, from, contentFrom, contentTo: payloadContentEnd(markdown, contentFrom, to), to, populated: state.doc.sliceString(contentFrom, to).trim().length > 0 } : null;
    };
    let fields = snapshot ? writingFields(markdown, snapshot.document, uiText.fields) : [];
    if (!snapshot && markers.length && previous?.fields.length) {
      fields = previous.fields.flatMap(field => { const mapped = mapField(field); return mapped ? [mapped] : []; });
    }
    let notes = snapshot ? slideNotes(markdown, snapshot.document, uiText.notes.placeholder) : [];
    if (!snapshot && markers.length && previous) notes = previous.notes.flatMap(slot => {
      const field = slot.field && mapField(slot.field);
      return field ? [{ ...slot, at: field.from, field }] : [];
    });
    const noteFields = notes.flatMap(slot => slot.field && openedNotes.has(slot.slideId) ? [slot.field] : []);
    const entryPoints = new Set([...fields, ...noteFields].filter(field => field.contentFrom === field.to && field.to < state.doc.length).map(field => field.contentFrom));
    for (const slot of notes) if (!slot.field) entryPoints.add(slot.at);
    const ranges = markers.map(marker => Decoration.replace({
      block: true, inclusiveStart: !entryPoints.has(marker.from), ...(marker.label === null ? {} : { widget: new SlideBoundary(marker.label) }),
    }).range(marker.from, marker.label === null ? marker.markerTo : state.doc.lineAt(marker.from).to));
    ranges.push(...fieldDecorations(state, fields, previous?.fields ?? [], focused, entryPoints));
    ranges.push(...notesDecorations(state, notes, openedNotes, focused, entryPoints, this.notesActions));
    for (const section of snapshot?.document.sections ?? []) {
      const first = state.doc.sliceString(section.markerTo, section.to).search(/\S/);
      if (first >= 0) ranges.push(Decoration.line({ class: "markdownpoint-section-heading" }).range(state.doc.lineAt(section.markerTo + first).from));
    }
    return { id: markers.length ? id ?? null : null, snapshot, markers, fields, notes, openedNotes, focused, decorations: Decoration.set(ranges, true) };
  }
}
