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

import { readJsonObject } from './json.ts';
import { isDocumentId, isRecord, isStableId, presentationCompanionPath } from './recognition.ts';

export interface EmbeddedThemeDocument {
    readonly path: string;
    readonly source: string;
    readonly value: Readonly<Record<string, unknown>>;
}

export interface EmbeddedTheme {
    readonly key: string;
    readonly id: string;
    readonly root: string;
    readonly master: EmbeddedThemeDocument;
    readonly layouts: ReadonlyMap<string, EmbeddedThemeDocument>;
}

export interface EmbeddedThemePaths {
    readonly key: string;
    readonly root: string;
    readonly master: string;
    readonly layouts: ReadonlyMap<string, string>;
}

/** Theme folder keys are readable stable names that every supported filesystem accepts. */
export function isThemeKey(value: unknown): value is string {
    return isStableId(value) && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(value);
}

/** Current format1 embedded snapshot paths; global Theme discovery is separate. */
export function embeddedThemePaths(markdownPath: string, companion: unknown, layoutKeys: Iterable<string>): EmbeddedThemePaths | null {
    if (
        !presentationCompanionPath(markdownPath) ||
        markdownPath.includes('\\') ||
        markdownPath.split('/').some(part => !part || part === '.' || part === '..') ||
        !isRecord(companion) ||
        !isThemeKey(companion.theme)
    )
        return null;
    const keys = new Set(layoutKeys);
    for (const key of keys) {
        if (!isThemeKey(key) || key === 'master' || key === 'manifest') return null;
    }
    const root = markdownPath.slice(0, markdownPath.lastIndexOf('/') + 1) + `themes/${companion.theme}`;
    return {
        key: companion.theme,
        root,
        master: root + '/master.json',
        layouts: new Map([...keys].map(key => [key, `${root}/${key}.json`]))
    };
}

/** Validate the supported Theme envelope while keeping its original source separately. */
export function themeDocument(source: string, kind: 'master' | 'layout'): Record<string, unknown> | null {
    const value = readJsonObject(source);
    return value?.markdownpoint === 1 && value.kind === kind && (kind !== 'master' || isDocumentId(value.id)) ? value : null;
}

/** Files declared by a theme's media objects, overrides, and embedded fonts. */
export function themeAssetPaths(theme: EmbeddedTheme): readonly string[] | null {
    const paths = new Set<string>();
    const add = (value: unknown): boolean => {
        if (value === undefined || value === null) return true;
        if (
            typeof value !== 'string' ||
            !value ||
            value.includes('\\') ||
            value.includes(':') ||
            value.split('/').some(part => !part || part.startsWith('.')) ||
            ['manifest.json', 'previews', 'example'].includes(value.split('/')[0]!)
        )
            return false;
        paths.add(value);
        return true;
    };
    for (const document of [theme.master, ...theme.layouts.values()]) {
        const level = document.value;
        const own: readonly unknown[] = Array.isArray(level.objects) ? level.objects : [];
        const objects = [...own, ...(isRecord(level.overrides) ? Object.values(level.overrides) : [])];
        for (const object of objects) {
            if (!isRecord(object)) continue;
            const assets = isRecord(object.asset) ? Object.values(object.asset) : [object.asset];
            if (!assets.every(add)) return null;
            if (typeof object['poster-frame'] === 'string' && !add(object['poster-frame'])) return null;
        }
    }
    const fonts = theme.master.value['font-files'];
    if (isRecord(fonts)) for (const files of Object.values(fonts)) if (!Array.isArray(files) || !files.every(add)) return null;
    return [...paths];
}
