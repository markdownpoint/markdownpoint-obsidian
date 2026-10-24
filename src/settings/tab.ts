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

import { PluginSettingTab } from "obsidian";
import type { App, Plugin, SettingDefinitionItem } from "obsidian";
import type { LocalUiState, OutlineSide } from "./local-ui.ts";
import { uiText } from "../ui-text.ts";

export class MarkdownPointSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private readonly localUi: LocalUiState,
    private readonly setOutlineSide: (side: OutlineSide) => Promise<void>,
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [{
      name: uiText.sidebar,
      control: {
        type: "dropdown",
        key: "outlineSide",
        defaultValue: "right",
        options: { left: uiText.left, right: uiText.right },
      },
    }];
  }

  getControlValue(key: string): unknown {
    return key === "outlineSide" ? this.localUi.outlineSide : undefined;
  }

  /** This control is device-local; the base implementation would write it to synced plugin data. */
  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "outlineSide" && (value === "left" || value === "right")) {
      await this.setOutlineSide(value);
    }
  }
}
