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

import { Component, Notice, TFile } from 'obsidian';
import type { App, MarkdownView, TAbstractFile } from 'obsidian';
import type { PresentationEditor } from '../editor/presentation-editor.ts';
import type { EmbeddedTheme } from '../format/embedded-theme.ts';
import { embeddedThemePaths } from '../format/embedded-theme.ts';
import { prepareNewSlide } from '../format/new-slide.ts';
import { readJsonObject } from '../format/json.ts';
import { uiText } from '../ui-text.ts';
import type { SharedSettings } from '../settings/shared.ts';
import { LayoutPicker } from './layout-picker.ts';
import type { PresentationReader } from './reader.ts';
import { readEmbeddedTheme } from './theme-reader.ts';

interface CreationContext {
    readonly file: TFile;
    readonly view: MarkdownView | null;
    readonly canApply: () => boolean;
    readonly editingView: () => Promise<MarkdownView | null>;
}

/** Own the layout choice and pass a complete new slide to native insertion. */
export class SlideCreation extends Component {
    private picker: LayoutPicker | null = null;
    private running = false;
    private revision = 0;
    constructor(
        private readonly app: App,
        private readonly reader: PresentationReader,
        private readonly editor: PresentationEditor,
        private readonly shortcuts: SharedSettings,
        private readonly inserted: (id: string) => void
    ) {
        super();
    }
    onload(): void {
        this.running = true;
    }
    onunload(): void {
        this.running = false;
        this.revision++;
        this.picker?.close();
    }

    async choose(input: CreationContext, after: string | null): Promise<void> {
        const revision = ++this.revision;
        const path = input.file.path;
        this.picker?.close();
        const current = () =>
            this.running &&
            revision === this.revision &&
            input.canApply() &&
            input.file.path === path &&
            this.app.vault.getFileByPath(path) === input.file;
        try {
            await this.shortcuts.ready.catch(() => undefined);
            if (input.view) await this.reader.refreshView(input.view);
            else await this.reader.refreshClosedFile(input.file);
            if (!current() || (input.view && input.view.file !== input.file)) return;
            const markdown = input.view ? input.view.getViewData() : await this.app.vault.read(input.file);
            const snapshot = this.reader.snapshot(input.file, markdown);
            const companion = snapshot && this.reader.companionFor(input.file, snapshot);
            const metadata = companion && readJsonObject(companion);
            const paths = metadata ? embeddedThemePaths(path, metadata, []) : null;
            const folder = paths && this.app.vault.getFolderByPath(paths.root);
            const keys =
                folder?.children.flatMap(file =>
                    file instanceof TFile &&
                    file.extension === 'json' &&
                    file.basename !== 'master' &&
                    file.basename !== 'manifest' &&
                    embeddedThemePaths(path, metadata, [file.basename])
                        ? [file.basename]
                        : []
                ) ?? [];
            const theme = metadata && keys.length ? await readEmbeddedTheme(this.app.vault, path, metadata, keys) : null;
            if (!current()) return;
            if (!theme) {
                new Notice(uiText.slides.layoutsUnavailable);
                return;
            }
            this.picker = new LayoutPicker(this.app, theme, this.shortcuts, key => {
                this.picker = null;
                void this.insert(input, after, theme, key, current).catch((error: unknown) => {
                    console.error(error);
                    if (current()) new Notice(uiText.slides.newFailed);
                });
            });
            this.picker.open();
        } catch (error) {
            console.error(error);
            if (current()) new Notice(uiText.slides.layoutsUnavailable);
        }
    }

    private async insert(
        input: CreationContext,
        after: string | null,
        chosen: EmbeddedTheme,
        key: string,
        current: () => boolean
    ): Promise<void> {
        if (!current()) return;
        const view = await input.editingView();
        if (!view || !current() || view.file !== input.file) return;
        await this.reader.refreshView(view);
        const markdown = view.getViewData();
        const snapshot = this.reader.snapshot(input.file, markdown);
        const companion = snapshot && this.reader.companionFor(input.file, snapshot);
        const metadata = companion && readJsonObject(companion);
        if (!current() || !snapshot || !metadata || !companion) return;
        const paths = [chosen.master.path, chosen.layouts.get(key)!.path];
        let themeChanged = false;
        const invalidate = (file: TAbstractFile, oldPath?: string) => {
            if (
                [file.path, oldPath].some(
                    path => path !== undefined && paths.some(target => target === path || target.startsWith(path + '/'))
                )
            )
                themeChanged = true;
        };
        const events = [
            this.app.vault.on('modify', invalidate),
            this.app.vault.on('create', invalidate),
            this.app.vault.on('delete', invalidate),
            this.app.vault.on('rename', invalidate)
        ];
        try {
            const theme = await readEmbeddedTheme(this.app.vault, input.file.path, metadata, [key]);
            if (!current()) return;
            if (
                themeChanged ||
                !theme ||
                theme.key !== chosen.key ||
                theme.id !== chosen.id ||
                theme.master.source !== chosen.master.source ||
                theme.layouts.get(key)?.source !== chosen.layouts.get(key)?.source
            ) {
                new Notice(uiText.slides.layoutChanged);
                return;
            }
            const prepared = prepareNewSlide(theme, key, `id-${crypto.randomUUID()}`);
            const canApply = () =>
                current() &&
                !themeChanged &&
                view.file === input.file &&
                view.getViewData() === markdown &&
                this.app.workspace.getLeavesOfType('markdown').includes(view.leaf) &&
                this.reader.companionFor(input.file, snapshot) === companion;
            if (!prepared || !(await this.editor.insertSlides(view.editor, [prepared], after, canApply))) {
                if (current()) new Notice(themeChanged ? uiText.slides.layoutChanged : uiText.slides.newFailed);
                return;
            }
            this.inserted(prepared.id);
            this.app.workspace.setActiveLeaf(view.leaf, { focus: true });
            view.editor.focus();
        } finally {
            for (const event of events) this.app.vault.offref(event);
        }
    }
}
