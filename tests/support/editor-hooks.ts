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

import { registerHooks } from 'node:module';
import { transformSync } from 'esbuild';

// Editor modules import Obsidian and use parameter properties: resolve Obsidian to headless stubs and transform
// TypeScript with esbuild, as the production bundle does. Import editor modules dynamically after this module.
registerHooks({
    resolve(specifier, context, next) {
        return specifier === 'obsidian'
            ? { url: new URL('./obsidian-fields.ts', import.meta.url).href, shortCircuit: true }
            : next(specifier, context);
    },
    load(url, context, next) {
        const result = next(url, context);
        if (!url.endsWith('.ts') || result.source == null) return result;
        const source = typeof result.source === 'string' ? result.source : new TextDecoder().decode(result.source);
        return { ...result, format: 'module', source: transformSync(source, { loader: 'ts', target: 'esnext', format: 'esm' }).code };
    }
});
