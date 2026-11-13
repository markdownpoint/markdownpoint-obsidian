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
import { isPortableName } from './file-paths.ts';
import { FORMAT_VERSION } from './format-version.ts';
import { isUuid } from './recognition.ts';
import { orderedLayouts, prepareNewSlide } from './new-slide.ts';
import { readJsonObject } from './json.ts';
import { NEW_PRESENTATION_BACKGROUND_IMAGE_STYLE } from '../core/new-presentation-style.ts';

export interface NewPresentation {
    readonly markdown: string;
    readonly companion: string;
}

/** A presentation folder keeps its human name on both desktop platforms. */
export function presentationFolderName(value: string): string | null {
    const name = value.trim().normalize('NFC');
    return isPortableName(name) && !name.startsWith('.') ? name : null;
}

/** The layout a new presentation starts on, as MarkdownPoint picks it: the first of these the theme has, else its first. */
export function firstSlideLayout(theme: EmbeddedTheme): string | undefined {
    return ['title', 'content-with-header', 'content', 'blank'].find(key => theme.layouts.has(key)) ?? orderedLayouts(theme)[0];
}

/**
 * One empty slide and one matching pair, without copying the theme's sample words. As MarkdownPoint's New does, a new
 * text box starts in the theme's body style where it has one, and backgrounds are generated in MarkdownPoint's own style.
 */
export function prepareNewPresentation(
    theme: EmbeddedTheme,
    id: string,
    slideId: string,
    layoutKey: string | undefined = firstSlideLayout(theme)
): NewPresentation | null {
    if (!isUuid(id) || !isThemeKey(theme.key) || !layoutKey) return null;
    const slide = prepareNewSlide(theme, layoutKey, slideId);
    const record = slide && readJsonObject(slide.record);
    if (!slide || !record) return null;
    return {
        markdown: `---\nmarkdownpoint: "${FORMAT_VERSION}"\nid: ${id}\n---\n\n${slide.markdown}`,
        companion:
            JSON.stringify(
                {
                    markdownpoint: FORMAT_VERSION,
                    type: 'presentation',
                    id,
                    theme: theme.key,
                    'background-image-style': NEW_PRESENTATION_BACKGROUND_IMAGE_STYLE,
                    slides: { [slideId]: record }
                },
                null,
                2
            ) + '\n'
    };
}
