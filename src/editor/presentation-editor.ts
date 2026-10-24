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

import { StateEffect, StateField, EditorState } from "@codemirror/state";
import type { Extension, Transaction } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { Component, editorInfoField, editorLivePreviewField } from "obsidian";
import type { TFile } from "obsidian";
import type { PresentationReader, PresentationSnapshot } from "../presentation/reader.ts";
import { outlineSlideNumbers } from "../outline/model.ts";
import { uiNumber } from "../ui-text.ts";
import { boundaryChangesAllowed } from "./boundary-protection.ts";

const refreshPresentation = StateEffect.define<null>();

interface DraftState {
  readonly snapshot: PresentationSnapshot | null;
  readonly markers: readonly DraftMarker[];
  readonly decorations: DecorationSet;
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
  private readonly views = new Set<EditorView>();
  private readonly pending = new WeakSet<EditorView>();
  private running = false;

  constructor(private readonly reader: PresentationReader) {
    super();
    const field = StateField.define<DraftState>({
      create: state => this.build(state),
      update: (value, transaction) => {
        if (!transaction.docChanged && !transaction.reconfigured && !transaction.effects.length) return value;
        return this.build(transaction.state, value, transaction);
      },
      provide: field => EditorView.decorations.from(field, value => value.decorations),
    });
    const views = this.views;
    this.extension = [
      field,
      ViewPlugin.define(view => {
        views.add(view);
        return { destroy: () => { views.delete(view); } };
      }),
      EditorView.atomicRanges.of(view => view.state.field(field).decorations),
      EditorState.transactionFilter.of(transaction => {
        const markers = transaction.startState.field(field).markers;
        return boundaryChangesAllowed(transaction, markers) ? transaction : [];
      }),
    ];
  }

  onload(): void { this.running = true; }
  onunload(): void { this.running = false; this.views.clear(); }

  refresh(file: TFile): void {
    for (const view of this.views) {
      if (view.state.field(editorInfoField, false)?.file !== file || this.pending.has(view)) continue;
      this.pending.add(view);
      view.dom.ownerDocument.defaultView?.queueMicrotask(() => {
        this.pending.delete(view);
        if (this.running && this.views.has(view)) view.dispatch({ effects: refreshPresentation.of(null) });
      });
    }
  }

  private build(state: EditorState, previous?: DraftState, transaction?: Transaction): DraftState {
    const file = state.field(editorInfoField, false)?.file;
    const preview = state.field(editorLivePreviewField, false) === true;
    const snapshot = file && preview
      ? this.reader.snapshot(file, state.doc.toString()) : null;
    if (snapshot && previous?.snapshot === snapshot) return previous;
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
    if (previous?.snapshot === snapshot && previous.markers === markers) return previous;
    const ranges = markers.map(marker => Decoration.replace({
      block: true, ...(marker.label === null ? {} : { widget: new SlideBoundary(marker.label) }),
    }).range(marker.from, marker.label === null ? marker.markerTo : state.doc.lineAt(marker.from).to));
    return { snapshot, markers, decorations: Decoration.set(ranges, true) };
  }
}
