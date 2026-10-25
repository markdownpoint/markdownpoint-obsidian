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

import { Component, Modal, Notice, TFile, TFolder, getFrontMatterInfo } from 'obsidian';
import type { App } from 'obsidian';
import { prepareNewPresentation, presentationFolderName } from '../format/new-presentation.ts';
import { orderedLayouts } from '../format/new-slide.ts';
import { slideStructure } from '../format/structure.ts';
import { presentationCompanionPath } from '../format/recognition.ts';
import { indexPresentation } from '../format/document.ts';
import { basicThemeFiles } from '../themes/basic.ts';
import { renderThumbnail } from '../outline/thumbnail.ts';
import { createPresentationFiles } from './create-files.ts';
import { creationThemes, inFolder, readCreationTheme } from './theme-catalog.ts';
import type { CreationTheme } from './theme-catalog.ts';
import { uiText } from '../ui-text.ts';

export class PresentationCreation extends Component {
    private running = false;
    private revision = 0;
    private modal: CreationModal | null = null;
    constructor(private readonly app: App) {
        super();
    }
    onload(): void {
        this.running = true;
    }
    onunload(): void {
        this.running = false;
        this.revision++;
        this.modal?.close();
    }

    open(): void {
        const revision = ++this.revision;
        this.modal?.close();
        void creationThemes(this.app.vault)
            .then(themes => {
                if (!this.running || revision !== this.revision) return;
                const active = this.app.workspace.getActiveFile();
                const parent = active && presentationCompanionPath(active.path) ? active.parent?.parent : active?.parent;
                this.modal = new CreationModal(
                    this.app,
                    themes,
                    parent ?? this.app.vault.getRoot(),
                    (choice, folder, name, active) =>
                        this.create(choice, folder, name, () => this.running && revision === this.revision && active()),
                    file => this.openCreated(file, () => this.running && revision === this.revision)
                );
                this.modal.open();
            })
            .catch((error: unknown) => {
                console.error(error);
                if (this.running && revision === this.revision) new Notice(uiText.presentations.failed);
            });
    }

    private async openCreated(file: TFile, current: () => boolean): Promise<void> {
        const path = file.path,
            source = await this.app.vault.read(file);
        if (!current() || file.path !== path || this.app.vault.getFileByPath(path) !== file) return;
        const slide = indexPresentation(source, getFrontMatterInfo(source).contentStart)?.slides[0];
        const at = slide?.blocks.find(block => block.kind === 'text')?.contentFrom ?? slide?.markerTo ?? 0;
        const cursor = { line: source.slice(0, at).split('\n').length - 1, ch: 0 };
        await this.app.workspace
            .getLeaf(false)
            .openFile(file, { active: true, state: { mode: 'source' }, eState: { cursor: { from: cursor, to: cursor }, focus: true } });
    }

    private async create(choice: CreationTheme, parent: TFolder, name: string, active: () => boolean): Promise<TFile> {
        const parentPath = parent.path;
        const current = () =>
            active() &&
            parent.path === parentPath &&
            (parent.isRoot() ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(parentPath)) === parent;
        const theme = choice.folder ? await readCreationTheme(this.app.vault, choice.folder) : choice.theme;
        if (!theme || theme.id !== choice.theme.id) throw new Error(uiText.presentations.themeChanged);
        const made = prepareNewPresentation(theme, crypto.randomUUID(), `id-${crypto.randomUUID()}`);
        if (!made) throw new Error(uiText.presentations.themeChanged);
        const files = new Map<string, string | TFile>();
        if (choice.folder) {
            const prefix = choice.folder.path + '/';
            for (const file of this.app.vault.getFiles())
                if (file.path.startsWith(prefix)) {
                    const relative = file.path.slice(prefix.length);
                    if (['manifest.json', 'previews', 'example'].includes(relative.split('/')[0]!)) continue;
                    files.set(`themes/${theme.key}/${relative}`, file);
                }
            // Preserve the coherent JSON snapshot we read; copy media without loading it into memory.
            files.set(`themes/${theme.key}/master.json`, theme.master.source);
            for (const [key, layout] of theme.layouts) files.set(`themes/${theme.key}/${key}.json`, layout.source);
        } else for (const [path, source] of basicThemeFiles) files.set(`themes/${theme.key}/${path}`, source);
        files.set('presentation.mdpoint', made.companion);
        files.set('slides.md', made.markdown);
        return createPresentationFiles(
            {
                getAbstractFileByPath: path => {
                    const file = this.app.vault.getAbstractFileByPath(path);
                    return file instanceof TFile || file instanceof TFolder ? file : null;
                },
                createFolder: path => this.app.vault.createFolder(path),
                create: (path, source) => this.app.vault.create(path, source),
                copy: (file: TFile, path) => this.app.vault.copy(file, path),
                trash: file => this.app.fileManager.trashFile(file)
            },
            inFolder(parentPath, name),
            files,
            current
        );
    }
}

class CreationModal extends Modal {
    private active = false;
    private busy = false;
    constructor(
        app: App,
        private readonly themes: readonly CreationTheme[],
        private readonly parent: TFolder,
        private readonly create: (theme: CreationTheme, folder: TFolder, name: string, active: () => boolean) => Promise<TFile>,
        private readonly openCreated: (file: TFile) => Promise<void>
    ) {
        super(app);
    }

    onOpen(): void {
        this.active = true;
        this.setTitle(uiText.presentations.new);
        this.modalEl.addClass('markdownpoint-creation-modal');
        const form = this.contentEl.createEl('form', { cls: 'markdownpoint-creation-form' });
        const nameLabel = form.createEl('label', { cls: 'markdownpoint-creation-field' });
        nameLabel.createSpan({ text: uiText.presentations.name });
        const name = nameLabel.createEl('input', {
            type: 'text',
            value: uiText.presentations.untitled,
            attr: { autocomplete: 'off', required: 'true' }
        });
        const folderLabel = form.createEl('label', { cls: 'markdownpoint-creation-field' });
        folderLabel.createSpan({ text: uiText.presentations.folder });
        const folder = folderLabel.createEl('select');
        const folders = this.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder);
        if (!folders.includes(this.app.vault.getRoot())) folders.unshift(this.app.vault.getRoot());
        for (const entry of folders.sort((a, b) => a.path.localeCompare(b.path)))
            folder.createEl('option', {
                value: entry.path,
                text: entry.isRoot() ? uiText.presentations.root : entry.path
            });
        folder.value = this.parent.path;
        form.createDiv({ text: uiText.presentations.theme, cls: 'markdownpoint-creation-label' });
        const grid = form.createDiv({
            cls: 'markdownpoint-creation-themes',
            attr: { role: 'radiogroup', 'aria-label': uiText.presentations.theme }
        });
        let selected = this.themes[0]!;
        const buttons: HTMLButtonElement[] = [];
        for (const choice of this.themes) {
            const button = grid.createEl('button', {
                cls: 'markdownpoint-creation-theme',
                attr: { type: 'button', role: 'radio', 'aria-checked': String(choice === selected) }
            });
            button.tabIndex = choice === selected ? 0 : -1;
            const preview = button.createSpan({ cls: 'markdownpoint-creation-preview markdownpoint-thumbnail' });
            const schematic = () => renderThumbnail(preview, slideStructure({ layout: orderedLayouts(choice.theme)[0] }, choice.theme));
            if (choice.preview) {
                const image = preview.createEl('img', { attr: { src: choice.preview, alt: '', loading: 'lazy', draggable: 'false' } });
                image.addEventListener(
                    'error',
                    () => {
                        image.remove();
                        schematic();
                    },
                    { once: true }
                );
            } else schematic();
            const caption = button.createSpan({ cls: 'markdownpoint-creation-caption' });
            caption.createSpan({ text: choice.name });
            caption.createSpan({ cls: 'markdownpoint-creation-detail', text: choice.detail });
            button.addEventListener('click', () => {
                if (this.busy) return;
                selected = choice;
                for (const other of buttons) {
                    const checked = other === button;
                    other.setAttribute('aria-checked', String(checked));
                    other.tabIndex = checked ? 0 : -1;
                }
            });
            buttons.push(button);
        }
        grid.addEventListener('keydown', event => {
            if (
                this.busy ||
                event.isComposing ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
            )
                return;
            const at = buttons.findIndex(button => button === grid.ownerDocument.activeElement);
            if (at < 0) return;
            const next =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? buttons.length - 1
                      : (at + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
            event.preventDefault();
            buttons[next]?.click();
            buttons[next]?.focus();
        });
        const error = form.createDiv({ cls: 'markdownpoint-creation-error', attr: { role: 'alert' } });
        const actions = form.createDiv({ cls: 'markdownpoint-creation-actions' });
        const cancel = actions.createEl('button', { text: uiText.presentations.cancel, attr: { type: 'button' } });
        cancel.addEventListener('click', () => this.close());
        const submit = actions.createEl('button', { cls: 'mod-cta', text: uiText.presentations.create, attr: { type: 'submit' } });
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (this.busy) return;
            const cleaned = presentationFolderName(name.value),
                destination = folders.find(entry => entry.path === folder.value);
            if (!cleaned) {
                error.setText(uiText.presentations.invalidName);
                name.focus();
                return;
            }
            if (!destination) {
                error.setText(uiText.presentations.failed);
                return;
            }
            if (this.app.vault.getAbstractFileByPath(inFolder(destination.path, cleaned))) {
                error.setText(uiText.presentations.exists);
                name.focus();
                return;
            }
            this.busy = true;
            error.empty();
            name.disabled = true;
            folder.disabled = true;
            submit.disabled = true;
            for (const button of buttons) button.disabled = true;
            submit.setText(uiText.presentations.creating);
            void this.create(selected, destination, cleaned, () => this.active)
                .then(file => {
                    if (!this.active) return;
                    this.close();
                    void this.openCreated(file).catch((failure: unknown) => {
                        console.error(failure);
                        new Notice(uiText.presentations.openFailed);
                    });
                })
                .catch((failure: unknown) => {
                    console.error(failure);
                    if (this.active)
                        error.setText(
                            failure instanceof Error && failure.message === uiText.presentations.themeChanged
                                ? uiText.presentations.themeChanged
                                : uiText.presentations.failed
                        );
                })
                .finally(() => {
                    this.busy = false;
                    if (!this.active) return;
                    name.disabled = false;
                    folder.disabled = false;
                    submit.disabled = false;
                    for (const button of buttons) button.disabled = false;
                    submit.setText(uiText.presentations.create);
                });
        });
        name.focus();
        name.select();
    }

    onClose(): void {
        this.active = false;
        this.contentEl.empty();
    }
}
