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

import { ItemView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import type { OutlineState } from "./model.ts";
import { uiText } from "../ui-text.ts";

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
    this.contentEl.empty();
    const { presentation, activeSlideId } = this.delegate.state();
    const list = this.contentEl.createEl("ol", { cls: "markdownpoint-outline-list" });
    list.setAttribute("aria-label", uiText.outline);
    list.tabIndex = presentation?.slides.length ? -1 : 0;
    for (const [index, slide] of (presentation?.slides ?? []).entries()) {
      const row = list.createEl("li");
      const active = slide.id === activeSlideId;
      const button = row.createEl("button", {
        cls: "markdownpoint-outline-row",
        text: `${index + 1}. ${slide.title}`,
        attr: {
          type: "button",
          "data-slide-id": slide.id,
          "aria-current": String(active),
        },
      });
      button.tabIndex = active ? 0 : -1;
      button.addEventListener("click", () => this.delegate.selectSlide(slide.id));
    }
    if (ownsFocus) this.focusActive();
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
