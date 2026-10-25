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

import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import type { LocalUiState, OutlineSide } from './local-ui.ts';
import type { SharedSettings } from './shared.ts';
import { uiText } from '../ui-text.ts';
import { MARKDOWNPOINT_ICON_ID } from '../markdownpoint-icon.ts';

export class MarkdownPointSettingTab extends PluginSettingTab {
    icon = MARKDOWNPOINT_ICON_ID;

    constructor(
        app: App,
        plugin: Plugin,
        private readonly localUi: LocalUiState,
        private readonly setOutlineSide: (side: OutlineSide) => Promise<void>,
        private readonly shared: SharedSettings,
        private readonly imagesChanged: () => void
    ) {
        super(app, plugin);
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        return [
            {
                name: uiText.sidebar,
                control: {
                    type: 'dropdown',
                    key: 'outlineSide',
                    defaultValue: 'right',
                    options: { left: uiText.left, right: uiText.right }
                }
            },
            {
                name: uiText.images.show,
                desc: uiText.images.description,
                control: { type: 'toggle', key: 'showSlideImages', defaultValue: true }
            }
        ];
    }

    getControlValue(key: string): unknown {
        return key === 'outlineSide' ? this.localUi.outlineSide : key === 'showSlideImages' ? this.shared.showSlideImages : undefined;
    }

    /** Keep local workspace state separate from synced writing preferences. */
    async setControlValue(key: string, value: unknown): Promise<void> {
        if (key === 'outlineSide' && (value === 'left' || value === 'right')) {
            await this.setOutlineSide(value);
        } else if (key === 'showSlideImages' && typeof value === 'boolean') {
            await this.shared.setShowSlideImages(value);
            this.imagesChanged();
        }
    }
}
