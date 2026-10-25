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

import { StateField } from '@codemirror/state';

// Headless stand-ins for the parts of Obsidian's API the tests reach. Vitest aliases 'obsidian' to this module;
// no DOM or Obsidian app is created. Live checks use Obsidian's real implementation.

export class Component {}
export class MarkdownView {}
export const editorInfoField = StateField.define({ create: () => ({ file: { path: 'Talk/slides.md' } }), update: value => value });
export const editorLivePreviewField = StateField.define({ create: () => true, update: value => value });
export const getLanguage = () => 'en';
export const setIcon = () => undefined;
export const setTooltip = () => undefined;

export class TFolder {
    path: string;
    parent: TFolder | null = null;
    children: (TFile | TFolder)[] = [];
    constructor(path: string) {
        this.path = path;
    }
    get name(): string {
        return this.path.split('/').at(-1)!;
    }
}
export class TFile {
    path: string;
    parent: TFolder | null = null;
    bytes: Uint8Array;
    stat: { mtime: number; size: number };
    constructor(path: string, bytes: Uint8Array, mtime: number) {
        this.path = path;
        this.bytes = bytes;
        this.stat = { mtime, size: bytes.length };
    }
    get name(): string {
        return this.path.split('/').at(-1)!;
    }
    get extension(): string {
        return this.name.split('.').at(-1)!;
    }
    get basename(): string {
        return this.name.slice(0, this.name.lastIndexOf('.'));
    }
}
export function getFrontMatterInfo(source: string) {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
    return { exists: !!match, frontmatter: match?.[1] ?? '', contentStart: match?.[0].length ?? 0 };
}
export function parseYaml(source: string): unknown {
    return Object.fromEntries(
        source.split('\n').map(line => {
            const at = line.indexOf(':');
            const value = line.slice(at + 1).trim();
            return [line.slice(0, at), /^\d+$/.test(value) ? Number(value) : value];
        })
    );
}
