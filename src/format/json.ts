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

/** JSON as MarkdownPoint reads it: past a byte order mark before it. */
export function withoutByteOrderMark(source: string): string {
    return source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
}

/**
 * The most levels a value may nest, the outermost counted as the first, as MarkdownPoint reads its JSON files: it refuses a
 * file nested deeper, since copying such a value overflows the call stack.
 */
const MAX_JSON_DEPTH = 256;

/** Whether the JSON text's objects and arrays nest past MAX_JSON_DEPTH, counted outside its strings before any parse. */
function nestsTooDeep(content: string): boolean {
    let depth = 0;
    let inString = false;
    for (let at = 0; at < content.length; at++) {
        const code = content.charCodeAt(at);
        if (inString) {
            // A backslash escapes the character after it, a quotation mark among them
            if (code === 0x5c) at++;
            else if (code === 0x22) inString = false;
        } else if (code === 0x22) inString = true;
        else if (code === 0x7b || code === 0x5b) {
            if (++depth > MAX_JSON_DEPTH) return true;
        } else if (code === 0x7d || code === 0x5d) depth--;
    }
    return false;
}

/** Strict JSON object input; preserve the original source separately when writing. */
export function readJsonObject(source: string): Record<string, unknown> | null {
    const content = withoutByteOrderMark(source);
    // Before the parse, whose reader descends one call a level
    if (nestsTooDeep(content)) return null;
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
        // One at a time: an array of more values than a call takes arguments is JSON too.
        for (const child of node.children ?? []) pending.push(child);
    }
    const value: unknown = JSON.parse(content);
    return isRecord(value) ? value : null;
}
