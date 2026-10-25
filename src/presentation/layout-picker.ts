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

import { Modal } from "obsidian";
import type { App } from "obsidian";
import type { EmbeddedTheme } from "../format/embedded-theme.ts";
import { layoutName, orderedLayouts } from "../format/new-slide.ts";
import { slideStructure } from "../format/structure.ts";
import { renderThumbnail } from "../outline/thumbnail.ts";
import { uiText } from "../ui-text.ts";

export class LayoutPicker extends Modal {
  constructor(app: App, private readonly theme: EmbeddedTheme, private readonly choose: (key: string) => void) { super(app); }

  onOpen(): void {
    this.setTitle(uiText.slides.new);
    this.modalEl.addClass("markdownpoint-layout-picker");
    const grid = this.contentEl.createDiv({ cls: "markdownpoint-layout-grid" });
    const buttons: HTMLButtonElement[] = [];
    for (const key of orderedLayouts(this.theme)) {
      const layout = this.theme.layouts.get(key)!;
      const name = layoutName(key, layout.value);
      const button = grid.createEl("button", { cls: "markdownpoint-layout-choice", attr: { type: "button", "aria-label": name } });
      renderThumbnail(button.createSpan({ cls: "markdownpoint-thumbnail" }), slideStructure({ layout: key }, this.theme));
      button.createSpan({ cls: "markdownpoint-layout-name", text: name });
      button.addEventListener("click", () => { this.close(); this.choose(key); });
      buttons.push(button);
    }
    grid.addEventListener("keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      const at = buttons.findIndex(button => button === grid.ownerDocument.activeElement);
      if (at < 0) return;
      const columns = buttons.filter(button => button.offsetTop === buttons[0]?.offsetTop).length;
      const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : at +
        (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -columns : columns);
      event.preventDefault();
      buttons[Math.max(0, Math.min(buttons.length - 1, index))]?.focus();
    });
    buttons[0]?.focus();
  }

  onClose(): void { this.contentEl.empty(); }
}
