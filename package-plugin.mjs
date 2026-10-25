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

import assert from "node:assert/strict";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("./", import.meta.url);
const [manifest, project, versions] = await Promise.all(["manifest.json", "package.json", "versions.json"]
  .map(async name => JSON.parse(await readFile(new URL(name, root), "utf8"))));
assert.equal(manifest.id, "markdownpoint");
assert.match(manifest.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
assert.equal(manifest.version, project.version, "Package and manifest versions must match");
assert.equal(versions[manifest.version], manifest.minAppVersion, "Record this release in versions.json");

const output = new URL(`dist/${manifest.id}-${manifest.version}/`, root);
await mkdir(output, { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css"]) {
  assert.ok((await readFile(new URL(file, root))).length > 0, `${file} must not be empty`);
  await copyFile(new URL(file, root), new URL(file, output));
}
process.stdout.write(`Installation files: ${fileURLToPath(output)}\n`);
