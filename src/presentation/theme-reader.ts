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

import { embeddedThemePaths, themeDocument } from "../format/embedded-theme.ts";
import type { EmbeddedTheme } from "../format/embedded-theme.ts";

interface ThemeVault<File> {
  getFileByPath(path: string): File | null;
  read(file: File): Promise<string>;
}

/** A user operation reads its required embedded documents once and verifies the same bytes before returning. */
export async function readEmbeddedTheme<File>(vault: ThemeVault<File>, markdownPath: string, companion: unknown,
  layoutKeys: Iterable<string>): Promise<EmbeddedTheme | null> {
  const paths = embeddedThemePaths(markdownPath, companion, layoutKeys);
  if (!paths) return null;
  const targets = [{ key: null, path: paths.master, kind: "master" as const },
    ...[...paths.layouts].map(([key, path]) => ({ key, path, kind: "layout" as const }))];
  try {
    const reads = await Promise.all(targets.map(async target => {
      const file = vault.getFileByPath(target.path);
      if (!file) return null;
      const source = await vault.read(file), value = themeDocument(source, target.kind);
      return value ? { ...target, file, document: { path: target.path, source, value } } : null;
    }));
    if (reads.some(read => read === null)) return null;
    const documents = reads.filter(read => read !== null);
    const stable = await Promise.all(documents.map(async read =>
      vault.getFileByPath(read.path) === read.file && await vault.read(read.file) === read.document.source &&
      vault.getFileByPath(read.path) === read.file));
    if (stable.some(value => !value)) return null;
    return { id: paths.id, root: paths.root, master: documents[0]!.document,
      layouts: new Map(documents.slice(1).map(read => [read.key!, read.document])) };
  } catch { return null; }
}
