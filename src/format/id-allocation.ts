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

/** An allocated id's random tail, as MarkdownPoint draws one: a letter, then five lowercase letters or digits. */
export const ALLOCATED_TAIL = /^[a-z][a-z0-9]{5}$/;

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomCharacter(characters: string): string {
    const word = new Uint32Array(1);
    crypto.getRandomValues(word);
    return characters[Math.floor((word[0]! / 0x1_0000_0000) * characters.length)]!;
}

/**
 * A fresh id as MarkdownPoint allocates one, `id-` and a random tail, retried against the ids in use. MarkdownPoint
 * reads only that shape as allocated, and names a copy of anything else after the whole id.
 */
export function mintId(used: { has(id: string): boolean } = new Set()): string {
    // Bounded so that ids in use covering the draws ends in an error rather than a hang.
    for (let attempt = 0; attempt < 64; attempt += 1) {
        let tail = randomCharacter(LETTERS);
        for (let index = 0; index < 5; index += 1) tail += randomCharacter(ALPHANUMERIC);
        const id = `id-${tail}`;
        if (!used.has(id)) return id;
    }
    throw new Error('Could not allocate a fresh id');
}
