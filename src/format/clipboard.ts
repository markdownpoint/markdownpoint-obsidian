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

import { compositionSources } from './capture.ts';
import type { CapturedPart, CapturedSlides } from './capture.ts';
import { indexPresentation } from './document.ts';
import { embeddedThemePaths, isThemeKey, themeDocument } from './embedded-theme.ts';
import { holdsOldWords } from './file-words.ts';
import { readJsonObject } from './json.ts';
import { isDocumentId, isRecord, isStableId } from './recognition.ts';
import { copyTextSchemas } from './text-schemas.ts';
import type { EmbeddedTheme } from './embedded-theme.ts';

export const SLIDE_CLIPBOARD_MIME = 'web application/x-markdownpoint-obsidian-slides+json';

export interface ClipboardOrigin {
    /** Device-local vault identity, not its display name or absolute filesystem path. */
    readonly vault: string;
    /** Vault-relative slides.md path captured by the copy operation. */
    readonly path: string;
    readonly document: string;
}

export interface SlideClipboard {
    /** A local cut owner must also recognize this token before reusing identities. */
    readonly token: string;
    readonly origin: ClipboardOrigin;
    readonly captured: CapturedSlides;
    readonly theme: EmbeddedTheme;
    readonly schemas: ReadonlyMap<string, ReadonlyMap<string, 'rich-text' | 'table'>>;
}

/** Only this plugin's versioned custom format carries whole slides. */
export function encodeSlideClipboard(
    token: string,
    origin: ClipboardOrigin,
    captured: CapturedSlides,
    theme: EmbeddedTheme
): string | null {
    const parts = (values: readonly CapturedPart[]) => values.map(({ id, markdown, record }) => ({ id, markdown, record }));
    const source = JSON.stringify({
        version: 2,
        token,
        origin: { vault: origin.vault, path: origin.path, document: origin.document },
        slides: parts(captured.slides),
        compositions: parts(captured.compositions),
        theme: {
            key: theme.key,
            id: theme.id,
            master: theme.master.source,
            layouts: [...theme.layouts].map(([key, document]) => ({ key, source: document.source }))
        }
    });
    return decodeSlideClipboard(source) ? source : null;
}

/** Validate untrusted transport data before identity preparation or file access. */
export function decodeSlideClipboard(source: string): SlideClipboard | null {
    const value = readJsonObject(source);
    if (
        !value ||
        value.version !== 2 ||
        !isDocumentId(value.token) ||
        !isRecord(value.origin) ||
        !isDocumentId(value.origin.vault) ||
        !isDocumentId(value.origin.document) ||
        typeof value.origin.path !== 'string' ||
        !Array.isArray(value.slides) ||
        !value.slides.length ||
        !Array.isArray(value.compositions) ||
        !isRecord(value.theme) ||
        !isThemeKey(value.theme.key) ||
        !isDocumentId(value.theme.id) ||
        typeof value.theme.master !== 'string' ||
        !Array.isArray(value.theme.layouts)
    )
        return null;
    const origin = { vault: value.origin.vault, path: value.origin.path, document: value.origin.document };
    const layouts = new Map<string, { source: string; value: Record<string, unknown> }>();
    for (const entry of value.theme.layouts) {
        if (!isRecord(entry) || typeof entry.key !== 'string' || typeof entry.source !== 'string' || layouts.has(entry.key)) return null;
        const parsed = themeDocument(entry.source, 'layout');
        if (!parsed) return null;
        layouts.set(entry.key, { source: entry.source, value: parsed });
    }
    const paths = embeddedThemePaths(origin.path, { theme: value.theme.key }, layouts.keys());
    const master = themeDocument(value.theme.master, 'master');
    if (!paths || !master || master.id !== value.theme.id) return null;
    const theme: EmbeddedTheme = {
        key: paths.key,
        id: value.theme.id,
        root: paths.root,
        master: { path: paths.master, source: value.theme.master, value: master },
        layouts: new Map([...layouts].map(([key, document]) => [key, { ...document, path: paths.layouts.get(key)! }]))
    };
    const slides: CapturedPart[] = [];
    const compositions: CapturedPart[] = [];
    const seen = new Set<string>();
    const referenced = new Set<string>();
    const schemas = new Map<string, ReadonlyMap<string, 'rich-text' | 'table'>>();
    for (const [kind, incoming, target] of [
        ['slide', value.slides, slides],
        ['composition', value.compositions, compositions]
    ] as const) {
        for (const part of incoming) {
            if (
                !isRecord(part) ||
                !isStableId(part.id) ||
                seen.has(part.id) ||
                typeof part.markdown !== 'string' ||
                typeof part.record !== 'string'
            )
                return null;
            seen.add(part.id);
            const document = indexPresentation(part.markdown, 0);
            const record = readJsonObject(part.record);
            // Every copy and paste passes here, so a record the MarkdownPoint app would refuse never reaches a destination
            if (record && holdsOldWords(record)) return null;
            const parts = kind === 'slide' ? document?.slides : document?.compositions;
            const indexed = parts?.[0];
            if (
                !document ||
                !record ||
                parts?.length !== 1 ||
                document.sections.length ||
                document[kind === 'slide' ? 'compositions' : 'slides'].length ||
                !indexed ||
                indexed.from !== 0 ||
                indexed.id !== part.id
            )
                return null;
            const fields = indexed.blocks.map(block => `${block.kind}:${block.id ?? ''}`);
            if (new Set(fields).size !== fields.length) return null;
            const sources = compositionSources(record, kind === 'slide');
            if (!sources) return null;
            for (const id of sources) referenced.add(id);
            const layout = typeof record.layout === 'string' ? layouts.get(record.layout) : undefined;
            const resolved = copyTextSchemas(
                indexed,
                kind,
                record,
                layout ? { master, layout: layout.value, layoutKey: String(record.layout) } : null
            );
            if (!resolved) return null;
            schemas.set(part.id, resolved);
            target.push({ id: part.id, markdown: part.markdown, record: part.record });
        }
    }
    const available = new Set(compositions.map(part => part.id));
    if ([...referenced].some(id => !available.has(id))) return null;
    return { token: value.token, origin, captured: { slides, compositions }, theme, schemas };
}
