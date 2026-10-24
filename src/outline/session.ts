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

import { reconcileSelection, selectionAfter, selectionOf } from "../selection/list-selection.ts";
import type { ListSelectionAction } from "../selection/list-selection.ts";
import type { OutlinePresentation, OutlineState } from "./model.ts";

/** Writing location and structural selection have independent identities. */
export class OutlineSession {
  private current: OutlineState = { presentation: null, activeSlideId: null, selection: selectionOf<string>([], null) };

  get state(): OutlineState { return this.current; }

  follow(presentation: OutlinePresentation | null): void {
    const order = presentation?.slides.map(slide => slide.id) ?? [];
    const same = presentation !== null && presentation.path === this.current.presentation?.path;
    const activeSlideId = same && order.includes(this.current.activeSlideId ?? "")
      ? this.current.activeSlideId : order[0] ?? null;
    const previous = same ? reconcileSelection(order, this.current.selection) : selectionOf<string>([], null);
    const selection = previous.selected.size ? previous
      : selectionOf(activeSlideId ? [activeSlideId] : [], activeSlideId);
    this.current = { presentation, activeSlideId, selection };
  }

  select(action: ListSelectionAction<string>): boolean {
    const order = this.current.presentation?.slides.map(slide => slide.id) ?? [];
    if (!order.length || (action.kind !== "all" && !order.includes(action.kind === "step" ? action.to : action.id))) return false;
    this.current = {
      ...this.current,
      selection: selectionAfter(order, this.current.selection, action),
      activeSlideId: action.kind === "select" ? action.id : this.current.activeSlideId,
    };
    return true;
  }

  activate(id: string): boolean {
    if (id === this.current.activeSlideId || !this.current.presentation?.slides.some(slide => slide.id === id)) return false;
    this.current = { ...this.current, activeSlideId: id };
    return true;
  }
}
