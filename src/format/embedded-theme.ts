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

import { parseTree } from "jsonc-parser";
import type { Node, ParseError } from "jsonc-parser";
import { isDocumentId, isRecord, isStableId, presentationCompanionPath } from "./recognition.ts";

export interface EmbeddedThemePaths {
  readonly id: string;
  readonly root: string;
  readonly master: string;
  readonly layouts: ReadonlyMap<string, string>;
}

/** Current format1 embedded snapshot paths; global Theme discovery is separate. */
export function embeddedThemePaths(markdownPath: string, companion: unknown, layoutKeys: Iterable<string>): EmbeddedThemePaths | null {
  if (!presentationCompanionPath(markdownPath) || markdownPath.includes("\\") ||
    markdownPath.split("/").some(part => !part || part === "." || part === "..") || !isRecord(companion) || !isDocumentId(companion.design)) return null;
  const keys = new Set(layoutKeys);
  for (const key of keys) {
    if (!isStableId(key) || key === "master" || key === "manifest" || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(key)) return null;
  }
  const root = markdownPath.slice(0, markdownPath.lastIndexOf("/") + 1) + `designs/${companion.design}`;
  return { id: companion.design, root, master: root + "/master.json", layouts: new Map([...keys].map(key => [key, `${root}/${key}.json`])) };
}

/** Read the JSON envelope without accepting ambiguous keys or nonfinite numbers. */
export function themeDocument(source: string, kind: "master" | "layout"): Record<string, unknown> | null {
  const content = source.startsWith("\uFEFF") ? source.slice(1) : source;
  const errors: ParseError[] = [];
  const root = parseTree(content, errors, { disallowComments: true, allowTrailingComma: false });
  if (!root || errors.length || root.type !== "object") return null;
  const pending: Node[] = [root];
  while (pending.length) {
    const node = pending.pop()!;
    if (node.type === "number" && !Number.isFinite(node.value)) return null;
    if (node.type === "object") {
      const names = (node.children ?? []).map(property => property.children![0]!.value as unknown);
      if (new Set(names).size !== names.length) return null;
    }
    pending.push(...node.children ?? []);
  }
  const value: unknown = JSON.parse(content);
  return isRecord(value) && value.markdownpoint === 1 && value.kind === kind ? value : null;
}
