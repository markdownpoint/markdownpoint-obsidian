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

import type { EmbeddedTheme } from './embedded-theme.ts';
import { isThemeKey } from './embedded-theme.ts';
import { isDocumentId } from './recognition.ts';
import { orderedLayouts, prepareNewSlide } from './new-slide.ts';
import { readJsonObject } from './json.ts';

export interface NewPresentation {
    readonly markdown: string;
    readonly companion: string;
}

/** A presentation folder keeps its human name on both desktop platforms. */
export function presentationFolderName(value: string): string | null {
    const name = value.trim().normalize('NFC');
    return !name ||
        name.startsWith('.') ||
        name.endsWith('.') ||
        /[\\/<>:"|?*]/.test(name) ||
        /\p{Cc}/u.test(name) ||
        /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name)
        ? null
        : name;
}

/** One empty slide and one matching pair, without copying the theme's sample words. */
export function prepareNewPresentation(
    theme: EmbeddedTheme,
    document: string,
    slideId: string,
    layoutKey: string | undefined = orderedLayouts(theme)[0]
): NewPresentation | null {
    if (!isDocumentId(document) || !isThemeKey(theme.key) || !layoutKey) return null;
    const slide = prepareNewSlide(theme, layoutKey, slideId);
    const record = slide && readJsonObject(slide.record);
    if (!slide || !record) return null;
    return {
        markdown: `---\nmarkdownpoint: 1\ndocument: ${document}\n---\n\n${slide.markdown}`,
        companion:
            JSON.stringify({ markdownpoint: 1, kind: 'presentation', document, theme: theme.key, slides: { [slideId]: record } }, null, 2) +
            '\n'
    };
}
