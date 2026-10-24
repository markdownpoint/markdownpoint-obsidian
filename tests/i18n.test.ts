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

import assert from "node:assert/strict";
import test from "node:test";
import { getTranslations } from "../src/i18n/index.ts";
import { en } from "../src/i18n/locales/en.ts";

void test("English uses the complete catalog with the existing command wording", () => {
  const text = getTranslations("en");
  assert.equal(text, en);
  assert.equal(text.commands.focusOutline, "Focus outline");
  assert.equal(text.commands.focusEditor, "Focus editor");
});

void test("an unavailable Obsidian language falls back to the complete English catalog", () => {
  for (const language of ["sv", "zh-TW", "ar", ""]) {
    assert.equal(getTranslations(language), en);
  }
});
