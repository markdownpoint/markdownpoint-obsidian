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
import type { Token, Tokens } from 'marked';
import { test } from 'vitest';
import { blockTokens } from '../src/format/block-grammar.ts';
import { wordTokens } from '../src/format/link-tokens.ts';
import { MAX_MARKDOWN_NESTING } from '../src/readers/markdownpoint-readers.js';
import { assertLinear } from './support/linear.ts';

/** How deep lists and quotes nest in tokens, each list and its item one level. */
function depth(tokens: readonly Token[]): number {
    let deepest = 0;
    for (const token of tokens) {
        if (token.type === 'blockquote') deepest = Math.max(deepest, 1 + depth(token.tokens ?? []));
        else if (token.type === 'list')
            deepest = Math.max(
                deepest,
                1 + Math.max(0, ...(token as Tokens.List).items.map((item: Token) => depth('tokens' in item ? (item.tokens ?? []) : [])))
            );
    }
    return deepest;
}

test('lists and quotes nest as deep as MarkdownPoint reads them, and a marker deeper reads as words', () => {
    for (const marker of ['> ', '- ']) {
        assert.equal(depth(blockTokens(`${marker.repeat(MAX_MARKDOWN_NESTING)}x`)), MAX_MARKDOWN_NESTING, marker);
        // Marked would overflow its stack thousands deep.
        const deep = blockTokens(`${marker.repeat(5_000)}x`);
        assert.equal(depth(deep), MAX_MARKDOWN_NESTING, marker);
        assert.equal(deep.map(token => token.raw).join(''), `${marker.repeat(5_000)}x`, marker);
    }
});

test('emphasis and spans nest as deep as MarkdownPoint reads them, and a marker deeper reads as words', () => {
    const inlineDepth = (tokens: readonly Token[]): number =>
        Math.max(0, ...tokens.map(token => (token.type === 'strong' || token.type === 'em' ? 1 + inlineDepth(token.tokens ?? []) : 0)));
    // Marked would overflow its stack about a thousand `**` deep, and three thousand spans.
    for (const [open, close, levels] of [
        ['**', '**', 1_000],
        ['[', ']{font-style=normal}', 3_000]
    ] as const) {
        const words = `${open.repeat(levels)}x${close.repeat(levels)}`;
        const tokens = wordTokens(words);
        assert.equal(inlineDepth(tokens), MAX_MARKDOWN_NESTING, open);
        assert.equal(tokens.map(token => token.raw).join(''), words, open);
    }
});

test('a link definition lives in its paragraph, so a fence or a blank line ends it, as MarkdownPoint reads it', () => {
    // A title on the definition's own line that runs past the paragraph leaves no definition; one on the line after it
    // is no title, and the destination before it defines the label.
    for (const [words, blocks] of [
        ['[x]: /u (t\n```\n---\n)', ['paragraph', 'code']],
        ['[x]: /u "t\n```\n---\nend"', ['paragraph', 'code']],
        ["[x]: /u\n't\n```\n---\n'", ['def', 'paragraph', 'code']],
        ['[x]: /u "t\n\nend"', ['paragraph', 'space', 'paragraph']]
    ] as const)
        assert.deepEqual(
            blockTokens(words).map(token => token.type),
            blocks,
            words
        );
    assertLinear('a run of link definitions', count => '[x]: /u\n'.repeat(count), blockTokens, 2_000);
});

test('a later definition of a label already defined stays as written, so every block after it keeps its place', () => {
    const reference = 'See [a][x].';
    const first = '[x]: https://one.example';
    for (const later of [
        '[x]: https://two.example',
        '[X]: https://two.example',
        '- item\n\n  [x]: https://two.example',
        '> [x]: https://two.example',
        "[x]:\nhttps://two.example\n'title'\n\n```js\ncode\n```"
    ]) {
        const markdown = `${reference}\n\n${first}\n\n${later}`;
        assert.equal(
            blockTokens(markdown)
                .map(token => token.raw)
                .join(''),
            markdown,
            later
        );
    }
    const markdown = "[x]: /a\n\n[x]:\n/b\n'title'\n\nPara";
    assert.deepEqual(
        blockTokens(markdown).map(token => token.type),
        ['def', 'space', 'def', 'space', 'paragraph']
    );
    assert.equal(
        blockTokens(markdown)
            .map(token => token.raw)
            .join(''),
        markdown
    );
});

test('a code fence closes as MarkdownPoint closes one: a run of its own character, as long, then spaces or tabs', () => {
    for (const [lines, closed] of [
        [['```', '```\t'], true],
        [['~~~~', '~~~~~ \t'], true],
        [['```', '```~'], false],
        [['~~~', '~~~`'], false],
        [['```', '``'], false]
    ] as const) {
        const tokens = blockTokens([...lines, '<!-- slide: x -->'].join('\n')).filter(token => token.type !== 'space');
        assert.deepEqual(
            tokens.map(token => token.type),
            closed ? ['code', 'html'] : ['code'],
            JSON.stringify(lines)
        );
    }
});
