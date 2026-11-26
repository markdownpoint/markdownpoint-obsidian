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
import { slideForGap, slideForMenu } from '../src/editor/menu-target.ts';

const source =
    '\n<!-- section: opening -->\n# Opening\n<!-- slide: one -->\n<!-- text: body -->\nFirst\n\n\n<!-- slide: two -->\n<!-- text: body -->\nSecond\n';

test('slide menu targets fields, inter-slide whitespace and EOF without targeting section names', () => {
    const document = indexPresentation(source, 0)!;
    assert.equal(slideForMenu(document, source.indexOf('First'), source)?.id, 'one');
    assert.equal(slideForMenu(document, source.indexOf('\n\n\n') + 2, source)?.id, 'one');
    assert.equal(slideForMenu(document, source.indexOf('<!-- slide: two'), source)?.id, 'two');
    assert.equal(slideForMenu(document, source.length, source)?.id, 'two');
    assert.equal(slideForMenu(document, source.indexOf('Opening'), source), null);
});

test('draft margins select their nearest slide', () => {
    const source = '\n\n<!-- slide: one -->\n<!-- text: title -->\nFirst\n';
    const document = indexPresentation(source, 0)!;
    assert.equal(slideForMenu(document, 0, source)?.id, 'one');
    assert.equal(slideForMenu(document, source.length + 1, source), null);
    assert.equal(slideForMenu(document, -1, source), null);
    assert.equal(slideForMenu({ slides: [], sections: [], laterMarkers: [] }, 0, ''), null);
});

test("frontmatter does not borrow the first slide's actions", () => {
    const header = '---\nmarkdownpoint: "1.0"\n---\n';
    const plain = header + '\n<!-- slide: actual -->\n<!-- text: body -->\nWords\n';
    const indexed = indexPresentation(plain, header.length)!;
    assert.equal(slideForMenu(indexed, 0, plain, header.length), null);
    assert.equal(slideForMenu(indexed, header.length, plain, header.length)?.id, 'actual');
});

test("the gap above a slide's rule belongs to the preceding slide; at the top and after a section's heading it stays the slide's own", () => {
    const source =
        '<!-- section: first -->\n# First\n\n<!-- slide: one -->\n\n<!-- text: body -->\nFirst\n\n<!-- slide: two -->\n\n<!-- text: body -->\nSecond\n\n' +
        '<!-- section: more -->\n# More\n\n<!-- slide: three -->\n\n<!-- text: body -->\nThird\n';
    const document = indexPresentation(source, 0)!;
    const gap = (id: string) =>
        slideForGap(
            document,
            document.slides.find(slide => slide.id === id)!,
            source
        ).id;
    assert.equal(gap('two'), 'one');
    assert.equal(gap('one'), 'one');
    assert.equal(gap('three'), 'three');
    const header = '---\nmarkdownpoint: "1.0"\n---\n';
    const top = `${header}<!-- slide: top -->\n\n<!-- text: body -->\nWords\n`;
    const indexed = indexPresentation(top, header.length)!;
    assert.equal(slideForGap(indexed, indexed.slides[0]!, top, header.length).id, 'top');
});
