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

import type { EmbeddedTheme } from '../format/embedded-theme.ts';
import { themeDocument } from '../format/embedded-theme.ts';
import blank from './basic/blank.json?raw';
import contentWithHeader from './basic/content-with-header.json?raw';
import content from './basic/content.json?raw';
import imageTextWithHeader from './basic/image-text-with-header.json?raw';
import imageText from './basic/image-text.json?raw';
import imageWithHeader from './basic/image-with-header.json?raw';
import image from './basic/image.json?raw';
import master from './basic/master.json?raw';
import layoutPreview from './basic/media/layout-preview.jpg';
import oneLiner from './basic/one-liner.json?raw';
import section from './basic/section.json?raw';
import solidColor from './basic/solid-color.json?raw';
import textImageWithHeader from './basic/text-image-with-header.json?raw';
import textImage from './basic/text-image.json?raw';
import title from './basic/title.json?raw';

const layouts = {
    blank,
    'content-with-header': contentWithHeader,
    content,
    'image-text-with-header': imageTextWithHeader,
    'image-text': imageText,
    'image-with-header': imageWithHeader,
    image,
    'one-liner': oneLiner,
    section,
    'solid-color': solidColor,
    'text-image-with-header': textImageWithHeader,
    'text-image': textImage,
    title
};

// Each file as MarkdownPoint ships it, byte for byte, so a slide pasted between a presentation the app made and one the
// plugin made finds the same theme.
const documents: ReadonlyMap<string, string> = new Map(
    Object.entries({ master, ...layouts }).map(([key, source]) => [`${key}.json`, source])
);

/**
 * MarkdownPoint's Basic theme as a new presentation holds it, by each file's path in the theme: its master, its layouts
 * and the picture its image layouts hold. Provenance is in THIRD_PARTY_NOTICES.md.
 */
export const basicThemeFiles: ReadonlyMap<string, string | Uint8Array> = new Map<string, string | Uint8Array>([
    ...documents,
    ['media/layout-preview.jpg', layoutPreview]
]);

const root = 'themes/basic';
const embeddedDocument = (key: string, type: 'master' | 'layout') => {
    const source = documents.get(`${key}.json`)!;
    return { path: `${root}/${key}.json`, source, value: themeDocument(source, type)! };
};
const masterDocument = embeddedDocument('master', 'master');
export const basicTheme: EmbeddedTheme = {
    key: 'basic',
    id: masterDocument.value.id as string,
    root,
    master: masterDocument,
    layouts: new Map(Object.keys(layouts).map(key => [key, embeddedDocument(key, 'layout')]))
};
