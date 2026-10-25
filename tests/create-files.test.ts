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
import test from "node:test";
import { createPresentationFiles } from "../src/presentation/create-files.ts";
import { presentationFolderName } from "../src/format/new-presentation.ts";

interface File { path: string; source: string; stat: { mtime: number; size: number } }
interface Folder { path: string; children: (File | Folder)[] }
const contents = new Map([["themes/basic/master.json", "theme"], ["presentation.mdpoint", "metadata"], ["slides.md", "words"]]);

function vault() {
  const nodes = new Map<string, File | Folder>([["", { path: "", children: [] }]]), writes: string[] = [];
  let clock = 0;
  const state: { beforeWrite: (path: string) => void } = { beforeWrite: () => undefined };
  const parent = (path: string) => nodes.get(path.slice(0, Math.max(0, path.lastIndexOf("/")))) as Folder;
  const add = <T extends File | Folder>(node: T): T => {
    if (nodes.has(node.path)) throw new Error("Already exists");
    nodes.set(node.path, node); parent(node.path).children.push(node); return node;
  };
  const create = (path: string, source: string): Promise<File> => {
    state.beforeWrite(path); writes.push(path);
    return Promise.resolve(add({ path, source, stat: { mtime: ++clock, size: source.length } }));
  };
  return { nodes, writes, state, host: {
    getAbstractFileByPath: (path: string) => nodes.get(path) ?? null,
    createFolder: (path: string): Promise<Folder> => Promise.resolve(add({ path, children: [] })),
    create, copy: (file: File, path: string) => create(path, file.source),
    trash: (node: File | Folder) => {
      assert.ok(!("children" in node) || !node.children.length, "rollback never removes foreign descendants");
      nodes.delete(node.path); parent(node.path).children = parent(node.path).children.filter(child => child !== node);
      return Promise.resolve();
    },
  } };
}

void test("creation writes a complete theme before its fixed pair and returns the draft", async () => {
  const { host, writes, nodes } = vault();
  const picture: File = { path: "source/logo.jpg", source: "binary-image", stat: { mtime: 1, size: 12 } };
  const files = new Map<string, string | File>([...contents, ["themes/basic/media/logo.jpg", picture]]);
  const made = await createPresentationFiles(host, "Årets möte", files, () => true);
  assert.equal(made.path, "Årets möte/slides.md");
  assert.deepEqual(writes.slice(-2), ["Årets möte/presentation.mdpoint", "Årets möte/slides.md"]);
  assert.equal((nodes.get("Årets möte/themes/basic/media/logo.jpg") as File).source, picture.source);
  assert.equal(picture.path, "source/logo.jpg");
});

void test("an existing destination and invalid relative paths cause no writes", async () => {
  const { host, nodes, writes } = vault();
  await host.createFolder("Existing");
  await assert.rejects(createPresentationFiles(host, "Existing", contents, () => true), /already exists/);
  for (const path of ["../escape", "/absolute", "themes/../escape", "themes\\escape"]) {
    await assert.rejects(createPresentationFiles(host, "New", new Map([...contents, [path, "bad"]]), () => true), /Invalid/);
  }
  assert.deepEqual(writes, []); assert.equal(nodes.size, 2);
});

void test("a write failure removes this operation's files and empty folders", async () => {
  const { host, nodes, state } = vault();
  state.beforeWrite = path => { if (path.endsWith("slides.md")) throw new Error("Disk full"); };
  await assert.rejects(createPresentationFiles(host, "New", contents, () => true), /Disk full/);
  assert.deepEqual([...nodes.keys()], [""]);
});

void test("canceling before or during creation leaves no partial presentation", async () => {
  const { host, nodes, state } = vault();
  await assert.rejects(createPresentationFiles(host, "New", contents, () => false), /canceled/);
  assert.equal(nodes.size, 1);
  let active = true;
  state.beforeWrite = path => { if (path.endsWith("slides.md")) active = false; };
  await assert.rejects(createPresentationFiles(host, "New", contents, () => active), /canceled/);
  assert.deepEqual([...nodes.keys()], [""]);
});

void test("rollback retains newer edits to a created file", async () => {
  const { host, nodes, state } = vault();
  state.beforeWrite = path => {
    if (!path.endsWith("slides.md")) return;
    const edited = nodes.get("New/themes/basic/master.json") as File;
    edited.source = "someone's newer edit"; edited.stat.mtime++;
    throw new Error("Write failed");
  };
  await assert.rejects(createPresentationFiles(host, "New", contents, () => true), /Write failed/);
  assert.equal((nodes.get("New/themes/basic/master.json") as File).source, "someone's newer edit");
  assert.ok(!nodes.has("New/presentation.mdpoint"));
});

void test("folder names retain spaces and non-ASCII text while rejecting unsafe path components", () => {
  assert.equal(presentationFolderName("  Årets möte  "), "Årets möte");
  assert.equal(presentationFolderName("A\u030arets mo\u0308te"), "Årets möte");
  for (const name of ["", ".hidden", "..", "a/b", "a\\b", "CON", "LPT1.txt", "end.", "a\nline", "A:B"]) assert.equal(presentationFolderName(name), null, name);
});
