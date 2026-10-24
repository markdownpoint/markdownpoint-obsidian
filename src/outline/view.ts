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

import { ItemView, setTooltip } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { outlineRows } from "./model.ts";
import type { OutlineState } from "./model.ts";
import { uiNumber, uiText } from "../ui-text.ts";

export const OUTLINE_VIEW_TYPE = "markdownpoint-outline";

export interface OutlineDelegate {
  state(): OutlineState;
  selectSlide(id: string): void;
}

export class MarkdownPointOutlineView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private readonly delegate: OutlineDelegate) {
    super(leaf);
    this.registerDomEvent(this.contentEl, "keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      this.move(event.key);
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
    const { presentation, activeSlideId } = this.delegate.state();
    const list = this.contentEl.querySelector("ol") ?? this.contentEl.createEl("ol", { cls: "markdownpoint-outline-list" });
    list.setAttribute("aria-label", uiText.outline);
    list.tabIndex = presentation?.slides.length ? -1 : 0;
    // Preserve unchanged rows while the author types; rebuilding the entire list
    // discards focused controls and makes large-deck edits pay for every DOM node.
    const previous = new Map([...list.children].map(row => [row.getAttribute("data-outline-key"), row]));
    const rows = presentation ? outlineRows(presentation, number => uiNumber.format(number)) : [];
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
            attr: { type: "button", "data-slide-id": item.id },
          });
          button.createSpan({ cls: "markdownpoint-outline-title" });
          button.addEventListener("click", () => this.delegate.selectSlide(item.id));
        }
      }
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null);
      const control = item.kind === "section" ? row.querySelector("h3") : row.querySelector("button");
      if (item.kind === "section") {
        if (control?.textContent !== item.label) control?.setText(item.label);
      } else if (control) {
        if (control.getAttribute("aria-label") !== item.label) {
          control.firstElementChild?.setText(item.label);
          setTooltip(control, item.label);
        }
        const active = item.id === activeSlideId;
        if (control.getAttribute("aria-current") !== String(active)) control.setAttribute("aria-current", String(active));
        control.setAttribute("tabindex", active ? "0" : "-1");
      }
    }
    for (const row of previous.values()) row.remove();
    if (ownsFocus && !this.contentEl.contains(this.contentEl.ownerDocument.activeElement)) this.focusActive();
  }

  focusActive(): void {
    const buttons = this.contentEl.querySelectorAll<HTMLButtonElement>("button[data-slide-id]");
    const chosen = [...buttons].find(button => button.getAttribute("aria-current") === "true") ?? buttons[0];
    if (chosen) chosen.focus({ preventScroll: true });
    else this.contentEl.querySelector("ol")?.focus({ preventScroll: true });
  }

  private move(key: string): void {
    const { presentation, activeSlideId } = this.delegate.state();
    const slides = presentation?.slides ?? [];
    if (slides.length === 0) return;
    const at = slides.findIndex(slide => slide.id === activeSlideId);
    const next = key === "Home" ? 0 : key === "End" ? slides.length - 1
      : Math.max(0, Math.min(slides.length - 1, at + (key === "ArrowUp" ? -1 : 1)));
    const slide = slides[next];
    if (slide) this.delegate.selectSlide(slide.id);
    this.focusActive();
  }
}
