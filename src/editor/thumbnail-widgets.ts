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

import { ViewPlugin } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import { setTooltip } from "obsidian";
import type { SlideStructure } from "../format/structure.ts";
import { renderThumbnail } from "../outline/thumbnail.ts";
import { uiText } from "../ui-text.ts";

/** Editor chrome lives outside paint-contained CodeMirror blocks, leaving text geometry intact. */
export function slideThumbnails(structures: (view: EditorView) => ReadonlyMap<string, SlideStructure>) {
  return ViewPlugin.define(view => {
    const host = view.scrollDOM.createDiv({ cls: "markdownpoint-slide-tools-layer" });
    const buttons = new Map<string, HTMLButtonElement>();
    let active = true;
    const measure = () => view.requestMeasure({ key: host,
      read: () => {
        const available = structures(view), bounds = host.getBoundingClientRect(), content = view.contentDOM.getBoundingClientRect();
        const viewport = view.scrollDOM.getBoundingClientRect();
        const items: { id: string; structure: SlideStructure; top: number; right: number }[] = [];
        for (const boundary of view.contentDOM.querySelectorAll<HTMLElement>(".markdownpoint-slide-boundary[data-slide]")) {
          const id = boundary.dataset.slide!, structure = available.get(id);
          if (!structure) continue;
          let next = boundary.nextElementSibling;
          while (next && !next.matches(".markdownpoint-field-header, .markdownpoint-slide-boundary")) next = next.nextElementSibling;
          const top = (next?.matches(".markdownpoint-field-header") ? next.getBoundingClientRect().top : boundary.getBoundingClientRect().bottom) - bounds.top;
          if (top + bounds.top < viewport.top - 60 || top + bounds.top > viewport.bottom) continue;
          items.push({ id, structure, top, right: bounds.right - content.right });
        }
        return items;
      },
      write: items => {
        if (!active) return;
        const keep = new Set(items.map(item => item.id));
        for (const [id, button] of buttons) if (!keep.has(id)) { button.remove(); buttons.delete(id); }
        for (const { id, structure, top, right } of items) {
          let button = buttons.get(id);
          if (!button) {
            button = host.createEl("button", { cls: "markdownpoint-slide-tools markdownpoint-thumbnail",
              attr: { type: "button", "data-slide": id, "aria-label": uiText.slides.actions } });
            buttons.set(id, button);
            setTooltip(button, uiText.slides.actions);
            const control = button;
            const menu = () => {
              const bounds = control.getBoundingClientRect();
              control.dispatchEvent(new view.dom.ownerDocument.defaultView!.MouseEvent("contextmenu", {
                bubbles: true, cancelable: true, button: 2, clientX: bounds.left, clientY: bounds.top,
              }));
            };
            button.addEventListener("click", event => { event.preventDefault(); menu(); });
            button.addEventListener("keydown", event => {
              if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); event.stopPropagation(); menu(); }
            });
          }
          renderThumbnail(button, structure);
          button.style.setProperty("--markdownpoint-thumbnail-top", `${top}px`);
          button.style.setProperty("--markdownpoint-thumbnail-right", `${right}px`);
        }
      },
    });
    view.scrollDOM.addEventListener("scroll", measure, { passive: true });
    measure();
    return {
      update: measure,
      destroy: () => { active = false; view.scrollDOM.removeEventListener("scroll", measure); host.remove(); },
    };
  });
}
