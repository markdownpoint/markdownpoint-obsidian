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
import { slideStructure } from '../src/format/structure.ts';
import type { EmbeddedTheme } from '../src/format/embedded-theme.ts';

const field = { id: 'title', type: 'text', placeholder: true, frame: { x: 100, y: 100, width: 800, height: 180 } };
const staticText = { id: 'footer', type: 'text', frame: { x: 100, y: 800, width: 500, height: 60 } };
const master = {
    markdownpoint: '1.0',
    type: 'master',
    size: { width: 1600, height: 900 },
    objects: [staticText],
    text: { footer: 'Fixed' }
};
const layout = { markdownpoint: '1.0', type: 'layout', objects: [field] };
const theme: EmbeddedTheme = {
    key: 'basic',
    id: 'id',
    root: 'deck/themes/basic',
    master: { path: 'master.json', source: JSON.stringify(master), value: master },
    layouts: new Map([['title', { path: 'title.json', source: JSON.stringify(layout), value: layout }]])
};
test('structural preview resolves actual frame dimensions and partial inherited overrides', () => {
    const preview = slideStructure({ layout: 'title', overrides: { title: { frame: { x: 300 } }, footer: null } }, theme)!;
    assert.equal(preview.width, 1600);
    assert.equal(preview.height, 900);
    assert.deepEqual(preview.regions, [
        { x: 300, y: 100, width: 800, height: 180, rotation: 0, pivot: { x: 700, y: 190 }, kind: 'text', columns: 1, gutter: 48 }
    ]);
});

test('a turned area turns about its anchor point, a part a level leaves out over the point a growing text grows from, as MarkdownPoint turns it', () => {
    const regions = (title: Record<string, unknown>, overrides: Record<string, unknown> = {}) => {
        const own = { ...layout, objects: [title] };
        const shown = { ...theme, layouts: new Map([['title', { path: 'title.json', source: JSON.stringify(own), value: own }]]) };
        return slideStructure({ layout: 'title', overrides: { footer: null, ...overrides } }, shown)!.regions.map(
            ({ x, y, width, height, pivot }) => ({ x, y, width, height, pivot })
        );
    };
    const turned = { ...field, rotation: 30, frame: { x: 100, y: 100, width: 400, height: 200 } };
    assert.deepEqual(
        regions(turned),
        [{ x: 100, y: 100, width: 400, height: 200, pivot: { x: 300, y: 200 } }],
        'without one it turns about its center'
    );
    assert.deepEqual(regions({ ...turned, 'anchor-point': { x: 0, y: 0.5 } }), [
        { x: 100, y: 100, width: 400, height: 200, pivot: { x: 100, y: 200 } }
    ]);
    assert.deepEqual(regions({ ...turned, 'anchor-point': { x: 0 } }), regions(turned), 'an own anchor point needs both parts');
    // A text that grows down from its top, turned, grows in its own frame once it has an anchor point, and turns about it.
    const grows = { ...field, 'auto-size': 'height', rotation: 90, frame: { x: 100, y: 100, width: 400 } };
    assert.deepEqual(regions({ ...grows, 'anchor-point': { x: 0.5, y: 0.5 } }), [
        { x: 100, y: 100, width: 400, height: 48, pivot: { x: 300, y: 124 } }
    ]);
    // An anchor point a level gives moves the point its x and y name, so it waits until the level gives them too.
    assert.deepEqual(regions(grows, { title: { 'anchor-point': { x: 0.1 } } }), [
        { x: 76, y: 76, width: 400, height: 48, pivot: { x: 276, y: 100 } }
    ]);
    assert.deepEqual(
        regions(grows, { title: { 'anchor-point': { x: 0.1 }, frame: { x: 100, y: 100 } } }),
        [{ x: 100, y: 100, width: 400, height: 48, pivot: { x: 140, y: 100 } }],
        "a level's x stands over the top it grows from"
    );
    // A level that makes a box sized by hand grow gives the part it leaves out from its own growth: the top.
    assert.deepEqual(regions({ ...turned, rotation: 0 }, { title: { 'auto-size': 'height', 'anchor-point': { x: 0.1 } } })[0]?.pivot, {
        x: 140,
        y: 100
    });
});

test("a master that declares no size lays its slides out at 1920 × 1080, as MarkdownPoint reads it, and one it can't read gives none", () => {
    const { size: _size, ...sizeless } = master;
    const at = (value: Record<string, unknown>) =>
        slideStructure({ layout: 'title' }, { ...theme, master: { ...theme.master, source: JSON.stringify(value), value } });
    assert.deepEqual([at(sizeless)?.width, at(sizeless)?.height], [1920, 1080]);
    assert.equal(at({ ...master, size: { width: 1600 } }), null);
});

test('text areas retain their whole frame and column divisions', () => {
    const preview = slideStructure(
        { layout: 'title', overrides: { footer: null, title: { 'column-count': 2, 'column-gutter': 40 } } },
        theme
    )!;
    assert.equal(preview.regions[0]!.columns, 2);
    assert.equal(preview.regions[0]!.gutter, 40);
    assert.equal(preview.regions[0]!.height, 180);
    // A text style has no columns, as MarkdownPoint reads one: an object's own count and gutter are its only ones.
    const styled = { ...master, 'text-styles': { body: { 'column-count': 3, 'column-gutter': 10 } } };
    const styledTheme = { ...theme, master: { ...theme.master, source: JSON.stringify(styled), value: styled } };
    const plain = slideStructure({ layout: 'title', overrides: { footer: null, title: { 'text-style': 'body' } } }, styledTheme)!;
    assert.deepEqual([plain.regions[0]!.columns, plain.regions[0]!.gutter], [1, 48]);
});

test('unknown geometry, hidden objects and hierarchy are omitted; framed media stays neutral', () => {
    const preview = slideStructure(
        {
            layout: 'title',
            overrides: { footer: null, title: { visible: false } },
            objects: [
                { ...field, id: 'nested', parent: 'group' },
                { ...field, id: 'scaled', scale: { x: 2, y: 2 } },
                { id: 'model', type: 'model', position: { x: 1, y: 2, z: 3 } },
                { ...field, id: 'photo', type: 'image', rotation: 15, file: 'media/private-name.jpg' }
            ]
        },
        theme
    )!;
    assert.equal(preview.regions.length, 1);
    assert.equal(preview.regions[0]!.kind, 'media');
    assert.equal(preview.regions[0]!.rotation, 15);
    assert.equal(preview.key.includes('private-name'), false);
    assert.equal(slideStructure({ layout: 'missing' }, theme), null);
    assert.equal(slideStructure({ layout: 'title' }, null), null);
});

test('a repeated object stays out of the schematic, since only the MarkdownPoint app places its copies', () => {
    const dots = { id: 'dots', type: 'image', file: 'media/dot.png', frame: { x: 100, y: 400, width: 80, height: 80 } };
    const regions = (object: Record<string, unknown>) =>
        slideStructure({ layout: 'title', overrides: { footer: null, title: null }, objects: [object] }, theme)!.regions.length;
    assert.equal(regions(dots), 1);
    assert.equal(regions({ ...dots, repeater: { copies: 3, position: { x: 120, y: 0 } } }), 0);
});

test('an own object cannot replace an inherited frame by colliding with its identity', () => {
    const preview = slideStructure({ layout: 'title', objects: [{ ...field, frame: { x: 0, y: 0, width: 10, height: 10 } }] }, theme)!;
    assert.equal(preview.regions[0]!.width, 800);
});

test('writing previews omit fixed theme labels and decorative backdrops while retaining slide-owned fields', () => {
    const preview = slideStructure(
        {
            layout: 'title',
            objects: [
                { id: 'card', type: 'shape', frame: { x: 80, y: 40, width: 1440, height: 820 } },
                { ...field, id: 'headline', frame: { x: 100, y: 400, width: 800, height: 120 }, placeholder: false },
                { ...field, id: 'figure', type: 'chart', frame: { x: 100, y: 540, width: 800, height: 140 }, placeholder: false },
                { ...field, id: 'photo', type: 'image', frame: { x: 960, y: 100, width: 480, height: 580 } }
            ]
        },
        theme
    )!;
    assert.deepEqual(
        preview.regions.map(region => [region.kind, region.y]),
        [
            ['text', 100],
            ['text', 400],
            ['text', 540],
            ['media', 100]
        ]
    );
});

test('null rotation and scale overrides reset to flat defaults without removing the region', () => {
    for (const reset of [{ rotation: null }, { scale: null }, { rotation: null, scale: null }]) {
        const preview = slideStructure({ layout: 'title', overrides: { title: reset, footer: null } }, theme)!;
        assert.equal(preview.regions.length, 1);
        assert.equal(preview.regions[0]!.rotation, 0);
    }
});

test('partial scale overrides merge inherited components before testing flat geometry', () => {
    const scaledLayout = { ...layout, objects: [{ ...field, scale: { x: 2, y: 1 } }] };
    const scaled = {
        ...theme,
        layouts: new Map([['title', { path: 'title.json', source: JSON.stringify(scaledLayout), value: scaledLayout }]])
    };
    const preview = slideStructure({ layout: 'title', overrides: { title: { scale: { x: 1 } }, footer: null } }, scaled)!;
    assert.equal(preview.regions.length, 1);
    assert.equal(preview.regions[0]!.width, 800);
});

test('a text that grows to its words, holding no height, stands a line tall or at its least height, as the app stands it before measuring', () => {
    const grows = { ...field, 'auto-size': 'height', frame: { x: 100, y: 100, width: 800 } };
    const growing = (title: Record<string, unknown>, overrides: Record<string, unknown> = {}) => {
        const own = { ...layout, objects: [title] };
        const shown = { ...theme, layouts: new Map([['title', { path: 'title.json', source: JSON.stringify(own), value: own }]]) };
        return slideStructure({ layout: 'title', overrides: { footer: null, ...overrides } }, shown)!.regions.map(region => region.height);
    };
    assert.deepEqual(growing(grows), [48]);
    assert.deepEqual(growing({ ...grows, 'auto-size': 'both', 'min-height': 120 }), [120]);
    assert.deepEqual(
        growing(field, { title: { 'auto-size': 'height' } }),
        [48],
        'a slide that makes a fixed box grow drops the height it inherits'
    );
    assert.deepEqual(growing({ ...field, 'auto-size': 'height', 'text-path': 'M0 0 L1 0' }), [180], 'words on a path keep their frame');
});

test('a text whose width follows its words, holding no width, stands a width no page measured yet about the point its alignment holds', () => {
    const regions = (title: Record<string, unknown>) => {
        const own = { ...layout, objects: [title] };
        const shown = { ...theme, layouts: new Map([['title', { path: 'title.json', source: JSON.stringify(own), value: own }]]) };
        return slideStructure({ layout: 'title', overrides: { footer: null } }, shown)!.regions.map(({ x, y, width, height }) => ({
            x,
            y,
            width,
            height
        }));
    };
    const point = { x: 400, y: 100 };
    // Its x and y name the point its growth holds: set left its left edge, centered its middle, set right its right edge.
    assert.deepEqual(regions({ ...field, 'auto-size': 'both', frame: point }), [{ x: 400, y: 100, width: 48, height: 48 }]);
    assert.deepEqual(regions({ ...field, 'auto-size': 'both', align: 'center', frame: point }), [
        { x: 376, y: 100, width: 48, height: 48 }
    ]);
    assert.deepEqual(
        regions({ ...field, 'auto-size': 'both', 'text-direction': 'rtl', frame: point }),
        [{ x: 352, y: 100, width: 48, height: 48 }],
        'right to left, it holds the side its lines start on'
    );
    // A width alone grows about the point at mid-height, its height its own.
    assert.deepEqual(regions({ ...field, 'auto-size': 'width', align: 'right', frame: { ...point, height: 80 } }), [
        { x: 352, y: 100, width: 48, height: 80 }
    ]);
    // In columns its width is its own.
    assert.deepEqual(regions({ ...field, 'auto-size': 'width', 'column-count': 2, frame: { ...point, width: 600, height: 80 } }), [
        { x: 400, y: 100, width: 600, height: 80 }
    ]);
    // Its column count reads to the millionth, as MarkdownPoint reads it: 2.0000004 is two columns, 1.0000004 one.
    assert.deepEqual(regions({ ...field, 'auto-size': 'width', 'column-count': 2.0000004, frame: { ...point, width: 600, height: 80 } }), [
        { x: 400, y: 100, width: 600, height: 80 }
    ]);
    assert.deepEqual(regions({ ...field, 'auto-size': 'width', 'column-count': 1.0000004, frame: { ...point, height: 80 } }), [
        { x: 400, y: 100, width: 48, height: 80 }
    ]);
});

test("a slide's change of what decides a text's point, moving a part of its frame it leaves out, waits as MarkdownPoint holds it, and applies once it gives that part", () => {
    const regions = (title: Record<string, unknown>, change: Record<string, unknown>) => {
        const own = { ...layout, objects: [title] };
        const shown = { ...theme, layouts: new Map([['title', { path: 'title.json', source: JSON.stringify(own), value: own }]]) };
        return slideStructure({ layout: 'title', overrides: { footer: null, title: change } }, shown)!.regions.map(
            ({ x, y, width, height }) => ({ x, y, width, height })
        );
    };
    // Set left, its left edge holds as its words set its width: nothing moves, so it follows its layout.
    assert.deepEqual(regions(field, { 'auto-size': 'width' }), [{ x: 100, y: 100, width: 48, height: 180 }]);
    // Centered, its x would name its middle: the change waits, and the box stands as its layout sizes it.
    const centered = { ...field, align: 'center' };
    assert.deepEqual(regions(centered, { 'auto-size': 'width' }), [{ x: 100, y: 100, width: 800, height: 180 }]);
    assert.deepEqual(regions(centered, { 'auto-size': 'width', frame: { x: 500 } }), [{ x: 476, y: 100, width: 48, height: 180 }]);
    // A height that grows holds the top of its middle, which no alignment moves.
    const tall = { ...field, 'auto-size': 'height', frame: { x: 100, y: 100, width: 800 } };
    assert.deepEqual(regions(tall, { align: 'center' }), [{ x: 100, y: 100, width: 800, height: 48 }]);
});
