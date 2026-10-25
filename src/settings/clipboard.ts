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
import { isDocumentId } from "../format/recognition.ts";

export const CLIPBOARD_VAULT_KEY = "markdownpoint:clipboard-vault";

/** A local origin identity is stable across reloads and never enters synced settings. */
export function clipboardVaultId(host: LocalStorageHost, mint: () => string = () => crypto.randomUUID()): string {
  const stored = host.loadLocalStorage(CLIPBOARD_VAULT_KEY);
  if (isDocumentId(stored)) return stored;
  const id = mint();
  if (!isDocumentId(id)) throw new Error("Invalid clipboard vault identity");
  host.saveLocalStorage(CLIPBOARD_VAULT_KEY, id);
  return id;
}
