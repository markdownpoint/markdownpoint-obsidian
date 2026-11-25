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
import { readFileSync } from 'node:fs';
import { test } from 'vitest';

function read(file: string): string {
    return readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

/** The version of a package npm installed, as the build bundles it. */
function installedVersion(name: string): string {
    const manifest: unknown = JSON.parse(read(`node_modules/${name}/package.json`));
    assert.ok(typeof manifest === 'object' && manifest !== null && 'version' in manifest && typeof manifest.version === 'string');
    return manifest.version;
}

// By version too: an update can change a package's license, and Dependabot's updates merge once the checks pass.
test('every package version main.js bundles has its notice in THIRD_PARTY_NOTICES.md, which the build puts at the top of main.js', () => {
    const manifest: unknown = JSON.parse(read('package.json'));
    assert.ok(typeof manifest === 'object' && manifest !== null && 'dependencies' in manifest);
    const dependencies = manifest.dependencies;
    assert.ok(typeof dependencies === 'object' && dependencies !== null);
    // The readers bundle names the packages it carries inside, as name@version, in its header
    const carried = /^\/\/ Packages: (.+?)\. Do not edit/m.exec(read('src/readers/markdownpoint-readers.js'))?.[1];
    assert.ok(carried, "the readers bundle's header names its packages");
    const bundled = [
        ...Object.keys(dependencies).map(name => ({ name, version: installedVersion(name) })),
        ...carried
            .split(', ')
            .map(entry => ({ name: entry.slice(0, entry.lastIndexOf('@')), version: entry.slice(entry.lastIndexOf('@') + 1) }))
    ];
    assert.ok(
        bundled.some(({ name }) => name === '@noble/hashes') && bundled.some(({ name }) => name === 'jsonc-parser'),
        'both sources are read'
    );

    // A heading names a package and each version its notice covers, such as "## Entities 8.1.0 and 9.0.0".
    const headings = [...read('THIRD_PARTY_NOTICES.md').matchAll(/^## .+$/gm)].map(match => match[0].slice(3).toLowerCase());
    const missing = bundled
        .filter(({ name, version }) =>
            headings.every(
                heading =>
                    !heading.startsWith(`${name.toLowerCase()} `) ||
                    !heading
                        .slice(name.length)
                        .split(/[\s,]+/)
                        .includes(version)
            )
        )
        .map(({ name, version }) => `${name}@${version}`);
    assert.deepEqual(missing, [], 'each has a "## <package> <version>" notice');
});
