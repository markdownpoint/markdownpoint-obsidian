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

// The banner itself is copied from Notebook Navigator, which owns it. This module gives the copy what
// Notebook Navigator's own modules give it there, so the copy needs no edits beyond its imports.

import type { App, SettingDefinitionGroup, SettingDefinitionRender, SettingGroupItem } from 'obsidian';

/** MarkdownPoint's website, opened from the banner */
export const MARKDOWNPOINT_URL = 'https://markdownpoint.com';

// The banner's position on this device
const BANNER_POSITION_KEY = 'markdownpoint-banner';

export function readBannerPosition(app: App): unknown {
    const stored: unknown = app.loadLocalStorage(BANNER_POSITION_KEY);
    return stored;
}

export function writeBannerPosition(app: App, position: number): void {
    app.saveLocalStorage(BANNER_POSITION_KEY, position);
}

export function createGroupDefinition(
    heading: string | undefined,
    items: SettingGroupItem[],
    options: { visible?: boolean | (() => boolean); cls?: string }
): SettingDefinitionGroup {
    return { type: 'group', items, ...(heading ? { heading } : {}), ...options };
}

export function createRenderDefinition(options: SettingDefinitionRender): SettingDefinitionRender {
    return {
        ...options,
        render: (setting, group) => {
            // A settings refresh renders into the same row again, and the banner adds itself to the row, not to its
            // control; without this a refresh while settings are open shows a second banner
            for (const banner of Array.from(setting.settingEl.querySelectorAll(':scope > .markdownpoint-banner'))) banner.remove();
            return options.render(setting, group);
        }
    };
}
