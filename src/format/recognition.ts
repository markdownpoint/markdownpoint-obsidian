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

export function presentationCompanionPath(markdownPath: string): string | null {
  const slash = markdownPath.lastIndexOf("/");
  if (markdownPath.slice(slash + 1) !== "slides.md") return null;
  return markdownPath.slice(0, slash + 1) + "presentation.mdpoint";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recognizes the pair's identity only, not its layouts or full format conformance.
 * Both files must explicitly declare format 1 and the same lowercase UUID;
 * a similarly named ordinary note or a mismatched companion stays ordinary Markdown.
 */
export function presentationIdentity(frontmatter: unknown, companion: unknown): string | null {
  if (!isRecord(frontmatter) || !isRecord(companion)) return null;
  if (frontmatter.markdownpoint !== 1 || companion.markdownpoint !== 1 || companion.kind !== "presentation") return null;
  const document = frontmatter.document;
  if (typeof document !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(document)) return null;
  return companion.document === document ? document : null;
}
