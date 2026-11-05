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
import { crc32 } from 'node:zlib';
import { test } from 'vitest';
import { pictureOrientationReading } from '../src/format/picture-orientation.ts';
import { knownOrientation, readPictureOrientation } from '../src/presentation/picture-orientation.ts';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngChunk(type: string, data: Buffer = Buffer.alloc(0)): Buffer {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'latin1');
    data.copy(out, 8);
    out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])), 8 + data.length);
    return out;
}

/** A TIFF structure as EXIF holds it, its first image directory holding `orientation` alone, in either byte order. */
function tiffOrientation(orientation: number, little = false): Buffer {
    const tiff = Buffer.alloc(26);
    const u16 = (value: number, at: number) => (little ? tiff.writeUInt16LE(value, at) : tiff.writeUInt16BE(value, at));
    const u32 = (value: number, at: number) => (little ? tiff.writeUInt32LE(value, at) : tiff.writeUInt32BE(value, at));
    tiff.write(little ? 'II' : 'MM', 0, 'latin1');
    u16(42, 2);
    u32(8, 4);
    u16(1, 8);
    u16(0x0112, 10);
    u16(3, 12);
    u32(1, 14);
    u16(orientation, 18);
    return tiff;
}

const exif = (orientation: number, little = false): Buffer => pngChunk('eXIf', tiffOrientation(orientation, little));

/** A 300 by 100 PNG with `before` between its header and its image data, and `after` past it. */
function png(before: Buffer[] = [], after: Buffer[] = []): Buffer {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(300, 0);
    header.writeUInt32BE(100, 4);
    header[8] = 8;
    header[9] = 6;
    return Buffer.concat([
        PNG_SIGNATURE,
        pngChunk('IHDR', header),
        ...before,
        pngChunk('IDAT', Buffer.alloc(16)),
        ...after,
        pngChunk('IEND')
    ]);
}

function jpegSegment(marker: number, body: Buffer): Buffer {
    const length = Buffer.alloc(2);
    length.writeUInt16BE(body.length + 2);
    return Buffer.concat([Buffer.from([0xff, marker]), length, body]);
}

function jpegFrame(width: number, height: number): Buffer {
    const body = Buffer.alloc(15);
    body[0] = 8;
    body.writeUInt16BE(height, 1);
    body.writeUInt16BE(width, 3);
    body[5] = 3;
    return jpegSegment(0xc0, body);
}

const exifSegment = (orientation: number, little = false): Buffer =>
    jpegSegment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiffOrientation(orientation, little)]));
const jpeg = (...segments: Buffer[]): Buffer => Buffer.concat([Buffer.from([0xff, 0xd8]), ...segments, jpegFrame(640, 480)]);

function box(type: string, ...children: Buffer[]): Buffer {
    const body = Buffer.concat(children);
    const header = Buffer.alloc(8);
    header.writeUInt32BE(body.length + 8);
    header.write(type, 4, 'latin1');
    return Buffer.concat([header, body]);
}

function extents(width: number, height: number): Buffer {
    const sides = Buffer.alloc(12);
    sides.writeUInt32BE(width, 4);
    sides.writeUInt32BE(height, 8);
    return box('ispe', sides);
}

/**
 * An AVIF file whose primary item, 7, is `width` by `height`. A picture stored as a grid may list its tiles, item 1,
 * first, and a rotation and a mirror may orient the primary item, the mirror listed first where `mirrorFirst`.
 */
function avif(
    width: number,
    height: number,
    before: Buffer[] = [],
    { tiles = false, turn, mirror, mirrorFirst = false }: { tiles?: boolean; turn?: number; mirror?: number; mirrorFirst?: boolean } = {}
): Buffer {
    const primary = Buffer.alloc(6);
    primary.writeUInt16BE(7, 4);
    const rotation = turn === undefined ? [] : [box('irot', Buffer.from([turn]))];
    const mirrored = mirror === undefined ? [] : [box('imir', Buffer.from([mirror]))];
    const orienting = mirrorFirst ? [...mirrored, ...rotation] : [...rotation, ...mirrored];
    const properties = [box('colr', Buffer.alloc(12)), ...(tiles ? [extents(512, 512)] : []), extents(width, height), ...orienting];
    const entry = (item: number, places: number[]) => {
        const bytes = Buffer.alloc(3 + places.length);
        bytes.writeUInt16BE(item);
        bytes[2] = places.length;
        places.forEach((place, index) => (bytes[3 + index] = place | 0x80));
        return bytes;
    };
    const place = tiles ? 3 : 2;
    const entries = [...(tiles ? [entry(1, [1, 2])] : []), entry(7, [1, place, ...orienting.map((_, index) => place + 1 + index)])];
    const count = Buffer.alloc(8);
    count.writeUInt32BE(entries.length, 4);
    const meta = box(
        'meta',
        Buffer.alloc(4),
        box('hdlr', Buffer.alloc(24)),
        box('pitm', primary),
        box('iprp', box('ipco', ...properties), box('ipma', count, ...entries))
    );
    return Buffer.concat([box('ftyp', Buffer.from('avifmif1avif', 'latin1')), ...before, meta]);
}

/** The orientation read from `bytes` whole, as the file `path`; null for a picture drawn as stored with no read. */
function orientation(bytes: Buffer, path: string, parts: number[] = []): number | null {
    const reading = pictureOrientationReading(path, bytes.length);
    if (!reading) return null;
    let step = reading.next();
    while (!step.done) {
        parts.push(step.value.length);
        step = reading.next(bytes.subarray(step.value.offset, step.value.offset + step.value.length));
    }
    return step.value;
}

interface Served {
    fetched: number;
    pulled: number;
    canceled: boolean;
}

/** A window whose fetch serves `bytes` in chunks of `size`, an empty chunk after each where `empty`, counting what it hands over. */
function serving(bytes: Buffer, size: number, { empty = false, fail = 0 } = {}): { window: Window; served: Served } {
    const served: Served = { fetched: 0, pulled: 0, canceled: false };
    let failures = fail;
    const window = {
        fetch: () => {
            served.fetched += 1;
            if (failures > 0) {
                failures -= 1;
                return Promise.reject(new Error('unreadable'));
            }
            let at = 0;
            let gap = false;
            const body = new ReadableStream<Uint8Array>(
                {
                    pull(controller) {
                        if (empty && gap) {
                            gap = false;
                            controller.enqueue(new Uint8Array(0));
                            return;
                        }
                        if (at >= bytes.length) {
                            controller.close();
                            return;
                        }
                        const chunk = new Uint8Array(bytes.subarray(at, at + size));
                        at += chunk.length;
                        served.pulled += chunk.length;
                        gap = true;
                        controller.enqueue(chunk);
                    },
                    cancel() {
                        served.canceled = true;
                    }
                },
                { highWaterMark: 0 }
            );
            return Promise.resolve(new Response(body));
        }
    };
    return { window: window as unknown as Window, served };
}

let next = 0;
const address = (name: string) => `app://vault/${(next += 1)}/${name}?1`;

test("a JPEG's first Exif segment that holds anything alone orients it, in either byte order, once a frame shows it a picture", () => {
    for (const little of [false, true])
        for (let value = 1; value <= 8; value++) assert.equal(orientation(jpeg(exifSegment(value, little)), 'a.jpg'), value);
    const exifOf = (tiff: number[]) => jpegSegment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), Buffer.from(tiff)]));
    const xmp = jpegSegment(0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>', 'latin1'));
    for (const [name, picture, expected] of [
        ['a second Exif segment', jpeg(exifSegment(6), exifSegment(3)), 6],
        ['a first Exif segment without an orientation', jpeg(exifOf([0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0]), exifSegment(6)), 1],
        ['a broken first Exif segment', jpeg(exifOf([0x58, 0x58, 0, 42, 0, 0]), exifSegment(6)), 1],
        ['an Exif segment with nothing past its header', jpeg(exifOf([]), exifSegment(6)), 6],
        ['an XMP segment before the Exif one', jpeg(xmp, exifSegment(6)), 6],
        ['an XMP segment after it', jpeg(exifSegment(6), xmp), 6],
        ['no Exif segment', jpeg(), 1]
    ] as const)
        assert.equal(orientation(picture, 'Photo.JPEG'), expected, name);
    const turned = jpeg(exifSegment(6));
    assert.equal(orientation(turned.subarray(0, turned.length - 14), 'a.jpg'), 1, 'a JPEG cut before its frame');
    assert.equal(
        orientation(Buffer.concat([Buffer.from([0xff, 0xd8]), exifSegment(6), Buffer.from([0xff, 0xda])]), 'a.jpg'),
        1,
        'no frame'
    );
    assert.equal(orientation(png([exif(6)]), 'a.jpg'), 1, 'not a JPEG');
});

test("a PNG's eXIf before its image data orients it; after it, in a text chunk, broken or failing its CRC, it orients nothing", () => {
    for (const little of [false, true])
        for (let value = 1; value <= 8; value++) assert.equal(orientation(png([exif(value, little)]), 'a.png'), value);
    const density = pngChunk('pHYs', Buffer.from([0, 0, 0x16, 0x25, 0, 0, 0x0b, 0x13, 1]));
    assert.equal(orientation(png([density, pngChunk('tEXt', Buffer.from('Comment\0x')), exif(6)]), 'a.png'), 6, 'past other chunks');
    assert.equal(orientation(png([], [exif(6)]), 'a.png'), 1, 'past the image data');
    assert.equal(orientation(png([pngChunk('zTXt', Buffer.from('Raw profile type exif\0\0'))]), 'a.png'), 1, 'a text chunk');
    const broken = (edit: (bytes: Buffer) => Buffer) => png([pngChunk('eXIf', edit(Buffer.from(tiffOrientation(6))))]);
    for (const [name, bytes] of [
        ['no byte order', broken(bytes => (bytes.write('XX', 0, 'latin1'), bytes))],
        ['not 42', broken(bytes => (bytes.writeUInt16BE(43, 2), bytes))],
        ['a directory past its end', broken(bytes => (bytes.writeUInt32BE(400, 4), bytes))],
        ['entries past its end', broken(bytes => bytes.subarray(0, 20))],
        ['a header cut short', broken(bytes => bytes.subarray(0, 6))],
        ['an orientation of 9', broken(bytes => (bytes.writeUInt16BE(9, 18), bytes))],
        ['an orientation of another type', broken(bytes => (bytes.writeUInt16BE(4, 12), bytes))]
    ] as const)
        assert.equal(orientation(bytes, 'a.png'), 1, name);
    const cut = png([exif(6)]);
    assert.equal(orientation(cut.subarray(0, 33 + 8 + 20), 'a.png'), 1, 'a file cut inside its eXIf');
    assert.equal(orientation(cut.subarray(0, 20), 'a.png'), 1, 'no whole header');
    const failing = Buffer.from(cut);
    failing.writeUInt32BE((failing.readUInt32BE(33 + 8 + 26) ^ 1) >>> 0, 33 + 8 + 26);
    assert.equal(orientation(failing, 'a.png'), 1, 'a CRC that fails');
});

test("a PNG's eXIf of any size orients it, its CRC read a piece at a time", () => {
    const sized = (length: number) => png([pngChunk('eXIf', Buffer.concat([tiffOrientation(6), Buffer.alloc(length - 26)]))]);
    // Past what Firefox reads, and past what Chromium reads.
    for (const length of [65_536, 77_534, 9 * 1024 * 1024]) assert.equal(orientation(sized(length), 'a.png'), 6, `${length} bytes`);
    const large = sized(9 * 1024 * 1024);
    const parts: number[] = [];
    assert.equal(orientation(large, 'a.png', parts), 6);
    assert.ok(Math.max(...parts) <= 1 << 20, `no part past a mebibyte: ${Math.max(...parts)}`);
    const broken = Buffer.from(large);
    broken[large.indexOf(Buffer.from('eXIf')) + 4 + 9 * 1024 * 1024 - 5]! ^= 1;
    assert.equal(orientation(broken, 'a.png'), 1, 'a CRC that fails over its last piece');
});

test("an AVIF's rotation and then its mirror orient it, as every browser draws it", () => {
    // Each browser's drawing of `irot`'s quarter turns with no mirror, a mirror on axis 0 and one on axis 1, as EXIF.
    const drawn = { none: [1, 8, 3, 6], 0: [4, 5, 2, 7], 1: [2, 7, 4, 5] } as const;
    for (const mirror of ['none', 0, 1] as const)
        for (let turn = 0; turn < 4; turn++)
            for (const mirrorFirst of [false, true]) {
                const picture = avif(640, 480, [], { turn, mirrorFirst, ...(mirror === 'none' ? {} : { mirror }) });
                assert.equal(
                    orientation(picture, 'a.avif'),
                    drawn[mirror][turn],
                    `irot ${turn}, imir ${mirror}, mirror first ${mirrorFirst}`
                );
            }
    assert.equal(orientation(avif(640, 480, [], { mirror: 1 }), 'a.avif'), 2, 'a mirror alone');
    assert.equal(orientation(avif(5712, 4284, [], { tiles: true, turn: 3 }), 'a.avif'), 6, "the primary item's, past its tiles'");
    assert.equal(
        orientation(avif(4032, 3024, [box('mdat', Buffer.alloc(6 * 1024 * 1024))], { turn: 1 }), 'a.avif'),
        8,
        'behind a large media box'
    );
    const valid = avif(800, 600, [], { turn: 1 });
    const overrun = Buffer.from(valid);
    overrun.writeUInt32BE(valid.length, valid.indexOf('meta', 0, 'latin1') - 4);
    assert.equal(orientation(overrun, 'a.avif'), 1, 'a box past its parent');
    const zeroed = Buffer.from(valid);
    zeroed.writeUInt32BE(0, zeroed.indexOf('ispe', 0, 'latin1') + 8);
    assert.equal(orientation(zeroed, 'a.avif'), 1, 'no extents');
});

test('a WebP, GIF, BMP or SVG is drawn as stored, its bytes never read', async () => {
    for (const path of ['a.webp', 'a.gif', 'a.bmp', 'a.svg', 'noextension']) assert.equal(pictureOrientationReading(path, 100), null, path);
    const { window, served } = serving(png([exif(6)]), 64);
    assert.equal(await readPictureOrientation(window, address('a.webp'), 'media/a.webp', 100), 1);
    assert.equal(served.fetched, 0);
});

test('a picture is read from its resource stream until its orientation is known, then the stream is canceled', async () => {
    const picture = Buffer.concat([jpeg(exifSegment(6)), Buffer.alloc(4 * 1024 * 1024)]);
    const { window, served } = serving(picture, 64 * 1024);
    const url = address('photo.jpg');
    assert.equal(await readPictureOrientation(window, url, 'media/photo.jpg', picture.length), 6);
    assert.equal(served.pulled, 64 * 1024, 'its first chunk alone');
    assert.ok(served.canceled);
    assert.equal(knownOrientation(url), 6);
    assert.equal(await readPictureOrientation(window, url, 'media/photo.jpg', picture.length), 6);
    assert.equal(served.fetched, 1, 'a picture read once is known');
});

test('a reading that steps back is served from the bytes the stream already gave, across chunks and empty ones', async () => {
    const large = png([pngChunk('eXIf', Buffer.concat([tiffOrientation(8, true), Buffer.alloc(3 * 1024 * 1024)]))]);
    const first = serving(large, 777_777, { empty: true });
    assert.equal(await readPictureOrientation(first.window, address('large.png'), 'media/large.png', large.length), 8);
    const behind = avif(4032, 3024, [box('mdat', Buffer.alloc(3 * 1024 * 1024))], { turn: 3, mirror: 0 });
    const second = serving(behind, 1_000_003, { empty: true });
    assert.equal(await readPictureOrientation(second.window, address('behind.avif'), 'media/behind.avif', behind.length), 7);
    for (const size of [1, 7, 4096]) {
        const small = jpeg(exifSegment(5, true));
        const { window } = serving(small, size, { empty: true });
        assert.equal(await readPictureOrientation(window, address('small.jpg'), 'media/small.jpg', small.length), 5, `chunks of ${size}`);
    }
});

test('a file that ends inside a part is read as far as it goes', async () => {
    const whole = png([exif(6)]);
    const cut = whole.subarray(0, 33 + 8 + 20);
    const { window, served } = serving(cut, 16);
    assert.equal(await readPictureOrientation(window, address('cut.png'), 'media/cut.png', whole.length), 1);
    assert.equal(served.pulled, cut.length);
});

test('a read that fails is not kept, and pictures of one file share a read', async () => {
    const picture = png([exif(6)]);
    const { window, served } = serving(picture, 64, { fail: 1 });
    const url = address('flaky.png');
    assert.equal(await readPictureOrientation(window, url, 'media/flaky.png', picture.length), null);
    assert.equal(knownOrientation(url), undefined);
    const [one, two] = await Promise.all([
        readPictureOrientation(window, url, 'media/flaky.png', picture.length),
        readPictureOrientation(window, url, 'media/flaky.png', picture.length)
    ]);
    assert.deepEqual([one, two], [6, 6]);
    assert.equal(served.fetched, 2, 'the failed read, then one shared read');
});
