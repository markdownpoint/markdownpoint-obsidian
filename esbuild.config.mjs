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

import { build, context } from 'esbuild';
import { copyFile, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const stylesheet = await build({ entryPoints: ['styles.css'], write: false, logLevel: 'warning' });
if (stylesheet.warnings.length) throw new Error('Stylesheet validation produced warnings');

const notices = await readFile(new URL('./THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8');

// The ignored test vault picks up each local build on plugin reload; CI and fresh clones have no such vault
const testVaultPlugin = new URL('./test-vault/.obsidian/plugins/markdownpoint/', import.meta.url);
const deployToTestVault = {
    name: 'deploy-to-test-vault',
    setup(builder) {
        // Watch mode follows only the bundle's imports; the other deployed files rebuild through the entry point
        builder.onLoad({ filter: /[\\/]src[\\/]main\.ts$/ }, async args => ({
            contents: await readFile(args.path, 'utf8'),
            loader: 'ts',
            watchFiles: ['styles.css', 'manifest.json'].map(file => fileURLToPath(new URL(file, import.meta.url)))
        }));
        builder.onEnd(async result => {
            if (result.errors.length > 0 || process.env.CI) return;
            if (!(await stat(testVaultPlugin).catch(() => null))?.isDirectory()) return;
            await Promise.all(['main.js', 'manifest.json', 'styles.css'].map(file => copyFile(file, new URL(file, testVaultPlugin))));
            console.log('[deploy] test-vault/.obsidian/plugins/markdownpoint');
        });
    }
};

const options = {
    entryPoints: ['src/main.ts'],
    outfile: 'main.js',
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    external: ['obsidian', '@codemirror/*', '@lezer/*'],
    logLevel: 'info',
    sourcemap: process.argv.includes('--watch') ? 'inline' : false,
    legalComments: 'inline',
    // Obsidian installs the bundle without npm's package license files.
    banner: { js: `/*\n${notices}\n*/` },
    plugins: [deployToTestVault]
};

if (process.argv.includes('--watch')) {
    const buildContext = await context(options);
    await buildContext.watch();
} else {
    await build(options);
}
