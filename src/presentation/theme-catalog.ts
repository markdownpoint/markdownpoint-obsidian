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
import type { TFolder, Vault } from 'obsidian';
import type { EmbeddedTheme } from '../format/embedded-theme.ts';
import { isThemeKey, themeAssetPaths } from '../format/embedded-theme.ts';
import { layoutName } from '../format/new-slide.ts';
import { basicTheme } from '../themes/basic.ts';
import { readEmbeddedTheme } from './theme-reader.ts';
import { uiText } from '../ui-text.ts';

export interface CreationTheme {
    readonly theme: EmbeddedTheme;
    readonly name: string;
    readonly folder: TFolder | null;
    readonly detail: string;
    readonly preview: string | null;
}
export const inFolder = (folder: string, name: string): string => (folder && folder !== '/' ? `${folder}/${name}` : name);

export async function readCreationTheme(vault: Vault, folder: TFolder): Promise<EmbeddedTheme | null> {
    if (vault.getFolderByPath(folder.path) !== folder || folder.parent?.name !== 'themes' || !isThemeKey(folder.name)) return null;
    const parent = folder.parent.parent;
    if (!parent) return null;
    const keys = folder.children.flatMap(file =>
        file instanceof TFile && file.extension === 'json' && file.basename !== 'master' && file.basename !== 'manifest'
            ? [file.basename]
            : []
    );
    const theme = keys.length ? await readEmbeddedTheme(vault, inFolder(parent.path, 'slides.md'), { theme: folder.name }, keys) : null;
    const assets = theme && themeAssetPaths(theme);
    return assets && assets.every(path => vault.getFileByPath(`${folder.path}/${path}`)) ? theme : null;
}

/** Read when the creation dialog opens; no background catalog scan or polling. */
export async function creationThemes(vault: Vault): Promise<CreationTheme[]> {
    const builtIn: CreationTheme = {
        theme: basicTheme,
        name: layoutName(basicTheme.key, basicTheme.master.value),
        folder: null,
        detail: uiText.presentations.included,
        preview: null
    };
    const masters = vault.getFiles().filter(file => file.name === 'master.json' && file.parent?.parent?.name === 'themes');
    const themes = await Promise.all(
        masters.map(async file => {
            const folder = file.parent!,
                theme = await readCreationTheme(vault, folder);
            if (!theme) return null;
            const cover = vault.getFileByPath(`${folder.path}/previews/cover.jpg`);
            return {
                theme,
                name: layoutName(theme.key, theme.master.value),
                folder,
                detail: folder.path,
                preview: cover ? vault.getResourcePath(cover) : null
            };
        })
    );
    const seen = new Set<string>();
    return [
        builtIn,
        ...themes.filter(theme => theme !== null).sort((a, b) => a.name.localeCompare(b.name) || a.detail.localeCompare(b.detail))
    ].filter(choice => {
        const fingerprint = JSON.stringify([
            choice.theme.id,
            choice.theme.master.source,
            [...choice.theme.layouts].sort(([a], [b]) => a.localeCompare(b)).map(([key, layout]) => [key, layout.source])
        ]);
        if (seen.has(fingerprint)) return false;
        seen.add(fingerprint);
        return true;
    });
}
