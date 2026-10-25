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

import { StateEffect, StateField } from "@codemirror/state";
import { WidgetType } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";

export interface ImageSpacing { readonly id: string | null; readonly heights: ReadonlyMap<string, number> }
export const setImageSpacing = StateEffect.define<ImageSpacing>();
export const imageSpacing = StateField.define<ImageSpacing>({
  create: () => ({ id: null, heights: new Map() }),
  update: (value, transaction) => {
    for (const effect of transaction.effects) if (effect.is(setImageSpacing)) return effect.value;
    return value;
  },
});

export function imageSpaceNeeded(columnBottom: number, contentEnd: number): number {
  return Math.max(0, Math.ceil(columnBottom - contentEnd));
}

export class ImageSpace extends WidgetType {
  private readonly id: string;
  private readonly height: number;
  constructor(id: string, height: number) { super(); this.id = id; this.height = height; }
  eq(other: ImageSpace): boolean { return this.id === other.id && this.height === other.height; }
  get estimatedHeight(): number { return this.height; }
  toDOM(view: EditorView): HTMLElement {
    const element = view.dom.ownerDocument.defaultView!.createDiv({ cls: "markdownpoint-slide-image-space", attr: { "data-slide-end": this.id, "aria-hidden": "true" } });
    element.style.setProperty("--markdownpoint-image-space", `${this.height}px`);
    return element;
  }
}
