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

import { pictureOrientationReading, type Part } from '../format/picture-orientation.ts';

/**
 * The orientations read, by the resource URL the picture loads: the URL names its file's version, so a file replaced
 * under the same name is read again, and a picture shown again turns at once.
 */
const readings = new Map<string, number>();
/** The readings on their way, so pictures of one file share a read. */
const reading = new Map<string, Promise<number | null>>();

/** The orientation read for the picture at `url`, if it has been read. */
export function knownOrientation(url: string): number | undefined {
    return readings.get(url);
}

/**
 * The orientation of the picture at vault `path`, `size` bytes, that the resource `url` serves, read from its bytes
 * through `window`, the picture's own; 1 for a picture drawn as stored, with no read. Null while its bytes can't be
 * read, which is never kept, so the next picture of it asks again.
 */
export function readPictureOrientation(window: Window, url: string, path: string, size: number): Promise<number | null> {
    const known = readings.get(url);
    if (known !== undefined) return Promise.resolve(known);
    let answer = reading.get(url);
    if (!answer) {
        const picture = pictureOrientationReading(path, size);
        answer = (picture ? streamOrientation(window, url, picture) : Promise.resolve(1))
            .then(
                orientation => {
                    readings.set(url, orientation);
                    return orientation;
                },
                () => null
            )
            .finally(() => reading.delete(url));
        reading.set(url, answer);
    }
    return answer;
}

/**
 * What `picture` reads from the resource at `url`, served by a stream: the bytes read so far are kept, since a reading
 * steps back within what it has read, and each part waits for the bytes it reaches, or for the file's end, where it
 * comes short. The stream is canceled once the reading answers, so a picture whose orientation comes first is not read
 * on to its end.
 */
async function streamOrientation(window: Window, url: string, picture: Generator<Part, number, Uint8Array>): Promise<number> {
    const response = await window.fetch(url);
    if (!response.ok || !response.body) throw new Error('A picture could not be read');
    const stream = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    let ended = false;
    try {
        let step = picture.next();
        while (!step.done) {
            const { offset, length } = step.value;
            while (!ended && total < offset + length) {
                const next = await stream.read();
                if (next.done) ended = true;
                else if (next.value.length) {
                    chunks.push(next.value);
                    total += next.value.length;
                }
            }
            step = picture.next(cut(chunks, offset, Math.min(offset + length, total)));
        }
        return step.value;
    } finally {
        void stream.cancel().catch(() => undefined);
    }
}

/** The bytes from `start` to `end` of the stream `chunks` hold in order: a view into one chunk where it holds them all. */
function cut(chunks: readonly Uint8Array[], start: number, end: number): Uint8Array {
    let bytes: Uint8Array | null = null;
    let at = 0;
    for (const chunk of chunks) {
        const next = at + chunk.length;
        if (next > start && at < end) {
            if (at <= start && next >= end) return chunk.subarray(start - at, end - at);
            bytes ??= new Uint8Array(end - start);
            bytes.set(chunk.subarray(Math.max(start - at, 0), Math.min(end - at, chunk.length)), Math.max(at - start, 0));
        }
        at = next;
    }
    return bytes ?? new Uint8Array(0);
}
