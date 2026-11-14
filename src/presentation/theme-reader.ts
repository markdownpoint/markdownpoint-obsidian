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

import { TFile } from 'obsidian';
import type { Vault } from 'obsidian';
import { isUuid } from '../format/recognition.ts';
import { embeddedThemePaths, themeDocument } from '../format/embedded-theme.ts';
import type { EmbeddedTheme } from '../format/embedded-theme.ts';
import { readPresentationTheme } from '../readers/markdownpoint-readers.js';

/** Whether two reads of a file gave the same bytes. */
function sameBytes(first: ArrayBuffer, second: ArrayBuffer): boolean {
    if (first.byteLength !== second.byteLength) return false;
    const [left, right] = [new Uint8Array(first), new Uint8Array(second)];
    return left.every((byte, at) => byte === right[at]);
}

/** A theme file's text as Obsidian reads it, a byte order mark kept. */
const themeText = (bytes: ArrayBuffer) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);

/**
 * A presentation's theme as MarkdownPoint reads it, from every JSON file of its folder, with each of `layoutKeys` the theme
 * has and MarkdownPoint reads: none when MarkdownPoint reads no master there, as it then refuses every slide. Every file
 * of the folder decides that, so a folder whose files changed while they were read gives none, and no poll or retry.
 */
export async function readEmbeddedTheme(
    vault: Vault,
    markdownPath: string,
    companion: unknown,
    layoutKeys: Iterable<string>
): Promise<EmbeddedTheme | null> {
    const paths = embeddedThemePaths(markdownPath, companion, layoutKeys);
    if (!paths) return null;
    try {
        const listed = () =>
            (vault.getFolderByPath(paths.root)?.children ?? []).filter(
                (file): file is TFile => file instanceof TFile && file.name.toLowerCase().endsWith('.json')
            );
        const files = listed();
        const named = files.map(file => file.path);
        const bytes = await Promise.all(files.map(file => vault.readBinary(file)));
        const reading = readPresentationTheme(
            paths.key,
            files.map((file, at) => ({ name: file.name, bytes: new Uint8Array(bytes[at]!) }))
        );
        if (!reading.reads) return null;
        const reads = new Set(reading.theme.layouts.flatMap(layout => (layout.reads ? [layout.key] : [])));
        const targets = [
            { key: null, path: paths.master, type: 'master' as const },
            ...[...paths.layouts].flatMap(([key, path]) => (reads.has(key) ? [{ key, path, type: 'layout' as const }] : []))
        ];
        const documents = [];
        for (const target of targets) {
            const at = files.findIndex(file => `${paths.root}/${file.name}` === target.path);
            const file = files[at];
            const source = file && themeText(bytes[at]!);
            const value = source !== undefined && themeDocument(source, target.type);
            // The master is the theme's; a layout MarkdownPoint reads that the plugin doesn't is left out, as one it doesn't read
            if (!file || !value) {
                if (target.key === null) return null;
                continue;
            }
            documents.push({ ...target, file, document: { path: target.path, source, value } });
        }
        const again = await Promise.all(files.map(file => vault.readBinary(file)));
        const now = listed();
        if (
            now.length !== files.length ||
            // A file renamed keeps its object
            files.some((file, at) => file.path !== named[at] || !now.includes(file)) ||
            again.some((read, at) => !sameBytes(read, bytes[at]!))
        )
            return null;
        const id = documents[0]!.document.value.id;
        if (!isUuid(id)) return null;
        return {
            key: paths.key,
            id,
            root: paths.root,
            master: documents[0]!.document,
            layouts: new Map(documents.slice(1).map(read => [read.key!, read.document]))
        };
    } catch {
        return null;
    }
}
