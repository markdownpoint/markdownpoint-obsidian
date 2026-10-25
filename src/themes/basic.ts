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
import blank from './basic/blank.json' with { type: 'json' };
import contentWithHeader from './basic/content-with-header.json' with { type: 'json' };
import content from './basic/content.json' with { type: 'json' };
import imageTextWithHeader from './basic/image-text-with-header.json' with { type: 'json' };
import imageText from './basic/image-text.json' with { type: 'json' };
import imageWithHeader from './basic/image-with-header.json' with { type: 'json' };
import image from './basic/image.json' with { type: 'json' };
import master from './basic/master.json' with { type: 'json' };
import oneLiner from './basic/one-liner.json' with { type: 'json' };
import section from './basic/section.json' with { type: 'json' };
import solidColor from './basic/solid-color.json' with { type: 'json' };
import textImageWithHeader from './basic/text-image-with-header.json' with { type: 'json' };
import textImage from './basic/text-image.json' with { type: 'json' };
import title from './basic/title.json' with { type: 'json' };

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

/** Published Basic theme, adapted to the current format; provenance is in THIRD_PARTY_NOTICES.md. */
export const basicThemeFiles: ReadonlyMap<string, string> = new Map(
    Object.entries({ master, ...layouts }).map(([key, value]) => [`${key}.json`, JSON.stringify(value, null, 2) + '\n'])
);

const root = 'themes/basic';
const embeddedDocument = (key: string, value: Record<string, unknown>) => ({
    path: `${root}/${key}.json`,
    source: basicThemeFiles.get(`${key}.json`)!,
    value
});
export const basicTheme: EmbeddedTheme = {
    key: 'basic',
    id: master.id,
    root,
    master: embeddedDocument('master', master),
    layouts: new Map(Object.entries(layouts).map(([key, value]) => [key, embeddedDocument(key, value)]))
};
