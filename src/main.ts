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

import { MarkdownView, Plugin, TFile } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import type { OutlinePresentation } from "./outline/model.ts";
import { MarkdownPointOutlineView, OUTLINE_VIEW_TYPE } from "./outline/view.ts";
import { loadLocalUi, saveLocalUi } from "./settings/local-ui.ts";
import type { LocalUiState, OutlineSide } from "./settings/local-ui.ts";
import { MarkdownPointSettingTab } from "./settings/tab.ts";
import { uiText } from "./ui-text.ts";
import { PresentationReader } from "./presentation/reader.ts";

export default class MarkdownPointPlugin extends Plugin {
  localUi: LocalUiState = { outlineSide: "right" };
  private presentation: OutlinePresentation | null = null;
  private activeSlideId: string | null = null;
  private editorLeaf: WorkspaceLeaf | null = null;
  private placingOutline: Promise<WorkspaceLeaf | null> | null = null;
  private running = false;
  private reader: PresentationReader | null = null;

  onload(): void {
    this.running = true;
    this.localUi = loadLocalUi(this.app);
    this.registerView(OUTLINE_VIEW_TYPE, leaf => new MarkdownPointOutlineView(leaf, {
      state: () => ({ presentation: this.presentation, activeSlideId: this.activeSlideId }),
      selectSlide: id => this.run(() => this.selectSlide(id)),
    }));
    this.addSettingTab(new MarkdownPointSettingTab(this.app, this, this.localUi,
      side => this.setOutlineSide(side)));
    this.addCommand({
      id: "focus-outline",
      name: uiText.commands.focusOutline,
      callback: () => this.run(() => this.showOutline(true)),
    });
    this.addCommand({
      id: "focus-editor",
      name: uiText.commands.focusEditor,
      checkCallback: checking => {
        if (!this.presentation && !this.currentEditorLeaf()) return false;
        if (!checking) this.run(() => this.focusEditor());
        return true;
      },
    });

    this.registerEvent(this.app.workspace.on("active-leaf-change", leaf => {
      if (leaf?.view instanceof MarkdownView &&
        (!this.presentation || leaf.view.file?.path === this.presentation.path)) {
        this.editorLeaf = leaf;
      }
    }));
    this.app.workspace.onLayoutReady(() => {
      if (!this.running) return;
      this.run(() => this.showOutline(false));
    });
    this.reader = new PresentationReader(this.app, (presentation, editor) => {
      if (presentation) this.followPresentation(presentation, editor);
      else {
        this.presentation = null;
        this.activeSlideId = null;
        this.refreshOutline();
      }
    });
    this.addChild(this.reader);
  }

  onunload(): void {
    this.running = false;
    this.presentation = null;
    this.editorLeaf = null;
    this.reader = null;
    // Registered views and events are released by Obsidian; retain its saved workspace layout.
  }

  /** The format adapter must verify the presentation before publishing it through this handoff. */
  followPresentation(presentation: OutlinePresentation, editor: MarkdownView | null): void {
    if (!this.running || (editor && editor.file?.path !== presentation.path)) return;
    const samePresentation = presentation.path === this.presentation?.path;
    this.presentation = presentation;
    this.editorLeaf = editor?.leaf ?? null;
    if (!samePresentation || !presentation.slides.some(slide => slide.id === this.activeSlideId)) {
      this.activeSlideId = presentation.slides[0]?.id ?? null;
    }
    // Content updates do not reopen a tab the author closed. Placement belongs
    // to initialization, the side setting, and the explicit focus command.
    this.refreshOutline();
  }

  async setOutlineSide(side: OutlineSide): Promise<void> {
    this.localUi.outlineSide = side;
    saveLocalUi(this.app, this.localUi);
    if (this.outlineLeaves().length > 0) await this.showOutline(false);
  }

  private outlineLeaves(): WorkspaceLeaf[] {
    return this.app.workspace.getLeavesOfType(OUTLINE_VIEW_TYPE);
  }

  private refreshOutline(): void {
    for (const leaf of this.outlineLeaves()) {
      if (leaf.view instanceof MarkdownPointOutlineView) leaf.view.render();
    }
  }

  private currentEditorLeaf(): WorkspaceLeaf | null {
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    const recent = this.app.workspace.getMostRecentLeaf();
    if (!this.presentation && recent?.view instanceof MarkdownView && leaves.includes(recent)) return recent;
    if (this.editorLeaf && leaves.includes(this.editorLeaf) &&
      this.editorLeaf.view instanceof MarkdownView &&
      (!this.presentation || this.editorLeaf.view.file?.path === this.presentation.path)) return this.editorLeaf;
    return leaves.find(leaf => leaf.view instanceof MarkdownView &&
      (!this.presentation || leaf.view.file?.path === this.presentation.path)) ?? null;
  }

  private async ensureEditorLeaf(): Promise<WorkspaceLeaf | null> {
    const existing = this.currentEditorLeaf();
    if (existing) return existing;
    const file = this.presentation && this.app.vault.getAbstractFileByPath(this.presentation.path);
    if (!(file instanceof TFile)) return null;
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file);
    if (!this.running) return null;
    this.editorLeaf = leaf;
    return leaf;
  }

  private async focusEditor(): Promise<void> {
    const leaf = await this.ensureEditorLeaf();
    if (!leaf || !this.running) return;
    await leaf.loadIfDeferred();
    if (!this.running || leaf !== this.currentEditorLeaf()) return;
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    if (leaf.view instanceof MarkdownView) leaf.view.editor.focus();
  }

  private async showOutline(focus: boolean): Promise<void> {
    if (!this.running) return;
    this.placingOutline ??= this.placeOutline().finally(() => { this.placingOutline = null; });
    const leaf = await this.placingOutline;
    if (!leaf || !this.running) return;
    await leaf.loadIfDeferred();
    if (!this.running) return;
    if (leaf.view instanceof MarkdownPointOutlineView) leaf.view.render();
    if (focus) {
      await this.app.workspace.revealLeaf(leaf);
      if (!this.running) return;
      this.app.workspace.setActiveLeaf(leaf, { focus: true });
      if (leaf.view instanceof MarkdownPointOutlineView) leaf.view.focusActive();
    }
  }

  private async placeOutline(): Promise<WorkspaceLeaf | null> {
    const side = this.localUi.outlineSide;
    const target = side === "left" ? this.app.workspace.leftSplit : this.app.workspace.rightSplit;
    const existing = this.outlineLeaves().find(leaf => leaf.getRoot() === target);
    if (existing) {
      for (const leaf of this.outlineLeaves()) if (leaf !== existing) leaf.detach();
      return existing;
    }
    for (const leaf of this.outlineLeaves()) leaf.detach();
    const leaf = await this.app.workspace.ensureSideLeaf(OUTLINE_VIEW_TYPE, side, { active: false, reveal: false });
    if (!this.running) return null;
    // A later settings choice owns placement, including one made while the view was opening.
    if (side !== this.localUi.outlineSide) return this.placeOutline();
    return leaf;
  }

  private async selectSlide(id: string): Promise<void> {
    const path = this.presentation?.path;
    if (!path || !this.presentation?.slides.some(slide => slide.id === id)) return;
    this.activeSlideId = id;
    this.refreshOutline();
    const existing = this.currentEditorLeaf();
    const leaf = existing ?? await this.ensureEditorLeaf();
    if (!this.running || !(leaf?.view instanceof MarkdownView) || leaf.view.file?.path !== path) return;
    // A closed pane may have missed external edits. Resolve fresh positions before
    // navigating the reopened document rather than applying the old line number.
    if (!existing) await this.reader?.refreshView(leaf.view);
    if (!this.running || this.presentation?.path !== path || this.activeSlideId !== id ||
      !(leaf.view instanceof MarkdownView) || leaf.view.file?.path !== path) return;
    const slide = this.presentation.slides.find(item => item.id === id);
    if (!slide) return;
    const cursor = { line: slide.line, ch: 0 };
    if (leaf.view.getMode() === "preview") leaf.view.setEphemeralState({ line: slide.line });
    else {
      leaf.view.editor.setCursor(cursor);
      leaf.view.editor.scrollIntoView({ from: cursor, to: cursor }, true);
    }
  }

  private run(action: () => Promise<void>): void {
    void action().catch((error: unknown) => console.error(error));
  }
}
