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

import { Component, MarkdownView, Notice } from "obsidian";
import type { App, TFile } from "obsidian";
import { SLIDE_CLIPBOARD_MIME } from "../format/clipboard.ts";
import { clipboardVaultId } from "../settings/clipboard.ts";
import { uiText } from "../ui-text.ts";
import { SlideCopy } from "./copy.ts";
import type { SlideCopyResult } from "./copy.ts";
import type { PresentationReader } from "./reader.ts";
import { readEmbeddedTheme } from "./theme-reader.ts";

interface CopyContext {
  readonly view: MarkdownView | null;
  readonly file: TFile;
  readonly path: string;
  readonly window: Window;
  readonly canApply: () => boolean;
}

/** Clipboard operations retain their own view, file and window across asynchronous reads. */
export class PresentationClipboard extends Component {
  private readonly copier: SlideCopy<CopyContext>;
  private running = false;

  constructor(private readonly app: App, reader: PresentationReader) {
    super();
    this.copier = new SlideCopy({
      current: context => this.current(context),
      read: async context => {
        if (context.view) await reader.refreshView(context.view);
        else await reader.refreshClosedFile(context.file);
        if (!this.current(context)) return null;
        const markdown = context.view ? context.view.getViewData() : await app.vault.read(context.file);
        const snapshot = reader.snapshot(context.file, markdown);
        const companion = snapshot && reader.companionFor(context.file, snapshot);
        return snapshot && companion !== null ? { path: context.path, documentId: snapshot.id, markdown, companion, index: snapshot.document } : null;
      },
      theme: (source, metadata, layouts) => readEmbeddedTheme(app.vault, source.path, metadata, layouts),
      vaultId: () => clipboardVaultId(app),
      write: async (context, encoded) => {
        const window = context.window.document.defaultView!;
        const item = new window.ClipboardItem({ [SLIDE_CLIPBOARD_MIME]: new window.Blob([encoded], { type: SLIDE_CLIPBOARD_MIME.slice(4) }) });
        await window.navigator.clipboard.write([item]);
      },
    });
  }

  onload(): void { this.running = true; }
  onunload(): void { this.running = false; this.copier.stop(); }

  private current(context: CopyContext): boolean {
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    return this.running && !context.window.closed && context.file.path === context.path &&
      this.app.vault.getFileByPath(context.path) === context.file && context.canApply() &&
      (context.view ? context.view.file === context.file && leaves.includes(context.view.leaf)
        : !leaves.some(leaf => leaf.view instanceof MarkdownView && leaf.view.file === context.file));
  }

  async copy(input: Omit<CopyContext, "path">, ids: Iterable<string>): Promise<SlideCopyResult> {
    const context = { ...input, path: input.file.path };
    const result = await this.copier.copy(context, ids);
    if (result.kind === "failed") console.error(result.error);
    if (this.current(context)) {
      if (result.kind === "failed") new Notice(uiText.slides.copyFailed);
      else if (result.kind === "unavailable") new Notice(uiText.slides.copyUnavailable);
      else if (result.kind === "changed") new Notice(uiText.slides.copyChanged);
    }
    return result;
  }
}
