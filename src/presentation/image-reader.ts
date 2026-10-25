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

import type { SlideImageReference } from "../format/slide-images.ts";

export interface SlideImagePreview { readonly path: string; readonly src: string; readonly name: string | null }
interface ImageVault<File> { getFileByPath(path: string): File | null; getResourcePath(file: File): string }

/** Resolve only existing vault files, then cap the visible column at five images. */
export function readSlideImages<File>(vault: ImageVault<File>, references: readonly SlideImageReference[]): readonly SlideImagePreview[] {
  const images: SlideImagePreview[] = [];
  for (const reference of references) {
    const file = vault.getFileByPath(reference.path);
    if (!file) continue;
    images.push({ path: reference.path, src: vault.getResourcePath(file), name: reference.name });
    if (images.length === 5) break;
  }
  return images;
}
