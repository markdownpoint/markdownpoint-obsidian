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
import {
    FORMAT_VERSION,
    formatStanding,
    opensFormatVersion,
    readsFormatFully,
    statedMarkdownVersion
} from '../src/format/format-version.ts';

test('the plugin writes format 1.0', () => {
    assert.equal(FORMAT_VERSION, '1.0');
    assert.equal(formatStanding(FORMAT_VERSION), 'readable');
});

test('a stated version stands as the MarkdownPoint app ranks it', () => {
    const standings = {
        readable: ['1.0'],
        'newer-minor': ['1.1', '1.10', '1.999999999'],
        newer: ['2.0', '10.0', '2.5'],
        invalid: [undefined, 1, 1.0, '1', '01.0', '1.01', ' 1.0', '1.0.0', '0.9', '0.0', '-1.0']
    };
    for (const [standing, values] of Object.entries(standings)) {
        for (const value of values) assert.equal(formatStanding(value), standing, String(value));
    }
});

test('any minor of major 1 opens, and only the written minor or an earlier one reads fully', () => {
    assert.deepEqual(
        ['1.0', '1.1', '2.0', '0.9'].map(value => [opensFormatVersion(value), readsFormatFully(value)]),
        [
            [true, true],
            [true, false],
            [false, false],
            [false, false]
        ]
    );
});

test("a .md file states its version in its frontmatter's markdownpoint line, quoted, as MarkdownPoint reads it ahead of the file", () => {
    const stated = (line: string, end = '\n') =>
        statedMarkdownVersion(`---${end}id: x${end}${line}${end}---${end}${end}<!-- slide: a -->${end}`);
    assert.equal(stated('markdownpoint: "1.1"'), '1.1');
    assert.equal(stated('markdownpoint: "1.1"', '\r\n'), '1.1');
    assert.equal(stated('markdownpoint: "1.1"', '\r'), '1.1');
    assert.equal(stated("markdownpoint: '1.1' # saved by a newer app"), '1.1');
    // YAML's escapes in double quotes, as a number names a character
    assert.equal(stated(String.raw`markdownpoint: "1.\x31"`), '1.1');
    assert.equal(stated(String.raw`markdownpoint: "\u0031.\U00000031"`), '1.1');
    assert.equal(formatStanding(stated(String.raw`markdownpoint: "1.\t1"`)), 'invalid');
    assert.equal(formatStanding(stated(String.raw`markdownpoint: "1.\U00110000"`)), 'invalid');
    // Unquoted, YAML reads a number; a quote the line doesn't close, a comment with no space before it, states none
    for (const line of ['markdownpoint: 1.1', 'markdownpoint: "1.1', 'markdownpoint: "1.1"# no', 'id: "1.1"'])
        assert.equal(stated(line), undefined, line);
    assert.equal(statedMarkdownVersion('\uFEFF---\nmarkdownpoint: "1.1"\n---\n'), '1.1');
    // Only the frontmatter that opens the file states it
    assert.equal(statedMarkdownVersion('---\nid: x\n---\nmarkdownpoint: "1.1"\n'), undefined);
    assert.equal(statedMarkdownVersion('<!-- slide: a -->\n---\nmarkdownpoint: "1.1"\n---\n'), undefined);
});
