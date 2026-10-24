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

/** Source before the one organizational blank line at a MarkdownPoint block boundary. */
export function payloadContentEnd(markdown: string, from: number, to: number): number {
  let end = to;
  // An unterminated tail of horizontal whitespace is not another empty line.
  while (end > from && (markdown[end - 1] === " " || markdown[end - 1] === "\t")) end--;
  if (end === from || markdown[end - 1] !== "\n") return end;
  let start = end - 1;
  if (start > from && markdown[start - 1] === "\r") start--;
  while (start > from && (markdown[start - 1] === " " || markdown[start - 1] === "\t")) start--;
  // Only that final wholly blank, terminated line is organizational. All
  // earlier lines, including leading/interior/trailing empty paragraphs, stay.
  return start === from || markdown[start - 1] === "\n" ? start : end;
}
