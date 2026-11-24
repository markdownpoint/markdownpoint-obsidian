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
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { test } from 'vitest';

test("MarkdownPoint's readers are the bundle its app made at one commit, unedited: each file is what its header's digest names", () => {
    const commits = new Set<string>();
    for (const file of ['markdownpoint-readers.js', 'markdownpoint-readers.d.ts']) {
        const text = readFileSync(new URL(`../src/readers/${file}`, import.meta.url), 'utf8');
        const commit = /^\/\/ app ([0-9a-f]{40})$/m.exec(text)?.[1];
        const stamp = /^\/\/ sha256 ([0-9a-f]{64})\n/m.exec(text);
        assert.ok(commit && stamp, `${file} has the bundle's header`);
        commits.add(commit);
        const body = text.slice(stamp.index + stamp[0].length);
        assert.equal(createHash('sha256').update(body).digest('hex'), stamp[1], `${file} is as the app made it`);
    }
    assert.equal(commits.size, 1, 'both files are of one commit');
});

test("the plugin calls MarkdownPoint's readers for each rule they hold: none of its own sources declares one of their names again", () => {
    const declarations = readFileSync(new URL('../src/readers/markdownpoint-readers.d.ts', import.meta.url), 'utf8');
    const shared = new Set([...declarations.matchAll(/^export declare (?:function|const) ([A-Za-z_$][\w$]*)/gm)].map(match => match[1]));
    assert.ok(shared.has('isAuthoredFilePath') && shared.has('isPresentationFilePath'), 'the readers hold the path rules');
    const root = fileURLToPath(new URL('../src/', import.meta.url));
    const copies: string[] = [];
    for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
        const file = path.join(entry.parentPath, entry.name);
        const relative = path.relative(root, file).split(path.sep).join('/');
        if (!entry.isFile() || !relative.endsWith('.ts') || relative.startsWith('readers/')) continue;
        const source = ts.createSourceFile(relative, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
        for (const statement of source.statements) {
            const names =
                ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)
                    ? [statement.name?.text]
                    : ts.isVariableStatement(statement)
                      ? statement.declarationList.declarations.map(declaration =>
                            ts.isIdentifier(declaration.name) ? declaration.name.text : undefined
                        )
                      : [];
            for (const name of names) if (name && shared.has(name)) copies.push(`${relative}: ${name}`);
        }
    }
    assert.deepEqual(copies, [], 'each such rule is imported from src/readers');
});
