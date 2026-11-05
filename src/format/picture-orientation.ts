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

/**
 * A picture's orientation from its own bytes, read as MarkdownPoint reads it, with MarkdownPoint's own reader: a JPEG's
 * first Exif segment that holds anything, a PNG's `eXIf` of any size before its image data whose CRC holds, an AVIF's
 * rotation and then its mirror. The format turns each picture by this rule alone, whatever a browser reads: Chromium
 * draws a PNG with a large `eXIf` as stored, and a WebP and every other picture are drawn as stored.
 */

/** The bytes a reading needs next: `length` from `offset`, and fewer where the file ends first. */
export interface Part {
    readonly offset: number;
    readonly length: number;
}

type Reading<T> = Generator<Part, T, Uint8Array>;

/** How much of a PNG's `eXIf` is read at once for its CRC, so one of any size is checked in that much memory. */
const EXIF_PIECE_BYTES = 1 << 20;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_CRC_START = 0xffffffff;
const PNG_CRC_TABLE = createPngCrcTable();

/**
 * What reads the orientation of the picture at `path`, a file of `size` bytes, by its extension as MarkdownPoint types
 * it; null for a picture drawn as stored, whose bytes need no reading. A picture its reading can't make out is drawn as
 * stored, at 1.
 */
export function pictureOrientationReading(path: string, size: number): Reading<number> | null {
    const extension = path
        .slice(path.lastIndexOf('/') + 1)
        .match(/\.([^.]*)$/)?.[1]
        ?.toLowerCase();
    if (extension === 'png') return pngPicture();
    if (extension === 'jpg' || extension === 'jpeg') return jpegFrame();
    if (extension === 'avif') return isobmffFrame(size);
    return null;
}

const data = (bytes: Uint8Array): DataView => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
/** Text of one character a byte, each byte's bits kept under `mask`: all of them as Latin-1 reads it, seven as ASCII does. */
function characters(bytes: Uint8Array, start: number, end: number, mask: number): string {
    let text = '';
    for (const byte of bytes.subarray(start, end)) text += String.fromCharCode(byte & mask);
    return text;
}
const latin1 = (bytes: Uint8Array, start: number, end: number): string => characters(bytes, start, end, 0xff);
const ascii = (bytes: Uint8Array, start: number, end: number): string => characters(bytes, start, end, 0x7f);

function createPngCrcTable(): Uint32Array {
    const table = new Uint32Array(256);
    for (let index = 0; index < table.length; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        table[index] = value >>> 0;
    }
    return table;
}

/** The running value `crc` carried over `bytes`. */
function pngCrc32Over(crc: number, bytes: Uint8Array): number {
    for (const byte of bytes) crc = PNG_CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    return crc;
}

/** The CRC a running value comes to once every byte is over. */
function pngCrc32End(crc: number): number {
    return (crc ^ 0xffffffff) >>> 0;
}

/** A PNG's orientation, past its header: the `eXIf` found by stepping over the chunks before its image data. */
function* pngPicture(): Reading<number> {
    const header = yield { offset: 0, length: 24 };
    if (header.length < 24 || !PNG_SIGNATURE.every((byte, index) => header[index] === byte)) return 1;
    return yield* pngOrientation();
}

/**
 * The orientation a PNG's `eXIf` chunk holds, of any size, found by stepping from chunk to chunk by each one's length;
 * 1 without one. Only an `eXIf` before the image data whose CRC holds orients a picture, so the walk ends at the image
 * data, as it does where the file does.
 */
function* pngOrientation(): Reading<number> {
    for (let at = PNG_SIGNATURE.length; ;) {
        const head = yield { offset: at, length: 8 };
        if (head.length < 8) return 1;
        const length = data(head).getUint32(0);
        const type = latin1(head, 4, 8);
        if (type === 'IDAT' || type === 'IEND') return 1;
        if (type === 'eXIf') {
            // Its CRC covers its type and its data, read a piece at a time.
            let crc = pngCrc32Over(PNG_CRC_START, head.subarray(4, 8));
            for (let done = 0; done < length;) {
                const piece = yield { offset: at + 8 + done, length: Math.min(EXIF_PIECE_BYTES, length - done) };
                if (piece.length === 0) return 1;
                crc = pngCrc32Over(crc, piece);
                done += piece.length;
            }
            const stored = yield { offset: at + 8 + length, length: 4 };
            if (stored.length < 4 || pngCrc32End(crc) !== data(stored).getUint32(0)) return 1;
            return yield* tiffOrientation(at + 8, length);
        }
        at += 12 + length;
    }
}

/**
 * A JPEG's orientation, once its frame header shows it a picture: steps from segment to segment by each one's length,
 * reading only the first Exif segment's orientation and the frame header.
 */
function* jpegFrame(): Reading<number> {
    const start = yield { offset: 0, length: 2 };
    if (start.length < 2 || start[0] !== 0xff || start[1] !== 0xd8) return 1;
    let offset = 2;
    let orientation: number | undefined;
    for (;;) {
        const head = yield { offset, length: 4 };
        let fill = 0;
        while (fill < head.length && head[fill] === 0xff) fill += 1;
        if (fill === head.length) {
            if (head.length < 4) return 1;
            offset += fill;
            continue;
        }
        const marker = head[fill]!;
        offset += fill + 1;
        if (marker === 0xd9 || marker === 0xda) return 1;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        const field = yield { offset, length: 2 };
        if (field.length < 2) return 1;
        const length = data(field).getUint16(0);
        if (length < 2) return 1;
        if (marker === 0xe1 && orientation === undefined) {
            // Its length, then its header.
            const segment = yield { offset, length: Math.min(length, 8) };
            if (segment.length < Math.min(length, 8)) return 1;
            // The first Exif segment that holds anything past its header alone orients the picture, as Chromium and Safari
            // read it: one without an orientation, or broken, leaves it as stored whatever a later one holds. An XMP segment
            // orients nothing.
            if (latin1(segment, 2, 8) === 'Exif\0\0' && length > 8) orientation = yield* tiffOrientation(offset + 8, length - 8);
        }
        if (isFrameMarker(marker)) {
            if (length < 7) return 1;
            const frame = yield { offset, length: 7 };
            if (frame.length < 7) return 1;
            return orientation ?? 1;
        }
        offset += length;
    }
}

/** A frame header's marker: SOF0 to SOF15, past the DHT, JPG and DAC markers that share their range. */
function isFrameMarker(marker: number): boolean {
    return (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
    );
}

/**
 * The orientation EXIF holds in the TIFF structure of `length` bytes at `start`, as a JPEG's Exif segment holds it after
 * its header and a PNG's `eXIf` chunk holds it whole: the first image directory's orientation entry, in the structure's
 * own byte order, read alone. 1 where it holds none or breaks off.
 */
function* tiffOrientation(start: number, length: number): Reading<number> {
    if (length < 8) return 1;
    const header = yield { offset: start, length: 8 };
    if (header.length < 8) return 1;
    const order = ascii(header, 0, 2);
    const little = order === 'II';
    if (!little && order !== 'MM') return 1;
    if (data(header).getUint16(2, little) !== 42) return 1;
    const directory = data(header).getUint32(4, little);
    if (directory + 2 > length) return 1;
    const counted = yield { offset: start + directory, length: 2 };
    if (counted.length < 2) return 1;
    // Its entries, as far as the structure holds them: one past its end breaks the directory off.
    const count = data(counted).getUint16(0, little);
    const held = Math.min(count * 12, length - directory - 2);
    const entries = yield { offset: start + directory + 2, length: held };
    for (let index = 0; index < count; index += 1) {
        const entry = index * 12;
        if (entry + 12 > entries.length) return 1;
        const view = data(entries);
        if (
            view.getUint16(entry, little) === 0x0112 &&
            view.getUint16(entry + 2, little) === 3 &&
            view.getUint32(entry + 4, little) === 1
        ) {
            const value = view.getUint16(entry + 8, little);
            return value >= 1 && value <= 8 ? value : 1;
        }
    }
    return 1;
}

/**
 * The EXIF orientation of an AVIF's rotation (`irot`, counterclockwise quarter turns) and mirror (`imir`), the mirror
 * applied after the rotation, as MIAF orders them and Chromium, Safari and Firefox draw them: a mirror on axis 0 turns
 * the picture top to bottom, one on axis 1 left to right. A file listing the mirror first is read as Chromium reads it.
 */
const AVIF_ORIENTATIONS = { none: [1, 8, 3, 6], 0: [4, 5, 2, 7], 1: [2, 7, 4, 5] } as const;

/**
 * An AVIF's orientation, once its primary item (`pitm`) shows a size: the image spatial extents (`ispe`), rotation
 * (`irot`) and mirror (`imir`) properties the item property associations (`ipma`) name for it by their indices in
 * `ipco`, inside the file's meta box. Boxes are stepped over by their lengths, a 64-bit one and one reaching its parent's
 * end included.
 */
function* isobmffFrame(size: number): Reading<number> {
    const meta = yield* childBox(0, size, 'meta');
    // The meta box is a full box: a version and flags come before its children.
    if (!meta || meta.end - meta.body < 4) return 1;
    const pitm = yield* childBox(meta.body + 4, meta.end, 'pitm');
    const iprp = yield* childBox(meta.body + 4, meta.end, 'iprp');
    const ipco = iprp ? yield* childBox(iprp.body, iprp.end, 'ipco') : null;
    const ipma = iprp ? yield* childBox(iprp.body, iprp.end, 'ipma') : null;
    if (!pitm || !ipco || !ipma) return 1;
    // A full box's version and flags, then the item's id: 16 bits at version 0, 32 after.
    const item = yield { offset: pitm.body, length: 8 };
    if (item.length < 6 || (item[0]! > 0 && item.length < 8)) return 1;
    const properties = primaryProperties(
        yield { offset: ipma.body, length: ipma.end - ipma.body },
        item[0] === 0 ? data(item).getUint16(4) : data(item).getUint32(4)
    );
    if (!properties) return 1;
    let extents: { width: number; height: number } | null = null;
    let quarters = 0;
    let mirror: 0 | 1 | 'none' = 'none';
    for (let offset = ipco.body, propertyIndex = 1; propertyIndex <= Math.max(0, ...properties); propertyIndex++) {
        const property = yield* boxAt(offset, ipco.end);
        if (!property) return 1;
        if (properties.includes(propertyIndex) && property.type === 'ispe') {
            // Version and flags, then a 32-bit width and height.
            const sides = property.end - property.body >= 12 ? yield { offset: property.body, length: 12 } : new Uint8Array(0);
            if (sides.length === 12) extents = { width: data(sides).getUint32(4), height: data(sides).getUint32(8) };
        } else if (
            properties.includes(propertyIndex) &&
            (property.type === 'irot' || property.type === 'imir') &&
            property.end > property.body
        ) {
            // Counterclockwise quarter turns in the low two bits, or the mirror's axis in the low bit.
            const value = (yield { offset: property.body, length: 1 })[0]!;
            if (property.type === 'irot') quarters = value & 3;
            else mirror = (value & 1) as 0 | 1;
        }
        offset = property.end;
    }
    if (!extents || !(extents.width > 0 && extents.height > 0)) return 1;
    return AVIF_ORIENTATIONS[mirror][quarters]!;
}

/**
 * The indices in `ipco`, counted from 1, of the properties `ipma` associates with `item`. Each association is a byte, or
 * two where the box's flags say so, whose top bit marks the property essential.
 */
function primaryProperties(ipma: Uint8Array, item: number): number[] | null {
    if (ipma.length < 8) return null;
    const version = ipma[0]!;
    const wide = (ipma[3]! & 1) === 1;
    const idLength = version < 1 ? 2 : 4;
    const width = wide ? 2 : 1;
    let at = 8;
    for (let entries = data(ipma).getUint32(4); entries > 0; entries--) {
        if (at + idLength + 1 > ipma.length) return null;
        const id = version < 1 ? data(ipma).getUint16(at) : data(ipma).getUint32(at);
        const count = ipma[at + idLength]!;
        at += idLength + 1;
        if (at + count * width > ipma.length) return null;
        if (id === item)
            return Array.from({ length: count }, (_, index) =>
                wide ? data(ipma).getUint16(at + index * 2) & 0x7fff : ipma[at + index]! & 0x7f
            );
        at += count * width;
    }
    return null;
}

/** The first box of `type` among the boxes from `start` to `end`: where its body starts and where it ends. */
function* childBox(start: number, end: number, type: string): Reading<{ body: number; end: number } | null> {
    for (let offset = start; offset + 8 <= end;) {
        const box = yield* boxAt(offset, end);
        if (!box) return null;
        if (box.type === type) return { body: box.body, end: box.end };
        offset = box.end;
    }
    return null;
}

/** The box at `offset`, which must end by `end`: its type, where its body starts and where it ends. */
function* boxAt(offset: number, end: number): Reading<{ type: string; body: number; end: number } | null> {
    if (offset + 8 > end) return null;
    const header = yield { offset, length: 16 };
    if (header.length < 8) return null;
    let length = data(header).getUint32(0);
    let body = offset + 8;
    if (length === 1) {
        if (header.length < 16) return null;
        const large = data(header).getBigUint64(8);
        if (large > BigInt(end - offset)) return null;
        length = Number(large);
        body = offset + 16;
    } else if (length === 0) {
        length = end - offset;
    }
    if (offset + length > end || offset + length < body) return null;
    return { type: latin1(header, 4, 8), body, end: offset + length };
}
