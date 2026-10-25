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

import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'vitest';
import { getTranslations } from '../src/i18n/index.ts';
import { en } from '../src/i18n/locales/en.ts';

const localeFolder = new URL('../src/i18n/locales/', import.meta.url);
/** Each locale file is named by the Obsidian language code it serves. */
const languages = readdirSync(localeFolder)
    .filter(name => name.endsWith('.ts'))
    .map(name => name.slice(0, -'.ts'.length));

/** Every message's key path and kind, in declaration order. */
function shape(value: unknown, path = ''): string[] {
    if (typeof value !== 'object' || value === null) return [`${path}: ${typeof value}`];
    return Object.entries(value).flatMap(([key, child]) => shape(child, path ? `${path}.${key}` : key));
}

function strings(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    return typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];
}

test('English uses the complete catalog with the existing command wording', () => {
    const text = getTranslations('en');
    assert.equal(text, en);
    assert.equal(text.commands.focusOutline, 'Focus outline');
    assert.equal(text.commands.focusEditor, 'Focus editor');
});

test('an unavailable Obsidian language falls back to the complete English catalog', () => {
    for (const language of ['sv', 'en-GB', 'he', '']) {
        assert.equal(getTranslations(language), en);
    }
});

test("each locale file serves its own Obsidian code with English's messages in the same order", () => {
    const catalogs = languages.map(getTranslations);
    assert.equal(new Set(catalogs).size, languages.length);
    for (const [index, language] of languages.entries()) assert.deepEqual(shape(catalogs[index]), shape(en), language);
});

test('every translation writes each message and keeps the values it is given', () => {
    for (const language of languages) {
        const text = getTranslations(language);
        for (const message of strings(text)) assert.notEqual(message.trim(), '', language);
        const numbered = text.fields.numbered({ name: '⟨name⟩', number: '7' });
        assert.ok(numbered.includes('⟨name⟩') && numbered.includes('7'), language);
        const shortcut = text.slides.layoutShortcutLabel({ name: '⟨name⟩', digit: '7' });
        assert.ok(shortcut.includes('⟨name⟩') && shortcut.includes('7'), language);
        assert.ok(text.slides.layoutShortcutLabel({ name: '⟨name⟩', digit: null }).includes('⟨name⟩'), language);
        for (const message of [text.presentations.newerFormat, text.whatsNew.version, text.whatsNew.setting])
            assert.ok(message({ version: '⟨9.8⟩' }).includes('⟨9.8⟩'), language);
        for (const count of [1, 2]) {
            for (const action of [text.slides.copy, text.slides.cut, text.slides.delete])
                assert.notEqual(action({ count }).trim(), '', language);
        }
    }
});
