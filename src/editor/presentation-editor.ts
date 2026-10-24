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
import { fieldDecorations, focusWritingField } from "./field-widgets.ts";

const refreshPresentation = StateEffect.define<boolean>();
const editorFocus = StateEffect.define<boolean>();

interface DraftState {
  readonly snapshot: PresentationSnapshot | null;
  readonly markers: readonly DraftMarker[];
  readonly decorations: DecorationSet;
  readonly fields: readonly WritingField[];
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
  private running = false;

  constructor(private readonly reader: PresentationReader) {
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
        return { update: sync, destroy: () => { views.delete(view); container?.removeClass("markdownpoint-presentation"); } };
      }),
      EditorView.focusChangeEffect.of((_state, focused) => editorFocus.of(focused)),
      EditorView.atomicRanges.of(view => view.state.field(field).decorations),
      EditorState.transactionFilter.of(transaction => {
        const markers = transaction.startState.field(field).markers;
        const fields = transaction.startState.field(field).fields;
        if (!transaction.docChanged && transaction.selection && transaction.annotation(Transaction.userEvent) === "select" &&
          transaction.newSelection.ranges.length === 1 && transaction.newSelection.main.empty) {
          const compact = compactFieldAt(fields, transaction.newSelection.main.head, transaction.startState.doc.length);
          if (compact) return [transaction, {
            changes: { from: compact.contentFrom, insert: "\n" }, selection: { anchor: compact.contentFrom }, sequential: true,
          }];
        }
        return boundaryChangesAllowed(transaction, [...markers, ...fields.map(field => ({ from: field.from, markerTo: field.contentFrom }))]) ? transaction : [];
      }),
    ];
  }

  onload(): void { this.running = true; }
  onunload(): void { this.running = false; this.views.clear(); }

  focus(editor: Editor): boolean {
    const view = [...this.views].find(view => view.state.field(editorInfoField, false)?.editor === editor);
    if (!view || view.state.field(editorLivePreviewField, false) !== true) return false;
    const draft = view.state.field(this.field);
    if (!draft.markers.length) return false;
    if (view.state.selection.ranges.length !== 1 || !view.state.selection.main.empty) {
      view.focus();
      return true;
    }
    const head = view.state.selection.main.head;
    const field = draft.fields.find(field => head >= field.from && head < field.contentFrom);
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
        view.focus();
      }
    } else view.focus();
    return true;
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
    const file = state.field(editorInfoField, false)?.file;
    const preview = state.field(editorLivePreviewField, false) === true;
    const snapshot = file && preview
      ? this.reader.snapshot(file, state.doc.toString()) : null;
    let focused = previous?.focused ?? false;
    for (const effect of transaction?.effects ?? []) if (effect.is(editorFocus) || effect.is(refreshPresentation)) focused = effect.value;
    if (snapshot && previous?.snapshot === snapshot && !transaction?.selection && focused === previous.focused) return previous;
    let markers: readonly DraftMarker[] = [];
    if (snapshot) {
      const numbers = outlineSlideNumbers(snapshot.outline.slides, number => uiNumber.format(number));
      markers = [
        ...snapshot.document.slides.map(slide => ({ from: slide.from, markerTo: slide.markerTo, text: state.doc.sliceString(slide.from, slide.markerTo), label: numbers.get(slide.id) ?? "" })),
        ...snapshot.document.sections.map(section => ({ from: section.from, markerTo: section.markerTo, text: state.doc.sliceString(section.from, section.markerTo), label: null })),
      ];
    } else if (file && preview && previous?.markers.length && this.reader.matchesIdentity(file, state.doc.toString())) {
      // Incomplete Markdown (for example an unfinished code fence) must not
      // unlock known separators. Map them, then verify their actual source.
      const mapped = transaction?.docChanged ? previous.markers.map(marker => ({
        ...marker, from: transaction.changes.mapPos(marker.from, 1), markerTo: transaction.changes.mapPos(marker.markerTo, -1),
      })) : previous.markers;
      if (mapped.every(marker => marker.from < marker.markerTo && state.doc.lineAt(marker.from).from === marker.from &&
        state.doc.sliceString(marker.from, marker.markerTo) === marker.text)) markers = mapped;
    }
    let fields = snapshot ? writingFields(state.doc.toString(), snapshot.document, uiText.fields) : [];
    if (!snapshot && markers.length && previous?.fields.length) {
      fields = previous.fields.map(field => {
        const from = transaction?.docChanged ? transaction.changes.mapPos(field.from, 1) : field.from;
        const contentFrom = transaction?.docChanged ? transaction.changes.mapPos(field.contentFrom, -1) : field.contentFrom;
        const to = transaction?.docChanged ? transaction.changes.mapPos(field.to, 1) : field.to;
        return { ...field, from, contentFrom, to, populated: state.doc.sliceString(contentFrom, to).trim().length > 0 };
      }).filter(field => state.doc.lineAt(field.from).from === field.from && state.doc.sliceString(field.from, field.contentFrom) === field.markerText);
    }
    const entryPoints = new Set(fields.filter(field => field.contentFrom === field.to && field.to < state.doc.length).map(field => field.contentFrom));
    const ranges = markers.map(marker => Decoration.replace({
      block: true, inclusiveStart: !entryPoints.has(marker.from), ...(marker.label === null ? {} : { widget: new SlideBoundary(marker.label) }),
    }).range(marker.from, marker.label === null ? marker.markerTo : state.doc.lineAt(marker.from).to));
    ranges.push(...fieldDecorations(state, fields, previous?.fields ?? [], focused, entryPoints));
    for (const section of snapshot?.document.sections ?? []) {
      const first = state.doc.sliceString(section.markerTo, section.to).search(/\S/);
      if (first >= 0) ranges.push(Decoration.line({ class: "markdownpoint-section-heading" }).range(state.doc.lineAt(section.markerTo + first).from));
    }
    return { snapshot, markers, fields, focused, decorations: Decoration.set(ranges, true) };
  }
}
