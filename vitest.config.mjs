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

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [
        {
            // A picture the plugin ships is its bytes, as the bundle's binary loader gives them (esbuild.config.mjs)
            name: 'picture-bytes',
            enforce: 'pre',
            load(id) {
                if (!id.endsWith('.jpg')) return null;
                const base64 = readFileSync(id).toString('base64');
                return `export default Uint8Array.from(atob(${JSON.stringify(base64)}), character => character.charCodeAt(0));`;
            }
        }
    ],
    resolve: {
        alias: {
            // The plugin's runtime imports of Obsidian resolve to headless stand-ins
            obsidian: fileURLToPath(new URL('./tests/support/obsidian.ts', import.meta.url))
        }
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts']
    }
});
