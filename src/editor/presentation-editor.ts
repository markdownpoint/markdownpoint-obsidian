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
import type { Extension, TransactionSpec } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { Component, MarkdownView, editorInfoField, editorLivePreviewField } from "obsidian";
import type { Editor, TFile } from "obsidian";
import type { PresentationReader, PresentationSnapshot } from "../presentation/reader.ts";
import type { SlideImagePreview } from "../presentation/image-reader.ts";
import { imageSpacing, ImageSpace } from "./image-spacing.ts";
import { slideThumbnails } from "./thumbnail-widgets.ts";
import type { SlideStructure } from "../format/structure.ts";
import { outlineSlideNumbers } from "../outline/model.ts";
import { uiNumber, uiText } from "../ui-text.ts";
import { boundaryChangesAllowed, slideStructureChange } from "./boundary-protection.ts";
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
import { historyReorderSelection, slideReorderTransaction } from "./reorder.ts";
import type { SlideReorder } from "../format/reorder.ts";
import { undo, redo } from "@codemirror/commands";
import type { SlideData } from "../presentation/slide-data.ts";
import { planSlideDeletion } from "../format/delete.ts";
import { slideDeletionTransaction } from "./delete.ts";
import { historyBoundarySelection, slideEditTransactions } from "./structural-history.ts";
import { planSlideInsertion } from "../format/insert.ts";
import type { PreparedPart } from "../format/insert.ts";
import { slideInsertionTransaction } from "./insert.ts";

const refreshPresentation = StateEffect.define<boolean>();
const editorFocus = StateEffect.define<boolean>();
const noImageSpaces: ReadonlyMap<string, number> = new Map();

interface DraftState {
  readonly empty: boolean;
  readonly id: string | null;
  readonly snapshot: PresentationSnapshot | null;
  readonly markers: readonly DraftMarker[];
  readonly decorations: DecorationSet;
  readonly fields: readonly WritingField[];
  readonly notes: readonly SlideNotes[];
  readonly openedNotes: ReadonlySet<string>;
  readonly focused: boolean;
  readonly showImages: boolean;
  readonly imageSpaces: ReadonlyMap<string, number>;
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
}

class SlideBoundary extends WidgetType {
  constructor(private readonly label: string, private readonly slideId?: string) { super(); }
  eq(other: SlideBoundary): boolean { return this.label === other.label && this.slideId === other.slideId; }
  toDOM(view: EditorView): HTMLElement {
    const element = view.dom.ownerDocument.defaultView!.createDiv({ cls: "markdownpoint-slide-boundary" });
    if (this.slideId) element.dataset.slide = this.slideId;
    element.createSpan({ text: this.label, cls: "markdownpoint-slide-number" });
    return element;
  }
}

class EmptyDraft extends WidgetType {
  toDOM(view: EditorView): HTMLElement {
    return view.dom.ownerDocument.defaultView!.createDiv({ cls: "markdownpoint-empty-draft", text: uiText.slides.empty });
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
    private readonly data: SlideData | null = null,
    private readonly showSlideImages: () => boolean = () => true,
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
      imageSpacing,
      field,
      slideThumbnails(view => {
        const draft = view.state.field(field);
        return { id: draft.id, slides: new Map(draft.markers.flatMap(marker => marker.slideId ? [[marker.slideId, {
          structure: marker.structure ?? null, images: draft.showImages ? marker.images ?? [] : [],
        }] as const] : [])) };
      }),
      ViewPlugin.define(view => {
        views.add(view);
        let container: HTMLElement | null = null;
        const sync = () => {
          const info = view.state.field(editorInfoField, false);
          const next = info instanceof MarkdownView ? info.contentEl : null;
          if (container !== next) container?.removeClass("markdownpoint-presentation");
          container = next;
          const draft = view.state.field(field);
          container?.toggleClass("markdownpoint-presentation", draft.snapshot !== null || draft.markers.length > 0);
        };
        sync();
        this.reportCaret(view);
        return {
          update: update => {
            sync();
            for (const transaction of update.transactions) this.restoreHistoryCaret(view, transaction);
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
        const draft = transaction.startState.field(field);
        const markers = draft.markers;
        if (draft.empty && transaction.docChanged && transaction.annotation(slideStructureChange) !== true &&
          ["input", "delete", "move"].some(event => transaction.isUserEvent(event))) return [];
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

  history(editor: Editor, direction: "undo" | "redo"): boolean {
    const view = [...this.views].find(view => view.state.field(editorInfoField, false)?.editor === editor);
    const file = view?.state.field(editorInfoField, false)?.file;
    if (!this.running || !view || !file || !this.reader.matchesIdentity(file, view.state.doc.toString())) return false;
    const changed = (direction === "undo" ? undo : redo)({ state: view.state, dispatch: transaction => view.dispatch(transaction) });
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
      return plan && { companion, ids: selected,
        transaction: (current, livePreview) => slideDeletionTransaction(current, snapshot.document, plan, livePreview) };
    });
  }

  insertSlides(editor: Editor, slides: readonly PreparedPart[], afterSlideId: string | null, canApply: () => boolean, compositions: readonly PreparedPart[] = []): Promise<boolean> {
    const prepared = slides.map(slide => ({ ...slide }));
    const definitions = compositions.map(part => ({ ...part }));
    return this.editSlideRecords(editor, canApply, (state, snapshot, companion) => {
      const plan = planSlideInsertion(state.doc.toString(), snapshot.document, companion, prepared, afterSlideId, snapshot.bodyStart, definitions);
      if (!plan) return null;
      return { companion: plan.companion, ids: prepared.map(slide => slide.id), compositionIds: definitions.map(part => part.id),
        transaction: (current, livePreview) => slideInsertionTransaction(current, plan, prepared[0]!.id, livePreview, snapshot.bodyStart) };
    });
  }

  private async editSlideRecords(editor: Editor, canApply: () => boolean,
    prepare: (state: EditorState, snapshot: PresentationSnapshot, companion: string) =>
      { readonly companion: string; readonly ids: Iterable<string>; readonly compositionIds?: Iterable<string>;
        transaction(state: EditorState, livePreview: boolean): TransactionSpec | null } | null): Promise<boolean> {
    const view = [...this.views].find(view => view.state.field(editorInfoField, false)?.editor === editor);
    const owner = view?.state.field(editorInfoField, false);
    if (!this.running || !this.data || !view || !(owner instanceof MarkdownView) || !owner.file) return false;
    const file = owner.file;
    await this.reader.refreshView(owner);
    if (!this.running || !this.views.has(view) || owner.file !== file || owner.getMode() !== "source" || !canApply()) return false;
    const before = view.state.doc;
    const snapshot = this.reader.snapshot(file, before.toString());
    const companion = snapshot && this.reader.companionFor(file, snapshot);
    if (!snapshot || companion === null) return false;
    const plan = prepare(view.state, snapshot, companion);
    if (!plan || !await this.data.remember(file.path, snapshot.id, plan.companion, plan.ids, plan.compositionIds)) return false;
    if (!this.running || !this.views.has(view) || owner.file !== file || owner.getMode() !== "source" ||
      view.state.doc !== before || !this.reader.matchesIdentity(file, before.toString()) || !canApply()) return false;
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
    if (!transaction.docChanged || !(transaction.isUserEvent("undo") || transaction.isUserEvent("redo"))) return;
    const file = transaction.state.field(editorInfoField, false)?.file;
    if (!file) return;
    const before = transaction.startState.field(this.field).snapshot ?? this.reader.snapshot(file, transaction.startState.doc.toString());
    const after = transaction.state.field(this.field).snapshot ?? this.reader.snapshot(file, transaction.newDoc.toString());
    if (!before || !after || before.id !== after.id) return;
    const selection = historyReorderSelection(transaction, before.document, after.document) ??
      (transaction.state.field(editorLivePreviewField, false) === true
        ? historyBoundarySelection(transaction, before.document, after.document) : null);
    if (!selection) return;
    view.dom.ownerDocument.defaultView?.queueMicrotask(() => {
      if (this.running && this.views.has(view) && view.state.field(editorInfoField, false)?.file === file &&
        view.state.doc === transaction.newDoc && view.state.selection.eq(transaction.newSelection)) {
        view.dispatch({ selection, userEvent: "select.markdownpoint", scrollIntoView: true });
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
    const snapshot = file && preview
      ? this.reader.snapshot(file, markdown) : null;
    let focused = previous?.focused ?? false;
    for (const effect of transaction?.effects ?? []) if (effect.is(editorFocus) || effect.is(refreshPresentation)) focused = effect.value;
    const id = snapshot?.id ?? previous?.id;
    const openedNotes = this.notesUi.opened(id ?? "");
    const showImages = preview && this.showSlideImages();
    const spacing = state.field(imageSpacing, false);
    const imageSpaces = showImages && spacing && spacing.id === id ? spacing.heights : noImageSpaces;
    const selectionChanged = transaction?.selection && !transaction.startState.selection.eq(transaction.newSelection);
    if (snapshot && previous?.snapshot === snapshot && openedNotes === previous.openedNotes && !selectionChanged && focused === previous.focused && showImages === previous.showImages && imageSpaces === previous.imageSpaces) return previous;
    if (snapshot && !snapshot.document.slides.length && !snapshot.document.sections.length && !markdown.slice(snapshot.bodyStart).trim()) {
      return { id: snapshot.id, snapshot, empty: true, fields: [], notes: [], openedNotes, focused, showImages, imageSpaces,
        markers: [{ from: 0, markerTo: state.doc.length, text: markdown, label: null }],
        decorations: Decoration.set([Decoration.replace({ block: true, widget: new EmptyDraft() }).range(0, state.doc.length)]),
      };
    }
    let markers: readonly DraftMarker[] = [];
    if (snapshot) {
      const numbers = outlineSlideNumbers(snapshot.outline.slides, number => uiNumber.format(number));
      const structures = new Map(snapshot.outline.slides.map(slide => [slide.id, slide.structure]));
      markers = [
        ...snapshot.document.slides.map(slide => ({ from: slide.from, markerTo: slide.markerTo, text: state.doc.sliceString(slide.from, slide.markerTo), label: numbers.get(slide.id) ?? "", slideId: slide.id,
          structure: structures.get(slide.id), images: snapshot.images.get(slide.id), slideTo: slide.to })),
        ...snapshot.document.sections.map(section => ({ from: section.from, markerTo: section.markerTo, text: state.doc.sliceString(section.from, section.markerTo), label: null })),
      ];
    } else if (file && preview && previous?.markers.length && this.reader.matchesIdentity(file, markdown)) {
      // Incomplete Markdown (for example an unfinished code fence) must not
      // unlock known separators. Map them, then verify their actual source.
      const mapped = transaction?.docChanged ? previous.markers.map(marker => ({
        ...marker, from: transaction.changes.mapPos(marker.from, 1), markerTo: transaction.changes.mapPos(marker.markerTo, -1),
        ...(marker.slideTo !== undefined ? { slideTo: transaction.changes.mapPos(marker.slideTo, 1) } : {}),
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
      block: true, inclusiveStart: !entryPoints.has(marker.from), ...(marker.label === null ? { inclusiveEnd: false } : { widget: new SlideBoundary(marker.label, marker.slideId) }),
    }).range(marker.from, marker.label === null ? marker.markerTo : state.doc.lineAt(marker.from).to));
    ranges.push(...fieldDecorations(state, fields, previous?.fields ?? [], focused, entryPoints));
    ranges.push(...notesDecorations(state, notes, openedNotes, focused, entryPoints, this.notesActions));
    if (showImages) for (const marker of markers) {
      if (!marker.slideId || marker.slideTo === undefined || !marker.images?.length) continue;
      ranges.push(Decoration.widget({ block: true, side: marker.slideTo < state.doc.length ? 0 : 2,
        widget: new ImageSpace(marker.slideId, imageSpaces.get(marker.slideId) ?? 0) }).range(marker.slideTo));
    }
    for (const section of snapshot?.document.sections ?? []) {
      const first = state.doc.sliceString(section.markerTo, section.to).search(/\S/);
      if (first >= 0) ranges.push(Decoration.line({ class: `markdownpoint-section-heading${section === snapshot?.document.sections[0] ? " markdownpoint-first-section" : ""}` })
        .range(state.doc.lineAt(section.markerTo + first).from));
    }
    return { id: markers.length ? id ?? null : null, snapshot, empty: false, markers, fields, notes, openedNotes, focused, showImages, imageSpaces, decorations: Decoration.set(ranges, true) };
  }
}
