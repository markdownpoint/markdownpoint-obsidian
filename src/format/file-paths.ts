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

/**
 * Windows' device names, which a file or folder can't take with any extension, in any case: `con`, `nul.txt`,
 * `COM1.tar.gz`, and the ports numbered with a superscript, `COM¹` to `LPT³`.
 */
const DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;

/**
 * A file or folder name every supported system holds as written, as MarkdownPoint reads one: no character Windows
 * refuses, no control character and no separator, not ending in a space or a dot, and no device name with any extension.
 */
export function isPortableName(name: string): boolean {
    return /^[^<>:"|?*\\/\p{Cc}]*[^<>:"|?*\\/\p{Cc} .]$/u.test(name) && !DEVICE_NAME.test(name);
}

/** The most bytes a name holds in UTF-8, as APFS, NTFS and ext4 bound one: a longer name is a file no volume can hold. */
export const MAX_NAME_BYTES = 255;

/**
 * A file a presentation or a theme names, as MarkdownPoint reads one: portable names joined by `/`, none with `#`, so it
 * is never a URL, a fragment or a platform path, and none hidden, since Finder's records and files being written are no
 * one's. It is in NFC, the form it and its folder's names are compared in, and each name is at most 255 bytes. A
 * generation record in `generated/` is the presentation's bookkeeping, not a file it shows.
 */
export function isAuthoredFilePath(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.normalize('NFC') === value &&
        value
            .split('/')
            .every(
                name =>
                    isPortableName(name) &&
                    !name.startsWith('.') &&
                    !name.includes('#') &&
                    new TextEncoder().encode(name).length <= MAX_NAME_BYTES
            ) &&
        !(value.startsWith('generated/') && value.endsWith('.json'))
    );
}

/** A presentation's own file, in `media/` or `generated/`, as MarkdownPoint takes one. */
export function isPresentationFilePath(value: unknown): value is string {
    return isAuthoredFilePath(value) && /^(?:media|generated)\//.test(value);
}

/**
 * A theme's own file, as MarkdownPoint takes one: none of its package's at its root, the manifest, the previews or the
 * example presentation, in any spelling MarkdownPoint counts as one of them, as its readers judge it.
 */
export { isThemeFilePath } from '../readers/markdownpoint-readers.js';
