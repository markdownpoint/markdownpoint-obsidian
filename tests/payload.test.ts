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
import { payloadContentEnd } from '../src/format/payload.ts';

test('every terminal blank line is organizational: blank lines only separate, and an empty paragraph is <br>', () => {
    for (const newline of ['\n', '\r\n']) {
        for (let blanks = 0; blanks < 5; blanks++) {
            const raw = 'Words.' + newline.repeat(blanks + 1);
            const expected = 'Words.' + newline;
            assert.equal(raw.slice(0, payloadContentEnd(raw, 0, raw.length)), expected, JSON.stringify(raw));
        }
    }
});

test('leading and interior lines, empty paragraphs, lists, quotes, and code stay as written', () => {
    for (const text of [
        '\n\nWords.',
        'Before.\n\n<br>\n\nAfter.',
        'Before.\n\n\nAfter.',
        '- One\n\n\n- Two',
        '> One\n>\n> Two',
        '```\nOne\n\nTwo\n```',
        '> One\n>',
        'Words.\n\n<br>'
    ]) {
        const source = text + '\n\n';
        assert.equal(source.slice(0, payloadContentEnd(source, 0, source.length)), text + '\n');
    }
});

test('horizontal whitespace counts as a blank line only when terminated', () => {
    for (const newline of ['\n', '\r\n']) {
        const text = 'Words.' + newline;
        for (const tail of [' \t', ' \t' + newline, ' \t' + newline + '  ']) {
            const source = text + tail;
            assert.equal(payloadContentEnd(source, 0, source.length), text.length, JSON.stringify(source));
        }
    }
    const nonbreaking = 'Words.\n\u00a0\n';
    assert.equal(payloadContentEnd(nonbreaking, 0, nonbreaking.length), nonbreaking.length);
});

test('an empty text is blank lines alone, all organizational, and keeps its source offsets', () => {
    const prefix = '<!-- text: body -->\r\n';
    for (let count = 0; count < 5; count++) {
        const raw = '\r\n'.repeat(count);
        const source = prefix + raw + '<!-- notes -->\r\n';
        const end = payloadContentEnd(source, prefix.length, prefix.length + raw.length);
        assert.equal(end, prefix.length);
        assert.equal(source.slice(prefix.length, prefix.length + raw.length), raw);
    }
    const words = 'Words.';
    assert.equal(payloadContentEnd(words, 0, words.length), words.length);
    assert.equal(payloadContentEnd('\n\n', 2, 2), 2);
});
