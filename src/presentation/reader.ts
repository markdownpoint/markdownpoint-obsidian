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
import { isRecord, presentationCompanionPath, presentationIdentity } from "../format/recognition.ts";
import { outlineSections, outlineSlides } from "../outline/model.ts";
import type { OutlinePresentation } from "../outline/model.ts";
import { uiText } from "../ui-text.ts";

interface FollowedPresentation {
  readonly file: TFile;
  readonly path: string;
  readonly companionPath: string;
  readonly companion: unknown;
}

export class PresentationReader extends Component {
  private followed: FollowedPresentation | null = null;
  private generation = 0;
  private running = false;
  private loading: { readonly file: TFile; readonly view: MarkdownView | null } | null = null;

  constructor(
    private readonly app: App,
    private readonly publish: (model: OutlinePresentation | null, view: MarkdownView | null) => void,
  ) { super(); }

  onload(): void {
    this.running = true;
    this.registerEvent(this.app.workspace.on("active-leaf-change", leaf => {
      if (leaf?.view instanceof MarkdownView) this.refresh(leaf.view);
    }));
    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshActive()));
    this.registerEvent(this.app.workspace.on("editor-change", (_editor, info) => {
      if (!(info instanceof MarkdownView)) return;
      if (this.followed?.file === info.file) this.update(this.followed, info.getViewData(), info);
      else if (this.loading?.view !== info && this.app.workspace.getMostRecentLeaf() === info.leaf) this.refresh(info);
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (file, markdown) => {
      if (this.followed?.file !== file) return;
      const view = this.findView(file);
      if (!view || view.getMode() === "preview") this.update(this.followed, markdown, view);
    }));
    this.registerEvent(this.app.vault.on("create", file => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("modify", file => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("delete", file => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.onFileChange(file, oldPath)));
    this.app.workspace.onLayoutReady(() => { if (this.running) this.refreshActive(); });
  }

  onunload(): void {
    this.running = false;
    this.generation++;
    this.followed = null;
    this.loading = null;
  }

  private refreshActive(): void {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf?.view instanceof MarkdownView) this.refresh(leaf.view);
  }

  private onFileChange(file: TAbstractFile, oldPath?: string): void {
    const followed = this.followed;
    const isCompanionChange = file instanceof TFile && file.extension.toLowerCase() === "mdpoint";
    if (followed && (file === followed.file || (isCompanionChange && file.parent === followed.file.parent) ||
      [file.path, oldPath].some(path => path !== undefined &&
        [followed.path, followed.companionPath].some(owned => owned === path || owned.startsWith(path + "/"))))) {
      if (this.app.vault.getAbstractFileByPath(followed.file.path) !== followed.file ||
        !presentationCompanionPath(followed.file.path)) this.forget(followed.file);
      else this.refreshFile(followed.file, this.findView(followed.file));
    } else {
      const leaf = this.app.workspace.getMostRecentLeaf();
      if (leaf?.view instanceof MarkdownView && (leaf.view.file === file || presentationCompanionPath(leaf.view.file?.path ?? "") === file.path ||
        isCompanionChange || oldPath?.toLowerCase().endsWith(".mdpoint"))) this.refresh(leaf.view);
    }
  }

  private refresh(view: MarkdownView): void {
    void this.refreshView(view).catch((error: unknown) => console.error(error));
  }

  async refreshView(view: MarkdownView): Promise<void> {
    if (view.file && presentationCompanionPath(view.file.path)) await this.read(view.file, view);
  }

  private findView(file: TFile): MarkdownView | null {
    const recent = this.app.workspace.getMostRecentLeaf();
    if (recent?.view instanceof MarkdownView && recent.view.file === file) return recent.view;
    const leaf = this.app.workspace.getLeavesOfType("markdown").find(leaf => leaf.view instanceof MarkdownView && leaf.view.file === file);
    return leaf?.view instanceof MarkdownView ? leaf.view : null;
  }

  private refreshFile(file: TFile, view: MarkdownView | null): void {
    // Background saves of the previous deck must not supersede the deck the user
    // is opening. A reused pane no longer represents that pending request.
    const loading = this.loading;
    if (loading?.view && loading.view.file === loading.file && loading.file !== file) return;
    void this.read(file, view).catch((error: unknown) => console.error(error));
  }

  private async read(file: TFile, view: MarkdownView | null): Promise<void> {
    const generation = ++this.generation;
    this.loading = null;
    const path = file.path;
    const companionPath = presentationCompanionPath(path);
    if (!companionPath) return;
    const companionFile = this.app.vault.getAbstractFileByPath(companionPath);
    if (!(companionFile instanceof TFile)) { this.forget(file); return; }
    const companions = companionFile.parent?.children.filter(file => file instanceof TFile &&
      file.extension.toLowerCase() === "mdpoint" && !file.name.startsWith("._"));
    if (companions?.length !== 1) { this.forget(file); return; }
    this.loading = { file, view };
    try {
      const companion: unknown = JSON.parse(await this.app.vault.read(companionFile));
      const markdown = view ? view.getViewData() : await this.app.vault.read(file);
      // Only the current request may publish. Typing while I/O is pending is read
      // from the view after the await; switching files or unloading invalidates it.
      if (!this.running || generation !== this.generation || file.path !== path ||
        this.app.vault.getAbstractFileByPath(path) !== file || (view && view.file !== file)) return;
      this.update({ file, path, companionPath, companion }, markdown, view);
    } catch {
      if (this.running && generation === this.generation) this.forget(file);
    } finally {
      if (generation === this.generation) this.loading = null;
    }
  }

  private forget(file: TFile): void {
    if (this.followed?.file !== file) return;
    this.followed = null;
    this.publish(null, null);
  }

  private update(candidate: FollowedPresentation, markdown: string, view: MarkdownView | null): void {
    if (!this.running || candidate.file.path !== candidate.path) return;
    const header = getFrontMatterInfo(markdown);
    let frontmatter: unknown;
    try { frontmatter = header.exists ? parseYaml(header.frontmatter) : null; }
    catch { this.forget(candidate.file); return; }
    if (!presentationIdentity(frontmatter, candidate.companion) || !isRecord(candidate.companion) || !isRecord(candidate.companion.slides)) {
      this.forget(candidate.file);
      return;
    }
    const document = indexPresentation(markdown, header.contentStart);
    const slides = candidate.companion.slides;
    if (!document || document.slides.some(slide => !Object.hasOwn(slides, slide.id))) { this.forget(candidate.file); return; }
    const skipped = new Set<string>();
    for (const slide of document.slides) {
      const metadata = slides[slide.id];
      if (!isRecord(metadata) || (metadata.skipped !== undefined && typeof metadata.skipped !== "boolean")) {
        this.forget(candidate.file);
        return;
      }
      if (metadata.skipped === true) skipped.add(slide.id);
    }
    const sections = outlineSections(markdown, document);
    if (!sections || (sections.length && document.slides.some(slide => slide.from < document.sections[0]!.from))) {
      this.forget(candidate.file);
      return;
    }
    this.followed = candidate;
    this.publish({ path: candidate.path, slides: outlineSlides(markdown, document, uiText.emptySlide, skipped), sections }, view);
  }
}
