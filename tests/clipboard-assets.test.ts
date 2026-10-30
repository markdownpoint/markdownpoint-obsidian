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
import { isPresentationMediaPath, planClipboardAssets } from '../src/format/clipboard-assets.ts';
import type { CapturedPart, CapturedSlides } from '../src/format/capture.ts';

const slide = (record: string): CapturedPart => ({
    id: 'one',
    record,
    markdown: '<!-- slide: one -->\n\n<!-- text: body -->\nmedia/picture.png stays ordinary prose.\n'
});
const captured = (record: string): CapturedSlides => ({ slides: [slide(record)], compositions: [] });

test('all declared slide media locations are collected once, including posters and original images', () => {
    const value = captured(
        JSON.stringify({
            background: { image: 'media/back.png', 'image-result': { original: 'generated/original.png' } },
            objects: [
                'inherited',
                { id: 'photo', type: 'image', file: 'media/picture.png', 'image-result': { original: 'generated/original.png' } },
                { id: 'movie', type: 'video', file: 'media/movie.mp4', 'poster-frame': 'media/poster.jpg' },
                { id: 'web', type: 'web-video', url: 'https://example.com/watch', 'poster-frame': 'media/web.webp' },
                { id: 'words', type: 'text', model: { file: 'generated/letters.glb' } }
            ],
            overrides: {
                removed: null,
                image: { file: 'media/override.png' },
                text: { model: { file: 'media/model.glb' } },
                sound: { file: 'media/music.wav' }
            }
        })
    );
    assert.deepEqual(planClipboardAssets(value)?.files, [
        'media/back.png',
        'generated/original.png',
        'media/picture.png',
        'media/movie.mp4',
        'media/poster.jpg',
        'media/web.webp',
        'generated/letters.glb',
        'media/override.png',
        'media/model.glb',
        'media/music.wav'
    ]);
});

test('only declared media controls authorize files, not text that resembles a path', () => {
    const definition = {
        id: 'card',
        markdown: '<!-- composition: card -->\n',
        record: JSON.stringify({
            controls: {
                photo: { type: 'media', default: 'media/default.png' },
                words: { type: 'text', default: 'media/not-a-file.png' }
            },
            objects: [{ id: 'bound', type: 'image', bind: { file: 'photo' } }]
        })
    };
    const value = {
        slides: [
            slide(
                JSON.stringify({
                    objects: [
                        {
                            id: 'instance',
                            type: 'composition',
                            composition: 'card',
                            inputs: { photo: 'media/selected.png', words: 'media/still-text.png' }
                        }
                    ]
                })
            )
        ],
        compositions: [definition]
    };
    assert.deepEqual(planClipboardAssets(value)?.files, ['media/selected.png', 'media/default.png']);
});

test('remapping replaces only asset values and retains raw precision, escapes, words and unrelated metadata', () => {
    const record = String.raw`{ "unknown":900719925474099312345, "escape":"\u00e9", "description":"media/picture.png", "objects":[{"id":"photo","type":"image","file":"media/picture.png"}], "extra":{"file":"media/unrelated.png"} }`;
    const value = captured(record);
    const before = JSON.stringify(value);
    const plan = planClipboardAssets(value)!;
    assert.deepEqual(plan.files, ['media/picture.png']);
    const changed = plan.remap(new Map([['media/picture.png', 'media/copied/picture.png']]))!;
    assert.equal(changed.slides[0]!.record, record.replace('"file":"media/picture.png"', '"file":"media/copied/picture.png"'));
    assert.equal(changed.slides[0]!.markdown, value.slides[0]!.markdown);
    assert.equal(JSON.stringify(value), before);
    assert.equal(plan.remap(new Map([['media/picture.png', 'media/picture.png']]))!.slides[0]!.record, record);
    assert.deepEqual(planClipboardAssets(captured('{"objects":[{"type":"shape","source":{"poster":"media/unknown.png"}}]}'))?.files, []);
});

test('every copied asset must receive a safe destination before any record is returned', () => {
    const plan = planClipboardAssets(captured('{"objects":[{"file":"media/a.png"},{"file":"generated/b.png"}]}'))!;
    assert.equal(plan.remap(new Map([['media/a.png', 'media/copy.png']])), null);
    assert.equal(
        plan.remap(
            new Map([
                ['media/a.png', 'media/copy.png'],
                ['generated/b.png', '../outside.png']
            ])
        ),
        null
    );
});

test('unsafe or non-media source references cannot authorize a vault read', () => {
    for (const path of [
        '../private.png',
        '/absolute.png',
        'media/../private.png',
        'media/.hidden.png',
        'media\\picture.png',
        'media/con.png',
        'media/COM1/file.png',
        'generated/history.json',
        'notes/private.md',
        'https://example.com/image.png',
        'media/picture.png '
    ]) {
        assert.equal(isPresentationMediaPath(path), false, path);
        assert.equal(planClipboardAssets(captured(JSON.stringify({ objects: [{ file: path }] }))), null, path);
    }
    assert.equal(isPresentationMediaPath('media/Årets möte/Photo 1.PNG'), true);
});

test('empty and cleared assignments need no files; malformed JSON is refused', () => {
    const value = captured('{"background":{"image":"none"},"objects":[{"file":""},{"file":null}]}');
    assert.deepEqual(planClipboardAssets(value)?.files, []);
    assert.deepEqual(planClipboardAssets(value)?.remap(new Map()), value);
    assert.equal(planClipboardAssets(captured('{"objects":[{"file":"media/a.png","file":"media/b.png"}]}')), null);
    assert.equal(planClipboardAssets(captured('{')), null);
});
