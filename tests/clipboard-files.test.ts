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
import { isPresentationMediaPath, planClipboardFiles } from '../src/format/clipboard-files.ts';
import type { CapturedPart } from '../src/format/capture.ts';

const slide = (record: string): CapturedPart => ({
    id: 'one',
    record,
    markdown: '<!-- slide: one -->\n\n<!-- text: body -->\nmedia/picture.png stays ordinary prose.\n'
});
const captured = (record: string): readonly CapturedPart[] => [slide(record)];

test("all declared slide media locations are collected once, including posters and restyled images' originals", () => {
    const value = captured(
        JSON.stringify({
            background: { image: { file: 'media/back.png', 'restyled-from': 'generated/original.png' } },
            objects: [
                'inherited',
                { id: 'photo', type: 'image', file: 'media/picture.png', 'restyled-from': 'generated/original.png' },
                { id: 'movie', type: 'video', file: 'media/movie.mp4', poster: 'media/poster.jpg', 'poster-time': 2.5 },
                { id: 'web', type: 'web-video', url: 'https://example.com/watch', poster: 'media/web.webp' },
                { id: 'words', type: 'text', model: { file: 'generated/letters.glb' } }
            ],
            overrides: {
                removed: null,
                image: { file: 'media/override.png', 'restyled-from': 'media/before.png' },
                text: { model: { file: 'media/model.glb' } },
                sound: { file: 'media/music.wav' }
            }
        })
    );
    const plan = planClipboardFiles(value)!;
    assert.deepEqual(plan.files, [
        'media/back.png',
        'generated/original.png',
        'media/picture.png',
        'media/movie.mp4',
        'media/poster.jpg',
        'media/web.webp',
        'generated/letters.glb',
        'media/override.png',
        'media/before.png',
        'media/model.glb',
        'media/music.wav'
    ]);
    // A restyle's original is renamed where its copy is, as its picture is.
    const names = new Map(plan.files.map(file => [file, file.replace(/^(\w+)\//, '$1/copy-')]));
    const record = JSON.parse(plan.remap(names)![0]!.record) as {
        background: { image: Record<string, string> };
        objects: Record<string, string>[];
        overrides: Record<string, Record<string, string>>;
    };
    assert.deepEqual(record.background.image, { file: 'media/copy-back.png', 'restyled-from': 'generated/copy-original.png' });
    assert.equal(record.objects[1]!['restyled-from'], 'generated/copy-original.png');
    assert.equal(record.overrides.image!['restyled-from'], 'media/copy-before.png');
});

test('remapping replaces only file values and retains raw precision, escapes, words and unrelated metadata', () => {
    const record = String.raw`{ "unknown":900719925474099312345, "escape":"\u00e9", "description":"media/picture.png", "objects":[{"id":"photo","type":"image","file":"media/picture.png"}], "extra":{"file":"media/unrelated.png"} }`;
    const value = captured(record);
    const before = JSON.stringify(value);
    const plan = planClipboardFiles(value)!;
    assert.deepEqual(plan.files, ['media/picture.png']);
    const changed = plan.remap(new Map([['media/picture.png', 'media/copied/picture.png']]))!;
    assert.equal(changed[0]!.record, record.replace('"file":"media/picture.png"', '"file":"media/copied/picture.png"'));
    assert.equal(changed[0]!.markdown, value[0]!.markdown);
    assert.equal(JSON.stringify(value), before);
    assert.equal(plan.remap(new Map([['media/picture.png', 'media/picture.png']]))![0]!.record, record);
    assert.deepEqual(planClipboardFiles(captured('{"objects":[{"type":"shape","source":{"poster":"media/unknown.png"}}]}'))?.files, []);
});

test('every copied file must receive a safe destination before any record is returned', () => {
    const plan = planClipboardFiles(captured('{"objects":[{"file":"media/a.png"},{"file":"generated/b.png"}]}'))!;
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
        'media/picture.png ',
        // A font is a theme's, never a presentation's media file.
        'media/font.eot',
        // No key takes none for no file: a picture without one leaves file out.
        'none'
    ]) {
        assert.equal(isPresentationMediaPath(path), false, path);
        assert.equal(planClipboardFiles(captured(JSON.stringify({ objects: [{ file: path }] }))), null, path);
    }
    assert.equal(isPresentationMediaPath('media/Årets möte/Photo 1.PNG'), true);
});

test('empty and cleared assignments need no files; malformed JSON is refused', () => {
    const value = captured('{"objects":[{"file":""},{"file":null}]}');
    assert.deepEqual(planClipboardFiles(value)?.files, []);
    assert.deepEqual(planClipboardFiles(value)?.remap(new Map()), value);
    assert.equal(planClipboardFiles(captured('{"objects":[{"file":"media/a.png","file":"media/b.png"}]}')), null);
    assert.equal(planClipboardFiles(captured('{')), null);
});
