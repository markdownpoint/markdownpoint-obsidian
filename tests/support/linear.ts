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

/** The CPU time one read of `input` takes, read again until the reads add up to a fifth of a second. */
function cpuPerRead<Input>(read: (input: Input) => unknown, input: Input): number {
    const started = process.cpuUsage();
    for (let reads = 1; ; reads++) {
        read(input);
        const { user, system } = process.cpuUsage(started);
        if (user + system >= 200_000) return (user + system) / reads;
    }
}

/**
 * That `read` grows linearly: four times the input in under eight times the CPU time, where a quadratic read takes
 * sixteen. Each size is built apart from its reading, warmed once, and the two are read in turn three times, each at its
 * quickest, so a stretch of the machine's other work counts against neither.
 */
export function assertLinear<Input>(what: string, build: (count: number) => Input, read: (input: Input) => unknown, count: number): void {
    read(build(count / 4));
    const once = build(count);
    const more = build(4 * count);
    const small: number[] = [];
    const large: number[] = [];
    for (let turn = 0; turn < 3; turn++) {
        small.push(cpuPerRead(read, once));
        large.push(cpuPerRead(read, more));
    }
    const grown = Math.min(...large) / Math.min(...small);
    assert.ok(grown < 8, `${what}: four times as many took ${grown.toFixed(1)} times the CPU time`);
}
