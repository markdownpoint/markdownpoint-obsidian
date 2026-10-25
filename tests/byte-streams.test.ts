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
import test from 'node:test';
import { equalByteStreams } from '../src/presentation/byte-streams.ts';

const stream = (chunks: readonly number[][]) =>
    new ReadableStream<Uint8Array>({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(new Uint8Array(chunk));
            controller.close();
        }
    });

void test('byte comparison ignores chunk boundaries and empty chunks', async () => {
    for (const chunks of [[[1, 2, 3, 4]], [[1], [], [2, 3], [], [4]], [[], [1, 2], [3, 4], []]]) {
        assert.equal(await equalByteStreams(stream([[1, 2, 3, 4]]), stream(chunks), () => true), true);
    }
    assert.equal(await equalByteStreams(stream([]), stream([[], []]), () => true), true);
});

void test('different lengths and contents are not treated as the same media', async () => {
    for (const chunks of [[[1, 2, 3]], [[1, 2, 3, 4, 5]], [[1, 2, 0, 4]], []]) {
        assert.equal(
            await equalByteStreams(
                stream([
                    [1, 2],
                    [3, 4]
                ]),
                stream(chunks),
                () => true
            ),
            false
        );
    }
});

void test('cancellation closes both streams and releases their readers', async () => {
    let canceled = 0,
        checks = 0;
    const endless = () =>
        new ReadableStream<Uint8Array>({
            pull(controller) {
                controller.enqueue(new Uint8Array(64));
            },
            cancel() {
                canceled++;
            }
        });
    const first = endless(),
        second = endless();
    await assert.rejects(
        equalByteStreams(first, second, () => ++checks < 8),
        /canceled/
    );
    assert.equal(canceled, 2);
    assert.equal(first.locked, false);
    assert.equal(second.locked, false);
});

void test('a read failure also closes the other stream', async () => {
    let canceled = false;
    const first = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.error(new Error('Read failed'));
        }
    });
    const second = new ReadableStream<Uint8Array>({
        cancel() {
            canceled = true;
        }
    });
    await assert.rejects(
        equalByteStreams(first, second, () => true),
        /Read failed/
    );
    assert.equal(canceled, true);
    assert.equal(first.locked, false);
    assert.equal(second.locked, false);
});
