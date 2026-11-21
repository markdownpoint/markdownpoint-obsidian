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
 * The names and paths a presentation or a theme holds, as MarkdownPoint's readers judge them, so the plugin and the app
 * apply one rule: a portable name, a file a presentation or a theme names, a presentation's own file in `media/` or
 * `generated/`, a theme's own file as its manifest lists it, a theme's key, the name of its folder, and a layout's key,
 * the name of its file without `.json`. A theme JSON file's field that names a file takes more than its manifest's rule:
 * the path in NFC and each name at most 255 bytes.
 */
export {
    isAuthoredFilePath,
    isLayoutKey,
    isPortableName,
    isPresentationFilePath,
    isThemeFilePath,
    isThemeKey
} from '../readers/markdownpoint-readers.js';
