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
import { indexPresentation } from '../src/format/document.ts';
import type { PresentationDocument } from '../src/format/document.ts';
import { reorderSlideSource } from '../src/format/reorder.ts';
import type { SlideDropTarget } from '../src/format/reorder.ts';

const stepSlideSource = (source: string, document: PresentationDocument, ids: Iterable<string>, direction: 'up' | 'down') =>
    reorderSlideSource(source, document, ids, { kind: 'step', direction });

const slide = (id: string): string => `<!-- slide: ${id} -->\n<!-- text: title -->\n${id}\n\n`;
const section = (id: string): string => `<!-- section: ${id} -->\n# ${id}\n\n`;
const order = (markdown: string): string[] => indexPresentation(markdown, 0)!.slides.map(slide => slide.id);

function moved(markdown: string, ids: readonly string[], direction: 'up' | 'down'): string {
    const change = stepSlideSource(markdown, indexPresentation(markdown, 0)!, ids, direction);
    assert.ok(change);
    return markdown.slice(0, change.from) + change.insert + markdown.slice(change.to);
}

function dropped(markdown: string, ids: readonly string[], target: SlideDropTarget): string {
    const change = reorderSlideSource(markdown, indexPresentation(markdown, 0)!, ids, { kind: 'drop', target });
    assert.ok(change);
    return markdown.slice(0, change.from) + change.insert + markdown.slice(change.to);
}

test('a source step keeps split selections split and leaves slides at the edge in place', () => {
    const markdown = ['alpha', 'bravo', 'charlie', 'delta', 'echo'].map(slide).join('');
    assert.deepEqual(order(moved(markdown, ['bravo', 'delta'], 'up')), ['bravo', 'alpha', 'delta', 'charlie', 'echo']);
    assert.deepEqual(order(moved(markdown, ['bravo', 'delta'], 'down')), ['alpha', 'charlie', 'bravo', 'echo', 'delta']);
    assert.deepEqual(order(moved(markdown, ['echo', 'alpha'], 'down')), ['bravo', 'alpha', 'charlie', 'delta', 'echo']);
    assert.deepEqual(order(moved(markdown, ['charlie', 'bravo'], 'up')), ['bravo', 'charlie', 'alpha', 'delta', 'echo']);
});

test('only the changed span is replaced; notes, unknown bindings, comments and frontmatter stay byte-identical', () => {
    const prefix = '---\nmarkdownpoint: 1\nx-extra: keep this\n---\n\n';
    const rich =
        '<!-- slide: bravo -->\n<!-- text: chart.caption -->\nÅ 東京 👩🏽‍💻\n\n\n<!-- Custom comment: keep -->\n<!-- notes -->\nRehearsal.\n\n\n';
    const markdown = prefix + slide('alpha') + rich + slide('charlie') + slide('delta');
    const document = indexPresentation(markdown, prefix.length)!;
    const change = stepSlideSource(markdown, document, ['bravo'], 'down')!;
    assert.equal(change.from, document.slides[1]!.from);
    assert.equal(change.to, document.slides[2]!.to);
    assert.equal(change.insert, slide('charlie') + rich);
    const result = markdown.slice(0, change.from) + change.insert + markdown.slice(change.to);
    assert.equal(result, prefix + slide('alpha') + slide('charlie') + rich + slide('delta'));
});

test('crossing a section start takes one step and never places a slide before the first section', () => {
    const markdown = section('opening') + slide('alpha') + slide('bravo') + section('empty') + section('ending') + slide('charlie');
    assert.equal(
        moved(markdown, ['bravo'], 'down'),
        section('opening') + slide('alpha') + section('empty') + slide('bravo') + section('ending') + slide('charlie')
    );
    assert.equal(
        moved(markdown, ['charlie'], 'up'),
        section('opening') + slide('alpha') + slide('bravo') + section('empty') + slide('charlie') + section('ending')
    );
    assert.equal(stepSlideSource(markdown, indexPresentation(markdown, 0)!, ['alpha', 'bravo'], 'up'), null);
});

test('several selected slides can cross different section starts in one replacement', () => {
    const markdown = section('opening') + slide('alpha') + section('middle') + slide('bravo') + section('ending') + slide('charlie');
    assert.equal(
        moved(markdown, ['bravo', 'charlie'], 'up'),
        section('opening') + slide('alpha') + slide('bravo') + section('middle') + slide('charlie') + section('ending')
    );
});

test('CRLF and literal code markers survive a move, and reusable compositions stay outside it', () => {
    const first = '<!-- slide: alpha -->\n<!-- text: body -->\n```md\n<!-- slide: example -->\n```\n\n';
    const tail = '<!-- composition: shared -->\n<!-- control: caption -->\nReusable words.\n';
    const markdown = (first + slide('bravo') + tail).replace(/\n/g, '\r\n');
    assert.equal(moved(markdown, ['bravo'], 'up'), (slide('bravo') + first + tail).replace(/\n/g, '\r\n'));
    assert.equal(stepSlideSource(markdown, indexPresentation(markdown, 0)!, ['bravo'], 'down'), null);
});

test('a final text without a line feed gets only the newline needed before its new neighbor', () => {
    const last = '<!-- slide: bravo -->\n<!-- text: body -->\nFinal words.';
    assert.equal(moved(slide('alpha') + last, ['bravo'], 'up'), last + '\n' + slide('alpha'));
    assert.equal(
        moved(slide('alpha') + last.replace(/\n/g, '\r\n'), ['bravo'], 'up'),
        last.replace(/\n/g, '\r\n') + '\r\n' + slide('alpha')
    );
});

test('an unterminated whitespace-only EOF tail stays organizational when moved before another block', () => {
    for (const [ending, closed] of [
        ['\n \t ', '\n \t \n'],
        ['\n\n \t ', '\n \t \n'],
        ['\n\n\n \t ', '\n\n \t \n']
    ]) {
        const last = '<!-- slide: bravo -->\n<!-- text: body -->\nFinal words.';
        assert.equal(moved(slide('alpha') + last + ending, ['bravo'], 'up'), last + closed + slide('alpha'));
    }
    const last = '<!-- slide: bravo -->\r\n<!-- notes -->\r\nRemember.\r\n \t\r\n\t ';
    const first = slide('alpha').replace(/\n/g, '\r\n');
    assert.equal(moved(first + last, ['bravo'], 'up'), '<!-- slide: bravo -->\r\n<!-- notes -->\r\nRemember.\r\n \t\t \r\n' + first);
});

test('a final unfinished fence cannot swallow another slide when moved earlier', () => {
    const last = '<!-- slide: bravo -->\n<!-- text: body -->\n```md\nUnfinished example.\n';
    const markdown = slide('alpha') + last;
    assert.equal(stepSlideSource(markdown, indexPresentation(markdown, 0)!, ['bravo'], 'up'), null);
    assert.ok(stepSlideSource(markdown + '```\n', indexPresentation(markdown + '```\n', 0)!, ['bravo'], 'up'));
});

test('section and slide IDs can match, while missing targets and interleaved compositions cannot move', () => {
    const markdown = section('same') + slide('same') + slide('bravo');
    assert.equal(moved(markdown, ['same'], 'down'), section('same') + slide('bravo') + slide('same'));
    const document = indexPresentation(markdown, 0)!;
    assert.equal(stepSlideSource(markdown, document, [], 'down'), null);
    assert.equal(stepSlideSource(markdown, document, ['missing'], 'down'), null);
    assert.equal(stepSlideSource(markdown, document, ['same', 'missing'], 'down'), null);
    const interleaved = slide('alpha') + '<!-- composition: shared -->\n<!-- control: body -->\nWords.\n' + slide('bravo');
    assert.equal(stepSlideSource(interleaved, indexPresentation(interleaved, 0)!, ['bravo'], 'up'), null);
});

test('a drop gathers split selections in source order before or after the target slide', () => {
    const markdown = ['alpha', 'bravo', 'charlie', 'delta', 'echo'].map(slide).join('');
    assert.equal(
        dropped(markdown, ['delta', 'bravo'], { kind: 'slide', id: 'alpha', edge: 'before' }),
        ['bravo', 'delta', 'alpha', 'charlie', 'echo'].map(slide).join('')
    );
    assert.equal(
        dropped(markdown, ['bravo', 'delta'], { kind: 'slide', id: 'echo', edge: 'after' }),
        ['alpha', 'charlie', 'echo', 'bravo', 'delta'].map(slide).join('')
    );
    assert.equal(
        dropped(markdown, ['bravo', 'delta'], { kind: 'slide', id: 'delta', edge: 'after' }),
        ['alpha', 'charlie', 'bravo', 'delta', 'echo'].map(slide).join('')
    );
});

test('dropping on a section places the whole group at its start, retaining empty sections and compositions', () => {
    const tail = '<!-- composition: shared -->\n<!-- control: caption -->\nReusable.\n';
    const markdown = section('opening') + slide('alpha') + section('empty') + section('ending') + slide('bravo') + slide('charlie') + tail;
    assert.equal(
        dropped(markdown, ['charlie', 'alpha'], { kind: 'section', id: 'empty' }),
        section('opening') + section('empty') + slide('alpha') + slide('charlie') + section('ending') + slide('bravo') + tail
    );
    assert.equal(
        dropped(markdown, ['bravo'], { kind: 'section', id: 'opening' }),
        section('opening') + slide('bravo') + slide('alpha') + section('empty') + section('ending') + slide('charlie') + tail
    );
});

test('no-op and missing drop targets leave the source untouched', () => {
    const markdown = section('opening') + slide('alpha') + slide('bravo');
    const document = indexPresentation(markdown, 0)!;
    for (const target of [
        { kind: 'slide', id: 'alpha', edge: 'before' },
        { kind: 'section', id: 'opening' },
        { kind: 'section', id: 'missing' },
        { kind: 'slide', id: 'missing', edge: 'after' }
    ] as const)
        assert.equal(reorderSlideSource(markdown, document, ['alpha'], { kind: 'drop', target }), null);
});

test('a drop preserves notes and unknown text bytes, and validates an unfinished final fence', () => {
    const rich = '<!-- slide: bravo -->\n<!-- text: custom.caption -->\nAuthored words.\n\n\n<!-- notes -->\nA reminder.\n\n';
    const markdown = slide('alpha') + rich + slide('charlie');
    assert.equal(dropped(markdown, ['bravo'], { kind: 'slide', id: 'charlie', edge: 'after' }), slide('alpha') + slide('charlie') + rich);
    const unfinished = slide('alpha') + '<!-- slide: bravo -->\n<!-- text: body -->\n```md\nExample';
    assert.equal(
        reorderSlideSource(unfinished, indexPresentation(unfinished, 0)!, ['bravo'], {
            kind: 'drop',
            target: { kind: 'slide', id: 'alpha', edge: 'before' }
        }),
        null
    );
});
