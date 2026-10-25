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
import { notesInsertion, slideNotes, validatedNotesInsertion } from '../src/editor/notes.ts';

test('notes preserve existing payload ranges and expose missing slots at their slide boundary', () => {
    const markdown =
        '<!-- slide: first -->\n<!-- text: body -->\nWords.\n\n<!-- notes -->\nA reminder.\n\n<!-- slide: second -->\n<!-- text: body -->\n';
    const document = indexPresentation(markdown, 0)!;
    const slots = slideNotes(markdown, document, 'Notes');
    assert.deepEqual(
        slots.map(slot => slot.slideId),
        ['first', 'second']
    );
    assert.equal(slots[0]!.field!.label, 'Notes');
    assert.equal(markdown.slice(slots[0]!.field!.contentFrom, slots[0]!.field!.to).trim(), 'A reminder.');
    assert.equal(slots[1]!.field, null);
    assert.equal(slots[1]!.at, markdown.length);
});

test('duplicate notes stay raw and do not produce an additional notes slot', () => {
    const markdown = '<!-- slide: first -->\n<!-- notes -->\nOne.\n<!-- notes -->\nTwo.\n';
    assert.deepEqual(slideNotes(markdown, indexPresentation(markdown, 0)!, 'Notes'), []);
});

test('creating notes preserves existing source and leaves a writable insertion caret', () => {
    for (const suffix of ['', '\n', '\n\n'])
        for (const after of ['', '<!-- slide: second -->\n<!-- text: title -->\n']) {
            const before = '<!-- slide: first -->\n<!-- text: body -->\nBody.' + suffix;
            if (after && !suffix) continue;
            const original = before + after;
            const change = notesInsertion(original, before.length);
            const markdown = original.slice(0, change.from) + change.insert + original.slice(change.from);
            assert.equal(markdown.slice(0, change.from), original.slice(0, change.from));
            assert.equal(markdown.slice(change.from + change.insert.length), original.slice(change.from));
            assert.ok(!change.insert.includes('Notes'));
            assert.equal(change.cursor, change.from + change.insert.length);
            assert.ok(change.cursor === markdown.length || markdown[change.cursor] === '\n');
            const document = indexPresentation(markdown, 0)!;
            const note = slideNotes(markdown, document, 'Notes')[0]!.field!;
            assert.equal(note.populated, false);
            assert.equal(note.contentFrom, change.cursor);
            assert.equal(markdown.slice(document.slides[0]!.blocks[0]!.contentFrom, note.from).trim(), 'Body.');
            assert.deepEqual(
                document.slides.map(slide => slide.id),
                after ? ['first', 'second'] : ['first']
            );
        }
});

test('notes insertion respects CRLF and stays within its slide before a section or composition', () => {
    for (const next of ['<!-- section: next -->\r\n# Later\r\n', '<!-- composition: reusable -->\r\n']) {
        const markdown = '<!-- slide: first -->\r\n<!-- text: body -->\r\nBody.\r\n\r\n' + next;
        const document = indexPresentation(markdown, 0)!;
        const at = slideNotes(markdown, document, 'Notes')[0]!.at;
        const change = notesInsertion(markdown, at);
        assert.ok(change.insert.endsWith('<!-- notes -->\r\n'));
        const result = markdown.slice(0, change.from) + change.insert + markdown.slice(change.from);
        const parsed = indexPresentation(result, 0)!;
        assert.equal(parsed.slides[0]!.blocks.at(-1)!.kind, 'notes');
        assert.ok(result.endsWith(next));
    }
});

test('missing notes cannot be inserted into an unfinished final code fence', () => {
    for (const fence of ['```js', '~~~text']) {
        const markdown = `<!-- slide: first -->\n<!-- text: body -->\n${fence}\nA code example.`;
        const document = indexPresentation(markdown, 0)!;
        assert.ok(document);
        assert.equal(validatedNotesInsertion(markdown, document, 'first'), null);
        const closed = markdown + '\n' + fence.slice(0, 3) + '\n';
        const insertion = validatedNotesInsertion(closed, indexPresentation(closed, 0)!, 'first')!;
        assert.ok(insertion);
        const result = closed.slice(0, insertion.from) + insertion.insert + closed.slice(insertion.from);
        assert.equal(indexPresentation(result, 0)!.slides[0]!.blocks.at(-1)!.kind, 'notes');
    }
});

test('validating notes preserves section ranges and never creates duplicate note blocks', () => {
    const markdown =
        '<!-- section: opening -->\n# Opening\n<!-- slide: first -->\n<!-- text: body -->\nWords.\n\n<!-- section: closing -->\n# Closing\n';
    const document = indexPresentation(markdown, 0)!;
    const insertion = validatedNotesInsertion(markdown, document, 'first')!;
    const result = markdown.slice(0, insertion.from) + insertion.insert + markdown.slice(insertion.from);
    const parsed = indexPresentation(result, 0)!;
    assert.deepEqual(
        parsed.sections.map(section => section.id),
        ['opening', 'closing']
    );
    assert.equal(validatedNotesInsertion(result, parsed, 'first'), null);
    assert.equal(validatedNotesInsertion(markdown, document, 'missing'), null);
});
