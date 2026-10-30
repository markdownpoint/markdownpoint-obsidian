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
import { EditorSelection, EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { indexPresentation } from '../src/format/document.ts';
import { paragraphIdDecorations, paragraphIds } from '../src/editor/paragraph-ids.ts';

const deck =
    '<!-- slide: first -->\n<!-- text: title -->\n# Title <!-- id: t1x9a2 -->\n\n<!-- text: body -->\n' +
    'One line <!-- id: a7k2p9 -->\n\nTwo lines\nend here <!-- id: k3x9a2 -->\n\n- Item <!-- id: p7m2q1 -->\n  - Nested <!-- id: b8c4d0 -->\n\n' +
    'A note <!-- not an id -->\n\n<!-- notes -->\nSay it.\n';

/** The source each decoration covers. */
function covered(set: DecorationSet, doc: string): string[] {
    const found: string[] = [];
    for (const cursor = set.iter(); cursor.value; cursor.next()) found.push(doc.slice(cursor.from, cursor.to));
    return found;
}

test('Live Preview hides each paragraph id, the space before it included, until a selection touches its line', () => {
    const document = indexPresentation(deck, 0)!;
    const away = EditorState.create({ doc: deck, selection: { anchor: 0 } });
    const ids = paragraphIds(away, document);
    assert.deepEqual(
        covered(paragraphIdDecorations(away, ids), deck),
        [' <!-- id: t1x9a2 -->', ' <!-- id: a7k2p9 -->', ' <!-- id: k3x9a2 -->', ' <!-- id: p7m2q1 -->', ' <!-- id: b8c4d0 -->'],
        "a heading's, a paragraph's last line's and each item's; an author's note stays"
    );
    const onLine = EditorState.create({ doc: deck, selection: { anchor: deck.indexOf('end here') } });
    assert.deepEqual(covered(paragraphIdDecorations(onLine, ids), deck).length, 4, 'the caret on a line shows its id');
    const across = EditorState.create({ doc: deck, selection: EditorSelection.single(deck.indexOf('One'), deck.indexOf('Item')) });
    assert.deepEqual(
        covered(paragraphIdDecorations(across, ids), deck),
        [' <!-- id: t1x9a2 -->', ' <!-- id: b8c4d0 -->'],
        'a selection shows the ids of every line it touches'
    );
});
