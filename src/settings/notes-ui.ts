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

import type { LocalStorageHost } from "./local-ui.ts";

export const NOTES_UI_KEY = "markdownpoint:notes";
const closed: ReadonlySet<string> = new Set();

/** Disclosure state is local to the vault/device, keyed by stable presentation identity. */
export class NotesUi {
  private readonly documents = new Map<string, ReadonlySet<string>>();
  private readonly host: LocalStorageHost;

  constructor(host: LocalStorageHost) {
    this.host = host;
    const stored = host.loadLocalStorage(NOTES_UI_KEY);
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return;
    for (const [id, slides] of Object.entries(stored)) {
      if (Array.isArray(slides) && slides.every((slide: unknown) => typeof slide === "string")) this.documents.set(id, new Set<string>(slides));
    }
  }

  opened(id: string): ReadonlySet<string> { return this.documents.get(id) ?? closed; }

  setOpen(id: string, slideId: string, open: boolean): void {
    const next = new Set(this.opened(id));
    if (open) next.add(slideId);
    else next.delete(slideId);
    if (next.size) this.documents.set(id, next);
    else this.documents.delete(id);
    this.host.saveLocalStorage(NOTES_UI_KEY, Object.fromEntries([...this.documents].map(([id, slides]) => [id, [...slides]])));
  }
}
