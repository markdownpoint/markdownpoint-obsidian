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

import { Component, MarkdownView, TFile, getFrontMatterInfo, parseYaml } from "obsidian";
import type { App, TAbstractFile } from "obsidian";
import { indexPresentation } from "../format/document.ts";
import type { PresentationDocument } from "../format/document.ts";
import { isRecord, presentationCompanionPath, presentationIdentity } from "../format/recognition.ts";
import { outlineSections, outlineSlides } from "../outline/model.ts";
import type { OutlinePresentation } from "../outline/model.ts";
import { uiText } from "../ui-text.ts";

interface PresentationSource {
  readonly file: TFile;
  readonly path: string;
  readonly companionPath: string;
  readonly companion: unknown;
  markdown: string | null;
  snapshot: PresentationSnapshot | null;
}

export interface PresentationSnapshot {
  readonly id: string;
  readonly document: PresentationDocument;
  readonly outline: OutlinePresentation;
}

export class PresentationReader extends Component {
  private sources = new WeakMap<TFile, PresentationSource>();
  private reads = new WeakMap<TFile, { readonly view: MarkdownView | null }>();
  private followed: TFile | null = null;
  private requested: TFile | null = null;
  private running = false;

  constructor(
    private readonly app: App,
    private readonly publish: (model: OutlinePresentation | null, view: MarkdownView | null) => void,
    private readonly changed: (file: TFile) => void,
  ) { super(); }

  onload(): void {
    this.running = true;
    this.registerEvent(this.app.workspace.on("active-leaf-change", leaf => {
      if (leaf?.view instanceof MarkdownView) this.refresh(leaf.view);
    }));
    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshActive()));
    this.registerEvent(this.app.workspace.on("editor-change", (_editor, info) => {
      if (!(info instanceof MarkdownView) || !info.file) return;
      const source = this.sources.get(info.file);
      if (source) this.update(source, info.getViewData(), info);
      else if (!this.reads.has(info.file) && this.app.workspace.getMostRecentLeaf() === info.leaf) this.refresh(info);
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (file, markdown) => {
      const source = this.sources.get(file);
      if (!source) return;
      const view = this.findView(file);
      if (!view || view.getMode() === "preview") this.update(source, markdown, view);
    }));
    this.registerEvent(this.app.vault.on("create", file => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("modify", file => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("delete", file => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.onFileChange(file, oldPath)));
    this.app.workspace.onLayoutReady(() => { if (this.running) this.refreshActive(); });
  }

  onunload(): void {
    this.running = false;
    this.sources = new WeakMap();
    this.reads = new WeakMap();
    this.followed = null;
    this.requested = null;
  }

  private refreshActive(): void {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf?.view instanceof MarkdownView) this.refresh(leaf.view);
  }

  private onFileChange(file: TAbstractFile, oldPath?: string): void {
    // Open editors and the retained outline own the relevant sources. Each file's
    // read is independent; background saves cannot supersede another deck's read.
    const candidates = new Set([this.followed, this.requested]);
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView && leaf.view.file && presentationCompanionPath(leaf.view.file.path)) candidates.add(leaf.view.file);
    }
    for (const candidate of candidates) {
      if (!candidate) continue;
      const source = this.sources.get(candidate);
      const companionPath = presentationCompanionPath(candidate.path);
      // Deleted entries no longer have a parent object; paths still identify
      // conflicts removed from the source folder and files renamed out of it.
      const companionChange = [file.path, oldPath].some(path => path !== undefined && path.toLowerCase().endsWith(".mdpoint") &&
        path.slice(0, path.lastIndexOf("/") + 1) === candidate.path.slice(0, candidate.path.lastIndexOf("/") + 1));
      const affected = file === candidate || file.path === companionPath || companionChange ||
        [file.path, oldPath].some(path => path !== undefined &&
          [candidate.path, source?.path, source?.companionPath].some(owned => owned === path || owned?.startsWith(path + "/")));
      if (!affected) continue;
      if (this.app.vault.getAbstractFileByPath(candidate.path) !== candidate || !companionPath) this.forget(candidate);
      else this.refreshFile(candidate, this.findView(candidate));
    }
  }

  private refresh(view: MarkdownView): void {
    void this.refreshView(view).catch((error: unknown) => console.error(error));
  }

  async refreshView(view: MarkdownView): Promise<void> {
    if (!view.file || !presentationCompanionPath(view.file.path)) return;
    this.requested = view.file;
    await this.read(view.file, view);
  }

  private findView(file: TFile): MarkdownView | null {
    const recent = this.app.workspace.getMostRecentLeaf();
    if (recent?.view instanceof MarkdownView && recent.view.file === file) return recent.view;
    const leaf = this.app.workspace.getLeavesOfType("markdown").find(leaf => leaf.view instanceof MarkdownView && leaf.view.file === file);
    return leaf?.view instanceof MarkdownView ? leaf.view : null;
  }

  private refreshFile(file: TFile, view: MarkdownView | null): void {
    void this.read(file, view).catch((error: unknown) => console.error(error));
  }

  private async read(file: TFile, view: MarkdownView | null): Promise<void> {
    const request = { view };
    this.reads.set(file, request);
    const path = file.path;
    const companionPath = presentationCompanionPath(path);
    const companionFile = companionPath && this.app.vault.getAbstractFileByPath(companionPath);
    const companions = file.parent?.children.filter(file => file instanceof TFile &&
      file.extension.toLowerCase() === "mdpoint" && !file.name.startsWith("._"));
    try {
      if (!companionPath || !(companionFile instanceof TFile) || companions?.length !== 1) { this.forget(file); return; }
      const companion: unknown = JSON.parse(await this.app.vault.read(companionFile));
      const markdown = view ? view.getViewData() : await this.app.vault.read(file);
      // The file's newest request owns its metadata. A reused editor is never a
      // source for that earlier file, and unloading invalidates every request.
      if (!this.running || this.reads.get(file) !== request || file.path !== path ||
        this.app.vault.getAbstractFileByPath(path) !== file || (view && view.file !== file)) return;
      const source: PresentationSource = { file, path, companionPath, companion, markdown: null, snapshot: null };
      this.sources.set(file, source);
      this.update(source, markdown, view);
    } catch {
      if (this.running && this.reads.get(file) === request) this.forget(file);
    } finally {
      if (this.reads.get(file) === request) this.reads.delete(file);
    }
  }

  private forget(file: TFile): void {
    this.sources.delete(file);
    this.reads.delete(file);
    if (this.followed === file) {
      this.followed = null;
      this.publish(null, null);
    }
    this.changed(file);
  }

  private update(source: PresentationSource, markdown: string, view: MarkdownView | null): void {
    const snapshot = this.snapshot(source.file, markdown);
    if (snapshot && this.requested === source.file) this.followed = source.file;
    if (this.followed === source.file) this.publish(snapshot?.outline ?? null, view);
    this.changed(source.file);
  }

  /** One current source index is shared by outline projection and editor consumers. */
  snapshot(file: TFile, markdown: string): PresentationSnapshot | null {
    const source = this.sources.get(file);
    if (!this.running || !source || file.path !== source.path) return null;
    if (source.markdown === markdown) return source.snapshot;
    source.markdown = markdown;
    source.snapshot = this.parse(source, markdown);
    return source.snapshot;
  }

  matchesIdentity(file: TFile, markdown: string): boolean {
    const source = this.sources.get(file);
    return this.running && source !== undefined && source.path === file.path && this.identity(source, markdown) !== null;
  }

  private identity(source: PresentationSource, markdown: string): { id: string; bodyStart: number } | null {
    const header = getFrontMatterInfo(markdown);
    let frontmatter: unknown;
    try { frontmatter = header.exists ? parseYaml(header.frontmatter) : null; }
    catch { return null; }
    const id = presentationIdentity(frontmatter, source.companion);
    if (!id || !isRecord(source.companion) || !isRecord(source.companion.slides)) return null;
    return { id, bodyStart: header.contentStart };
  }

  private parse(source: PresentationSource, markdown: string): PresentationSnapshot | null {
    const identity = this.identity(source, markdown);
    if (!identity || !isRecord(source.companion) || !isRecord(source.companion.slides)) return null;
    const document = indexPresentation(markdown, identity.bodyStart);
    const slides = source.companion.slides;
    if (!document || document.slides.some(slide => !Object.hasOwn(slides, slide.id))) return null;
    const skipped = new Set<string>();
    for (const slide of document.slides) {
      const metadata = slides[slide.id];
      if (!isRecord(metadata) || (metadata.skipped !== undefined && typeof metadata.skipped !== "boolean")) return null;
      if (metadata.skipped === true) skipped.add(slide.id);
    }
    const sections = outlineSections(markdown, document);
    if (sections.length && document.slides.some(slide => slide.from < document.sections[0]!.from)) return null;
    return { id: identity.id, document, outline: { path: source.path, slides: outlineSlides(markdown, document, uiText.emptySlide, skipped), sections } };
  }
}
