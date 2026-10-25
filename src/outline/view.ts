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

import { ItemView, Menu, Platform, setIcon, setTooltip } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { outlineRows } from "./model.ts";
import type { OutlineState } from "./model.ts";
import type { ListSelection, ListSelectionAction } from "../selection/list-selection.ts";
import type { SlideReorder } from "../format/reorder.ts";
import { renderThumbnail } from "./thumbnail.ts";
import { OutlineDrag } from "./drag.ts";
import { uiNumber, uiText } from "../ui-text.ts";

export const OUTLINE_VIEW_TYPE = "markdownpoint-outline";

export interface OutlineDelegate {
  state(): OutlineState;
  newSlide(): void;
  select(action: ListSelectionAction<string>): void;
  reorder(action: SlideReorder): void;
  history(direction: "undo" | "redo"): void;
  selectForMenu(id: string): boolean;
  cutSlides(selection: ListSelection<string>, window: Window): void;
  copySlides(selection: ListSelection<string>, window: Window): void;
  pasteSlides(after: string | null, window: Window): void;
  deleteSlides(selection: ListSelection<string>): void;
}

export class MarkdownPointOutlineView extends ItemView {
  private readonly drag: OutlineDrag;

  constructor(leaf: WorkspaceLeaf, private readonly delegate: OutlineDelegate) {
    super(leaf);
    this.drag = this.addChild(new OutlineDrag(this.contentEl, delegate));
    this.registerDomEvent(this.contentEl, "contextmenu", event => {
      if (!this.delegate.state().presentation?.slides.length) this.menuFor(null, event);
    });
    this.registerDomEvent(this.contentEl, "keydown", event => {
      if (event.altKey) return;
      if (!event.ctrlKey && !event.metaKey && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
        const focused = this.contentEl.ownerDocument.activeElement;
        const button = focused?.instanceOf(HTMLElement) ? focused.closest<HTMLButtonElement>("button[data-slide-id]") : null;
        const id = button?.dataset.slideId;
        if (button && id) {
          event.preventDefault();
          event.stopPropagation();
          const bounds = button.getBoundingClientRect();
          this.menuFor(id)?.showAtPosition({ x: bounds.left, y: bounds.bottom }, button.ownerDocument);
        } else if (!this.delegate.state().presentation?.slides.length) {
          const bounds = this.contentEl.getBoundingClientRect();
          this.menuFor(null)?.showAtPosition({ x: bounds.left, y: bounds.top }, this.contentEl.ownerDocument);
          event.preventDefault(); event.stopPropagation();
        }
        return;
      }
      const modifier = Platform.isMacOS ? event.metaKey : event.ctrlKey;
      const key = event.key.toLowerCase();
      if (modifier && !event.shiftKey && ["c", "x", "v"].includes(key) && this.delegate.state().presentation) {
        event.preventDefault(); event.stopPropagation();
        const state = this.delegate.state(), window = this.contentEl.ownerDocument.defaultView!;
        if (key === "v") this.delegate.pasteSlides(state.selection.cursor ?? state.activeSlideId, window);
        else if (state.selection.selected.size) {
          if (key === "c") this.delegate.copySlides(state.selection, window);
          else this.delegate.cutSlides(state.selection, window);
        }
        return;
      }
      if (modifier && this.delegate.state().presentation &&
        (key === "z" || (!Platform.isMacOS && !event.shiftKey && key === "y"))) {
        event.preventDefault();
        event.stopPropagation();
        this.delegate.history(key === "y" || event.shiftKey ? "redo" : "undo");
        return;
      }
      if (modifier && !event.shiftKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        this.delegate.reorder({ kind: "step", direction: event.key === "ArrowUp" ? "up" : "down" });
        return;
      }
      if (modifier && !event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        event.stopPropagation();
        this.delegate.select({ kind: "all" });
        this.focusSelection();
        return;
      }
      if (event.ctrlKey || event.metaKey) return;
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      this.move(event.key, event.shiftKey);
    });
  }

  getViewType(): string { return OUTLINE_VIEW_TYPE; }
  getDisplayText(): string { return uiText.name; }
  getIcon(): string { return "list"; }

  onOpen(): Promise<void> {
    this.contentEl.addClass("markdownpoint-outline");
    this.render();
    return Promise.resolve();
  }

  onClose(): Promise<void> {
    return Promise.resolve();
  }

  render(): void {
    const ownsFocus = this.contentEl.contains(this.contentEl.ownerDocument.activeElement);
    const { presentation, activeSlideId, selection } = this.delegate.state();
    let toolbar = this.contentEl.querySelector<HTMLElement>(".markdownpoint-outline-toolbar");
    if (!toolbar) {
      toolbar = this.contentEl.createDiv({ cls: "markdownpoint-outline-toolbar" });
      toolbar.createSpan({ text: uiText.outline });
      const add = toolbar.createEl("button", { cls: "clickable-icon", attr: { type: "button", "aria-label": uiText.slides.new } });
      setIcon(add, "plus");
      setTooltip(add, uiText.slides.new);
      add.addEventListener("click", () => this.delegate.newSlide());
    }
    toolbar.querySelector("button")!.disabled = !presentation;
    const list = this.contentEl.querySelector("ol") ?? this.contentEl.createEl("ol", { cls: "markdownpoint-outline-list" });
    list.setAttribute("aria-label", uiText.outline);
    list.tabIndex = presentation?.slides.length ? -1 : 0;
    // Preserve unchanged rows while the author types; rebuilding the entire list
    // discards focused controls and makes large-deck edits pay for every DOM node.
    const slidesById = new Map(presentation?.slides.map(slide => [slide.id, slide]));
    const previous = new Map([...list.children].map(row => [row.getAttribute("data-outline-key"), row]));
    const rows = presentation ? outlineRows(presentation, number => uiNumber.format(number)) : [];
    const orderChanged = rows.length !== list.children.length || rows.some((item, index) =>
      list.children[index]?.getAttribute("data-outline-key") !== `${item.kind}:${item.id}`);
    for (const [index, item] of rows.entries()) {
      const key = `${item.kind}:${item.id}`;
      let row = previous.get(key);
      previous.delete(key);
      if (!row) {
        row = list.createEl("li", { attr: { "data-outline-key": key } });
        if (item.kind === "section") {
          row.createEl("h3", { cls: "markdownpoint-outline-section" });
        } else {
          const button = row.createEl("button", {
            cls: "markdownpoint-outline-row",
            attr: { type: "button", "data-slide-id": item.id, draggable: "true" },
          });
          button.createSpan({ cls: "markdownpoint-thumbnail" });
          button.createSpan({ cls: "markdownpoint-outline-title" });
          button.addEventListener("click", event => {
            const modifier = Platform.isMacOS ? event.metaKey : event.ctrlKey;
            this.delegate.select({ kind: event.shiftKey ? "range" : modifier ? "toggle" : "select", id: item.id });
            this.focusSelection();
          });
          button.addEventListener("contextmenu", event => { this.menuFor(item.id, event); });
        }
      }
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null);
      const control = item.kind === "section" ? row.querySelector("h3") : row.querySelector("button");
      if (item.kind === "section") {
        if (control?.textContent !== item.label) control?.setText(item.label);
      } else if (control) {
        if (control.getAttribute("aria-label") !== item.label) {
          control.querySelector(".markdownpoint-outline-title")?.setText(item.label);
          setTooltip(control, item.label);
        }
        const thumbnail = control.querySelector<HTMLElement>(".markdownpoint-thumbnail");
        if (thumbnail) renderThumbnail(thumbnail, slidesById.get(item.id)?.structure);
        const active = item.id === activeSlideId;
        if (control.getAttribute("aria-current") !== String(active)) control.setAttribute("aria-current", String(active));
        control.setAttribute("aria-pressed", String(selection.selected.has(item.id)));
        control.setAttribute("tabindex", item.id === selection.cursor ? "0" : "-1");
      }
    }
    for (const row of previous.values()) row.remove();
    this.drag.sync();
    // A sibling may move before the focused row without removing its DOM node.
    // Keep that cursor visible after ordering changes, but not on title edits.
    if (ownsFocus && (orderChanged || !this.contentEl.contains(this.contentEl.ownerDocument.activeElement))) this.focusSelection();
  }

  focusSelection(): void {
    const buttons = this.contentEl.querySelectorAll<HTMLButtonElement>("button[data-slide-id]");
    const cursor = this.delegate.state().selection.cursor;
    const chosen = [...buttons].find(button => button.dataset.slideId === cursor) ?? buttons[0];
    if (chosen) {
      chosen.focus({ preventScroll: true });
      chosen.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    else this.contentEl.querySelector("ol")?.focus({ preventScroll: true });
  }

  private menuFor(id: string | null, event?: MouseEvent): Menu | null {
    if (!this.delegate.state().presentation || (id !== null && !this.delegate.selectForMenu(id))) return null;
    this.focusSelection();
    const { presentation, selection } = this.delegate.state();
    const current = () => this.delegate.state().presentation?.path === presentation?.path &&
      this.delegate.state().presentation?.documentId === presentation?.documentId;
    const menu = event ? Menu.forEvent(event) : new Menu();
    if (id !== null) menu.addItem(entry => entry.setTitle(uiText.slides.cut({ count: selection.selected.size })).setIcon("scissors").onClick(() => {
      if (current()) this.delegate.cutSlides(selection, this.contentEl.ownerDocument.defaultView!);
    }));
    if (id !== null) menu.addItem(entry => entry.setTitle(uiText.slides.copy({ count: selection.selected.size })).setIcon("copy").onClick(() => {
      if (current()) this.delegate.copySlides(selection, this.contentEl.ownerDocument.defaultView!);
    }));
    menu.addItem(entry => entry.setTitle(uiText.slides.paste).setIcon("clipboard-paste").onClick(() => {
      if (current()) this.delegate.pasteSlides(id, this.contentEl.ownerDocument.defaultView!);
    }));
    if (id !== null) menu.addItem(entry => entry.setTitle(uiText.slides.delete({ count: selection.selected.size })).setIcon("trash-2").onClick(() => {
      if (current()) this.delegate.deleteSlides(selection);
    }));
    menu.onHide(() => { if (this.contentEl.isConnected && current()) this.focusSelection(); });
    return menu;
  }

  private move(key: string, extend: boolean): void {
    const { presentation, selection } = this.delegate.state();
    const slides = presentation?.slides ?? [];
    if (slides.length === 0) return;
    const at = slides.findIndex(slide => slide.id === selection.cursor);
    const next = key === "Home" ? 0 : key === "End" ? slides.length - 1
      : Math.max(0, Math.min(slides.length - 1, at + (key === "ArrowUp" ? -1 : 1)));
    const slide = slides[next];
    if (slide) {
      if (extend && key.startsWith("Arrow")) this.delegate.select({ kind: "step", to: slide.id });
      else this.delegate.select({ kind: extend ? "range" : "select", id: slide.id });
    }
    this.focusSelection();
  }
}
