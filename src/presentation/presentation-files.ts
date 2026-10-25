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

import { TFile } from "obsidian";
import type { Vault } from "obsidian";
import { presentationPairNames } from "../format/recognition.ts";

/** Resolve both files from the live folder inventory for readers and the last write guard. */
export function presentationFiles(vault: Vault, memberPath: string): { markdown: TFile; companion: TFile } | null {
  const slash = memberPath.lastIndexOf("/");
  const folder = slash < 0 ? vault.getRoot() : vault.getFolderByPath(memberPath.slice(0, slash));
  if (!folder) return null;
  const files = folder.children.filter((entry): entry is TFile => entry instanceof TFile);
  const names = presentationPairNames(files.map(file => file.name));
  if (!names) return null;
  return { markdown: files.find(file => file.name === names.markdown)!, companion: files.find(file => file.name === names.companion)! };
}
