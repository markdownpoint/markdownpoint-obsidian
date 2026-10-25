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

import { TFile, TFolder, getFrontMatterInfo, parseYaml } from "obsidian";
import type { App } from "obsidian";
import type { SlideClipboard } from "../format/clipboard.ts";
import type { CapturedSlides } from "../format/capture.ts";
import type { EmbeddedTheme } from "../format/embedded-theme.ts";
import { themeAssetPaths } from "../format/embedded-theme.ts";
import { planClipboardAssets } from "../format/clipboard-assets.ts";
import { readJsonObject } from "../format/json.ts";
import { presentationIdentity } from "../format/recognition.ts";
import { clipboardDigest } from "../settings/clipboard.ts";
import { sameClipboardTheme } from "../format/paste.ts";
import { presentationFiles } from "./presentation-files.ts";
import { readEmbeddedTheme } from "./theme-reader.ts";
import { equalByteStreams } from "./byte-streams.ts";

export interface TransferredSlides { readonly captured: CapturedSlides; current(): boolean; cleanup(): Promise<void> }
export class ThemeArtworkMismatch extends Error {}

/** Copy files before a slide edit. Successful imports remain available for native undo/redo. */
export async function transferSlideAssets(app: App, packet: SlideClipboard, destination: TFile, theme: EmbeddedTheme,
  ownerWindow: Window, current: () => boolean, signal: AbortSignal): Promise<TransferredSlides> {
  const plan = planClipboardAssets(packet.captured), themeFiles = themeAssetPaths(packet.theme);
  if (!plan || !themeFiles) throw new Error("Clipboard media references are unreadable");
  if (!current() || signal.aborted) throw new Error("Media transfer canceled");
  if (!plan.files.length && !themeFiles.length) return { captured: packet.captured, current: () => current() && !signal.aborted, cleanup: () => Promise.resolve() };
  const source = presentationFiles(app.vault, packet.origin.path), target = presentationFiles(app.vault, destination.path);
  if (!source || !target || target.markdown !== destination) throw new Error("Presentation files are missing or ambiguous");
  const sources = await Promise.all([app.vault.read(source.markdown), app.vault.read(source.companion), app.vault.read(target.companion)]);
  const header = getFrontMatterInfo(sources[0]);
  const frontmatter: unknown = header.exists ? parseYaml(header.frontmatter) : null;
  if (presentationIdentity(frontmatter, readJsonObject(sources[1])) !== packet.origin.document) throw new Error("Clipboard source identity changed");
  const originRoot = packet.origin.path.slice(0, packet.origin.path.lastIndexOf("/") + 1);
  const destinationRoot = destination.path.slice(0, destination.path.lastIndexOf("/") + 1);
  const files = new Map<string, TFile>();
  for (const path of plan.files) {
    const file = app.vault.getFileByPath(originRoot + path);
    if (!file) throw new Error("A source media file is missing");
    files.set(path, file);
  }
  const held = new Map<TFile, { path: string; mtime: number; size: number }>();
  const hold = (file: TFile) => { if (!held.has(file)) held.set(file, { path: file.path, mtime: file.stat.mtime, size: file.stat.size }); };
  for (const file of [source.markdown, source.companion, ...files.values()]) hold(file);
  const valid = () => current() && !signal.aborted && [...held].every(([file, before]) =>
    app.vault.getFileByPath(before.path) === file && file.path === before.path && file.stat.mtime === before.mtime && file.stat.size === before.size);
  const check = () => { if (!valid()) throw new Error("Presentation or media changed during transfer"); };
  const created: { file: TFile; path: string; mtime: number; size: number }[] = [], folders: { folder: TFolder; path: string }[] = [];
  const companionPath = target.companion.path;
  const cleanup = async () => {
    // An edit elsewhere may now use these files. Keep them whenever that ownership is uncertain.
    const owns = () => current() && target.companion.path === companionPath && app.vault.getFileByPath(companionPath) === target.companion;
    const unchanged = async () => {
      if (!owns()) return false;
      const source = await app.vault.read(target.companion);
      return owns() && source === sources[2];
    };
    for (const entry of [...created].reverse()) {
      if (!await unchanged()) return;
      if (app.vault.getFileByPath(entry.path) === entry.file && entry.file.stat.mtime === entry.mtime && entry.file.stat.size === entry.size) await app.fileManager.trashFile(entry.file);
    }
    for (const entry of [...folders].reverse()) {
      if (!await unchanged()) return;
      if (app.vault.getFolderByPath(entry.path) === entry.folder && !entry.folder.children.length) await app.fileManager.trashFile(entry.folder);
    }
  };
  const ensureParents = async (path: string) => {
    const parts = path.split("/").slice(0, -1);
    for (let i = 1; i <= parts.length; i++) {
      check();
      const path = parts.slice(0, i).join("/"), existing = app.vault.getAbstractFileByPath(path);
      if (existing instanceof TFolder) continue;
      if (existing) throw new Error("A media folder is occupied by a file");
      const folder = await app.vault.createFolder(path); folders.push({ folder, path });
    }
  };
  const copy = async (source: TFile, path: string) => {
    await ensureParents(path); check();
    if (app.vault.getAbstractFileByPath(path)) throw new Error("A destination file appeared during transfer");
    const file = await app.vault.copy(source, path);
    created.push({ file, path, mtime: file.stat.mtime, size: file.stat.size }); hold(file); check();
  };
  const equal = async (first: TFile, second: TFile): Promise<boolean> => {
    hold(first); hold(second); check();
    if (first === second) return true;
    if (first.stat.size !== second.stat.size) return false;
    // Vault resource URLs provide local response streams in the editor's own window.
    const reads = await Promise.allSettled([first, second].map(file => ownerWindow.fetch(app.vault.getResourcePath(file), { signal })));
    const a = reads[0]?.status === "fulfilled" ? reads[0].value : null, b = reads[1]?.status === "fulfilled" ? reads[1].value : null;
    if (!a?.ok || !b?.ok || !a.body || !b.body) {
      await Promise.allSettled([a?.body?.cancel(), b?.body?.cancel()]);
      throw new Error("A media file could not be read");
    }
    const same = await equalByteStreams(a.body, b.body, () => !signal.aborted); check(); return same;
  };
  try {
    check();
    const sourceTheme = await readEmbeddedTheme(app.vault, packet.origin.path, { theme: packet.theme.key }, packet.theme.layouts.keys());
    if (!sourceTheme || !sameClipboardTheme(packet, sourceTheme)) throw new Error("The copied theme changed");
    for (const document of [sourceTheme.master, ...sourceTheme.layouts.values(), theme.master, ...theme.layouts.values()]) {
      const file = app.vault.getFileByPath(document.path);
      if (!file) throw new Error("A theme document disappeared");
      hold(file);
    }
    for (const relative of themeFiles) {
      const original = app.vault.getFileByPath(`${packet.theme.root}/${relative}`), path = `${theme.root}/${relative}`;
      if (!original) throw new Error("A theme file is missing");
      hold(original);
      const existing = app.vault.getFileByPath(path);
      if (existing && !await equal(original, existing)) throw new ThemeArtworkMismatch("Theme artwork differs between presentations");
      if (!existing) await copy(original, path);
    }
    const names = new Map<string, string>();
    for (const [relative, original] of files) {
      check();
      const before = held.get(original)!;
      const digest = await clipboardDigest(JSON.stringify([relative, before.mtime, before.size]));
      const category = relative.split("/")[0]!, extension = relative.slice(relative.lastIndexOf(".")).toLowerCase();
      const base = `${category}/clip-${packet.token}-${digest}`;
      for (let suffix = 0;; suffix++) {
        check();
        const name = `${base}${suffix ? `-${suffix}` : ""}${extension}`, path = destinationRoot + name;
        const existing = app.vault.getAbstractFileByPath(path);
        if (existing instanceof TFolder) continue;
        if (existing instanceof TFile) { if (!await equal(original, existing)) continue; }
        else await copy(original, path);
        names.set(relative, name); break;
      }
    }
    const latest = await Promise.all([
      readEmbeddedTheme(app.vault, packet.origin.path, { theme: packet.theme.key }, packet.theme.layouts.keys()),
      readEmbeddedTheme(app.vault, destination.path, { theme: theme.key }, packet.theme.layouts.keys()),
    ]);
    if (latest.some(theme => !theme || !sameClipboardTheme(packet, theme))) throw new Error("A theme changed during transfer");
    check();
    const captured = plan.remap(names);
    if (!captured) throw new Error("Media transfer could not be applied");
    return { captured, current: valid, cleanup };
  } catch (error) {
    try { await cleanup(); } catch (cleanupError) { console.error(cleanupError); }
    throw error;
  }
}
