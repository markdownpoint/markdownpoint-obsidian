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
 * The orientation of the picture at vault `path`, `size` bytes, that the resource `url` serves, read from the bytes
 * `read` gives through the vault; 1 for a picture drawn as stored, with no read. Null while its bytes can't be read,
 * which is never kept, so the next picture of it asks again.
 */
export function readPictureOrientation(read: () => Promise<ArrayBuffer>, url: string, path: string, size: number): Promise<number | null> {
    const known = readings.get(url);
    if (known !== undefined) return Promise.resolve(known);
    let answer = reading.get(url);
    if (!answer) {
        const picture = pictureOrientationReading(path, size);
        answer = (picture ? read().then(bytes => orientationFrom(picture, new Uint8Array(bytes))) : Promise.resolve(1))
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

/** What `picture` reads from the file's `bytes`: each part it asks for, shorter where the file ends first. */
function orientationFrom(picture: Generator<Part, number, Uint8Array>, bytes: Uint8Array): number {
    let step = picture.next();
    while (!step.done) step = picture.next(bytes.subarray(step.value.offset, step.value.offset + step.value.length));
    return step.value;
}
