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
import { prepareSlideCopies } from '../src/format/copy.ts';
import type { CapturedPart } from '../src/format/capture.ts';
import { indexPresentation } from '../src/format/document.ts';
import { planSlideInsertion } from '../src/format/insert.ts';

const part = (id: string, record = '{}', words = 'Shared words.'): CapturedPart => ({
    id,
    record,
    markdown: `<!-- slide: ${id} -->\n<!-- text: body -->\n${words}\n`
});
const linking = (target: string) => `{"objects":[{"id":"button","type":"shape","link":"slide:${target}"}]}`;
const captured = [part('a', '{}', '[B](slide:b) and `[B](slide:b)`.'), part('b', linking('a'))];
const fields = (value: readonly CapturedPart[]) => new Map(value.map(part => [part.id, new Map([['text:body', 'rich-text' as const]])]));
const allocator = (start = 0) => {
    let count = start;
    return () => `new-${++count}`;
};
const prepare = (
    value: readonly CapturedPart[] = captured,
    mint: (used: ReadonlySet<string>) => string = allocator(),
    occupied = new Set<string>()
) => prepareSlideCopies(value, occupied, fields(value), mint);

test('copy groups receive fresh slide identities, and links among the copied slides follow them', () => {
    const before = JSON.stringify(captured);
    const result = prepare()!;
    assert.ok(result);
    assert.deepEqual(
        result.map(part => part.id),
        ['new-1', 'new-2']
    );
    assert.equal(
        result[0]!.markdown,
        captured[0]!.markdown.replace('slide: a', 'slide: new-1').replace('[B](slide:b)', '[B](slide:new-2)')
    );
    assert.equal(result[1]!.record, linking('new-1'));
    assert.equal(JSON.stringify(captured), before);
});

test('each fresh identity is drawn against the identities in use, the ones drawn before it included', () => {
    const firstFree = (used: ReadonlySet<string>) => ['new-1', 'new-2', 'new-3'].find(id => !used.has(id))!;
    assert.deepEqual(
        prepare(captured, firstFree, new Set(['new-1']))!.map(part => part.id),
        ['new-2', 'new-3']
    );
});

test('repeated insertion of one copy gives each paste identities of its own', () => {
    let source = captured.map(part => part.markdown).join('');
    let companion = JSON.stringify({ slides: Object.fromEntries(captured.map(part => [part.id, JSON.parse(part.record) as unknown])) });
    const mint = allocator();
    for (let cycle = 1; cycle <= 3; cycle++) {
        const document = indexPresentation(source, 0)!;
        const copied = prepareSlideCopies(captured, new Set(document.slides.map(part => part.id)), fields(captured), mint)!;
        assert.deepEqual(
            copied.map(part => part.id),
            [`new-${2 * cycle - 1}`, `new-${2 * cycle}`]
        );
        assert.equal(copied[1]!.record, linking(`new-${2 * cycle - 1}`));
        const insertion = planSlideInsertion(source, document, companion, copied, 'b', 0)!;
        source = [...insertion.changes]
            .reverse()
            .reduce((text, change) => text.slice(0, change.from) + change.insert + text.slice(change.to), source);
        companion = insertion.companion;
        assert.equal(insertion.document.slides.length, 2 + 2 * cycle);
        assert.equal(new Set(insertion.document.slides.map(slide => slide.id)).size, 2 + 2 * cycle);
    }
});

test('unavailable fresh identities, missing schemas or an unreadable record refuse the entire copy', () => {
    assert.equal(prepare([captured[0]!, captured[0]!]), null);
    assert.equal(
        prepare(captured, () => 'a'),
        null
    );
    assert.equal(
        prepare(captured, () => 'Bad ID'),
        null
    );
    assert.equal(
        prepare(captured, () => 'reserved', new Set(['reserved'])),
        null
    );
    assert.equal(
        prepare(captured, () => 'repeated'),
        null
    );
    assert.equal(prepareSlideCopies(captured, new Set(), new Map(), allocator()), null);
    assert.equal(prepare([part('a', '{')]), null);
    assert.equal(prepare([]), null);
});
