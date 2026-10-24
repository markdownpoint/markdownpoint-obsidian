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

export const LOCAL_UI_KEY = "markdownpoint:ui";

export type OutlineSide = "left" | "right";

export interface LocalUiState {
  outlineSide: OutlineSide;
}

export interface LocalStorageHost {
  loadLocalStorage(key: string): unknown;
  saveLocalStorage(key: string, data: unknown): void;
}

export function loadLocalUi(host: LocalStorageHost): LocalUiState {
  const stored = host.loadLocalStorage(LOCAL_UI_KEY);
  if (
    typeof stored === "object" && stored !== null &&
    "outlineSide" in stored && (stored.outlineSide === "left" || stored.outlineSide === "right")
  ) {
    return { outlineSide: stored.outlineSide };
  }
  return { outlineSide: "right" };
}

export function saveLocalUi(host: LocalStorageHost, state: LocalUiState): void {
  host.saveLocalStorage(LOCAL_UI_KEY, { outlineSide: state.outlineSide });
}
