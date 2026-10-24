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

import { Component } from "obsidian";
import type { ListSelection } from "../selection/list-selection.ts";
import type { SlideDropTarget } from "../format/reorder.ts";
import type { OutlineDelegate } from "./view.ts";

const slideDragType = "application/x-markdownpoint-outline";

/** Native drag lifetime belongs to this one outline and its current presentation. */
export class OutlineDrag extends Component {
  private source: { path: string; selection: ListSelection<string> } | null = null;
  private marker: { row: HTMLLIElement; edge: "before" | "after" } | null = null;

  constructor(private readonly content: HTMLElement, private readonly delegate: OutlineDelegate) {
    super();
    this.registerDomEvent(content, "dragstart", event => this.start(event));
    this.registerDomEvent(content, "dragover", event => {
      const target = this.target(event);
      if (!target) { this.showMarker(null); return; }
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      this.showMarker(target);
    });
    this.registerDomEvent(content, "dragleave", event => {
      const bounds = content.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom) this.showMarker(null);
    });
    this.registerDomEvent(content, "drop", event => {
      const target = this.target(event);
      this.finish();
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      this.delegate.reorder({ kind: "drop", target: target.destination });
    });
    this.registerDomEvent(content, "dragend", () => this.finish());
    this.registerDomEvent(content, "keydown", event => {
      if (event.key === "Escape") this.finish();
    });
  }

  onunload(): void { this.finish(); }

  sync(): void {
    if (this.source && !this.valid()) this.finish();
    for (const button of this.content.querySelectorAll<HTMLButtonElement>("button[data-slide-id]")) {
      button.toggleClass("is-dragging", this.source?.selection.selected.has(button.dataset.slideId ?? "") ?? false);
    }
    if (this.marker && !this.content.contains(this.marker.row)) this.showMarker(null);
  }

  private row(event: DragEvent): HTMLLIElement | null {
    const node = event.targetNode;
    const element = node?.instanceOf(HTMLElement) ? node : node?.parentElement;
    const row = element?.closest<HTMLLIElement>("li[data-outline-key]");
    return row && this.content.contains(row) ? row : null;
  }

  private start(event: DragEvent): void {
    const button = this.row(event)?.querySelector<HTMLButtonElement>("button[data-slide-id]");
    const id = button?.dataset.slideId;
    if (!id || !event.dataTransfer) return;
    const state = this.delegate.state();
    if (!state.presentation?.slides.some(slide => slide.id === id)) { event.preventDefault(); return; }
    if (!state.selection.selected.has(id)) this.delegate.select({ kind: "select", id });
    this.source = { path: state.presentation.path, selection: this.delegate.state().selection };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(slideDragType, "move");
    this.sync();
  }

  private valid(): boolean {
    const state = this.delegate.state();
    return this.source !== null && state.presentation?.path === this.source.path && state.selection === this.source.selection;
  }

  private target(event: DragEvent): { row: HTMLLIElement; edge: "before" | "after"; destination: SlideDropTarget } | null {
    if (!this.valid() || !event.dataTransfer?.types.includes(slideDragType)) return null;
    const row = this.row(event);
    const key = row?.getAttribute("data-outline-key");
    if (!row || !key) return null;
    if (key.startsWith("section:")) return { row, edge: "after", destination: { kind: "section", id: key.slice(8) } };
    if (!key.startsWith("slide:")) return null;
    const bounds = row.getBoundingClientRect();
    const edge = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    return { row, edge, destination: { kind: "slide", id: key.slice(6), edge } };
  }

  private showMarker(next: { row: HTMLLIElement; edge: "before" | "after" } | null): void {
    if (this.marker?.row === next?.row && this.marker?.edge === next?.edge) return;
    if (this.marker) this.marker.row.removeClass(`is-drop-${this.marker.edge}`);
    this.marker = next;
    if (next) next.row.addClass(`is-drop-${next.edge}`);
  }

  private finish(): void {
    this.source = null;
    this.showMarker(null);
    for (const button of this.content.querySelectorAll(".is-dragging")) button.removeClass("is-dragging");
  }
}
