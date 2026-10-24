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

import { Component, FileSystemAdapter, Notice } from "obsidian";
import type { App } from "obsidian";
import { SlideData } from "./slide-data.ts";
import { SlideRecovery } from "./slide-recovery.ts";
import { processCompanion } from "./companion-file.ts";
import { uiText } from "../ui-text.ts";

/** Own recovery storage, vault writes and actionable save failures for this plugin. */
export class PresentationStorage extends Component {
  readonly data: SlideData | null;
  private readonly notices = new Map<string, { path: string; document: string; notice: Notice }>();
  private recoveryNotice: Notice | null = null;
  private running = false;

  constructor(private readonly app: App) {
    super();
    const adapter = app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) { this.data = null; return; }
    const factory = app.workspace.containerEl.ownerDocument.defaultView!.indexedDB;
    const recovery = new SlideRecovery(factory, adapter.getBasePath());
    const data = this.data = new SlideData({
      loadRecovery: () => recovery.read(),
      saveRecovery: value => recovery.write(value),
      process: (path, update, canCommit) => processCompanion(app.vault, path, update, canCommit),
      failed: (path, document, error) => this.saveFailed(path, document, error),
      saved: (path, document) => this.clearNotice(path, document),
    });
    void data.ready.catch((error: unknown) => {
      console.error(error);
      if (this.running) this.recoveryNotice = new Notice(uiText.slides.recoveryUnavailable, 0);
    });
    this.registerEvent(app.vault.on("rename", (file, oldPath) => {
      for (const [key, failure] of [...this.notices]) {
        if (failure.path !== oldPath && !failure.path.startsWith(oldPath + "/")) continue;
        this.notices.delete(key);
        failure.path = file.path + failure.path.slice(oldPath.length);
        this.clearNotice(failure.path, failure.document);
        this.notices.set(JSON.stringify([failure.path, failure.document]), failure);
      }
      void data.rename(oldPath, file.path).catch((error: unknown) => this.preparationFailed(error));
    }));
    this.register(() => { data.stop(); recovery.close(); });
  }

  onload(): void { this.running = true; }
  onunload(): void {
    this.running = false;
    for (const failure of this.notices.values()) failure.notice.hide();
    this.notices.clear();
    this.recoveryNotice?.hide();
    this.recoveryNotice = null;
  }

  preparationFailed(error: unknown): void {
    console.error(error);
    if (this.running) new Notice(uiText.slides.deleteFailed);
  }

  private clearNotice(path: string, document: string): void {
    const key = JSON.stringify([path, document]);
    this.notices.get(key)?.notice.hide();
    this.notices.delete(key);
  }

  private saveFailed(path: string, document: string, error: unknown): void {
    console.error(error);
    if (!this.running) return;
    this.clearNotice(path, document);
    const documentEl = this.app.workspace.containerEl.ownerDocument;
    const previousFocus = documentEl.activeElement;
    const fragment = documentEl.defaultView!.createFragment();
    fragment.createDiv({ text: uiText.slides.saveFailed });
    const retry = fragment.createEl("button", { cls: "markdownpoint-save-retry", text: uiText.slides.retry });
    const notice = new Notice(fragment, 0);
    const failure = { path, document, notice };
    retry.addEventListener("mousedown", event => { if (event.button === 0) event.preventDefault(); });
    retry.addEventListener("click", event => {
      event.stopPropagation(); // Obsidian otherwise dismisses the notice on any click.
      if (!this.running || !this.data?.retry(failure.path, failure.document)) return;
      const hadFocus = documentEl.activeElement === retry;
      notice.hide();
      if (hadFocus && previousFocus?.instanceOf(HTMLElement) && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    });
    this.notices.set(JSON.stringify([path, document]), failure);
  }
}
