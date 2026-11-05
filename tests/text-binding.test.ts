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
import { test } from 'vitest';
import { textBindingLabel, textBindingName } from '../src/format/text-binding.ts';
import { en } from '../src/i18n/locales/en.ts';

test('only the explicit allocation suffix is hidden; authored names and numbers stay readable', () => {
    const cases = new Map([
        ['title-2-id-b7d9e1', 'Title 2'],
        ['body-03', 'Body 03'],
        ['id-m4n6p8', 'Text'],
        ['text-id-m4n6p8', 'Text'],
        ['budget-total-2', 'Budget total 2'],
        ['user-choice', 'User choice'],
        ['caption-random', 'Caption random'],
        ['caption-id-123456', 'Caption id 123456'],
        ['caption-id-b7d9e12', 'Caption id b7d9e12'],
        ['constructor', 'Constructor']
    ]);
    for (const [id, expected] of cases) assert.equal(textBindingLabel(textBindingName(id), en.fields), expected, id);
});

test("an instance's text control is named after its first dot, in the author's words as written", () => {
    // MarkdownPoint reads `instance.control` so: the instance's id, then after the first dot the control's name.
    const cases = new Map([
        ['badge.Step 1.5', 'Step 1.5'],
        ['badge.Intro.title', 'Intro.title'],
        ['card-id-f9h2k4.caption-2', 'caption-2'],
        ['badge.caption-id-b7d9e1', 'caption-id-b7d9e1'],
        ['badge.title', 'title'],
        ['badge.text', 'text'],
        ['badge.見出し', '見出し']
    ]);
    for (const [id, expected] of cases) {
        const name = textBindingName(id);
        assert.deepEqual([name.name, name.number, name.control], [expected, null, true], id);
        assert.equal(textBindingLabel(name, en.fields), expected, id);
    }
});

test('the catalog owns known field names and the complete numbered phrase', () => {
    const labels = {
        text: 'Generic',
        names: { body: 'Localized body' },
        numbered: ({ name, number }: { name: string; number: string }) => `${number}: ${name}`
    };
    assert.equal(textBindingLabel(textBindingName('body-3-id-b7d9e1'), labels), '3: Localized body');
    assert.equal(textBindingLabel(textBindingName('id-b7d9e1'), labels), 'Generic');
    assert.equal(textBindingLabel(textBindingName('custom-field-2'), labels), '2: Custom field');
    assert.equal(textBindingLabel(textBindingName('card.body'), labels), 'body', "a control's name is not translated");
});
