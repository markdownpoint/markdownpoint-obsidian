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

/** Compare local file responses without retaining entire videos, models, or font files in memory. */
export async function equalByteStreams(
    first: ReadableStream<Uint8Array>,
    second: ReadableStream<Uint8Array>,
    current: () => boolean
): Promise<boolean> {
    const left = first.getReader();
    const right = second.getReader();
    let a: ReadableStreamReadResult<Uint8Array> = { done: false, value: new Uint8Array() };
    let b: ReadableStreamReadResult<Uint8Array> = { done: false, value: new Uint8Array() };
    let ai = 0;
    let bi = 0;
    try {
        for (;;) {
            if (!current()) throw new Error('File comparison canceled');
            while (!a.done && ai === a.value.length) {
                if (!current()) throw new Error('File comparison canceled');
                a = await left.read();
                ai = 0;
            }
            while (!b.done && bi === b.value.length) {
                if (!current()) throw new Error('File comparison canceled');
                b = await right.read();
                bi = 0;
            }
            if (a.done || b.done) return a.done === b.done;
            const count = Math.min(a.value.length - ai, b.value.length - bi);
            for (let i = 0; i < count; i++) if (a.value[ai + i] !== b.value[bi + i]) return false;
            ai += count;
            bi += count;
        }
    } finally {
        await Promise.allSettled([left.cancel(), right.cancel()]);
        left.releaseLock();
        right.releaseLock();
    }
}
