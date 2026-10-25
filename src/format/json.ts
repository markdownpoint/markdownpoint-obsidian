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

import { parseTree } from 'jsonc-parser';
import type { Node, ParseError } from 'jsonc-parser';
import { isRecord } from './recognition.ts';

/** Strict JSON object input; preserve the original source separately when writing. */
export function readJsonObject(source: string): Record<string, unknown> | null {
    const content = source.startsWith('\uFEFF') ? source.slice(1) : source;
    const errors: ParseError[] = [];
    const root = parseTree(content, errors, { disallowComments: true, allowTrailingComma: false });
    if (!root || errors.length || root.type !== 'object') return null;
    const pending: Node[] = [root];
    while (pending.length) {
        const node = pending.pop()!;
        if (node.type === 'number' && !Number.isFinite(node.value)) return null;
        if (node.type === 'object') {
            const names = (node.children ?? []).map(property => property.children![0]!.value as unknown);
            if (new Set(names).size !== names.length) return null;
        }
        pending.push(...(node.children ?? []));
    }
    const value: unknown = JSON.parse(content);
    return isRecord(value) ? value : null;
}
