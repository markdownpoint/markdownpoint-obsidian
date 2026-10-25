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

import { Component, MarkdownView, Notice } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { decodeSlideClipboard, SLIDE_CLIPBOARD_MIME } from '../format/clipboard.ts';
import { clipboardVaultId, clipboardDigest, ownsClipboardCut, CLIPBOARD_CUT_KEY } from '../settings/clipboard.ts';
import { uiText } from '../ui-text.ts';
import { readJsonObject } from '../format/json.ts';
import { prepareClipboardPaste, sameClipboardPresentation, sameClipboardTheme } from '../format/paste.ts';
import type { PresentationEditor } from '../editor/presentation-editor.ts';
import type { SlideData } from './slide-data.ts';
import { SlideCopy } from './copy.ts';
import type { SlideCopyResult } from './copy.ts';
import type { PresentationReader } from './reader.ts';
import { readEmbeddedTheme } from './theme-reader.ts';
import { ThemeArtworkMismatch, transferSlideAssets } from './transfer-assets.ts';
import type { TransferredSlides } from './transfer-assets.ts';

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
    private intent = 0;
    private pastes: Promise<void> = Promise.resolve();
    private transfer: AbortController | null = null;

    constructor(
        private readonly app: App,
        private readonly reader: PresentationReader,
        private readonly editor: PresentationEditor,
        private readonly data: SlideData | null
    ) {
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
                return snapshot && companion !== null
                    ? { path: context.path, documentId: snapshot.id, markdown, companion, index: snapshot.document }
                    : null;
            },
            theme: (source, metadata, layouts) => readEmbeddedTheme(app.vault, source.path, metadata, layouts),
            vaultId: () => clipboardVaultId(app),
            write: async (context, encoded) => {
                const window = context.window.document.defaultView!;
                const item = new window.ClipboardItem({
                    [SLIDE_CLIPBOARD_MIME]: new window.Blob([encoded], { type: SLIDE_CLIPBOARD_MIME.slice(4) })
                });
                await window.navigator.clipboard.write([item]);
            }
        });
    }

    onload(): void {
        this.running = true;
    }
    onunload(): void {
        this.running = false;
        this.copier.stop();
        this.transfer?.abort();
    }

    private current(context: CopyContext): boolean {
        const leaves = this.app.workspace.getLeavesOfType('markdown');
        return (
            this.running &&
            !context.window.closed &&
            context.file.path === context.path &&
            this.app.vault.getFileByPath(context.path) === context.file &&
            context.canApply() &&
            (context.view
                ? context.view.file === context.file && leaves.includes(context.view.leaf)
                : !leaves.some(leaf => leaf.view instanceof MarkdownView && leaf.view.file === context.file))
        );
    }

    /** Capture the clipboard at invocation; additive pastes run in their requested order. */
    paste(input: Omit<CopyContext, 'path'>, after: string | null, editingView: () => Promise<MarkdownView | null>): Promise<void> {
        const initial = { ...input, path: input.file.path };
        const reading = input.window.navigator.clipboard
            .read()
            .then(async items => {
                for (const item of items)
                    if (item.types.includes(SLIDE_CLIPBOARD_MIME)) return (await item.getType(SLIDE_CLIPBOARD_MIME)).text();
                return null;
            })
            .then(
                source => ({ source, error: null }),
                (error: unknown) => ({ source: null, error })
            );
        const action = this.pastes
            .then(async () => {
                if (!this.current(initial)) return;
                const result = await reading;
                if (!this.current(initial)) return;
                if (result.error)
                    throw result.error instanceof Error ? result.error : new Error('Clipboard read failed', { cause: result.error });
                const packet = result.source && decodeSlideClipboard(result.source);
                if (!packet) {
                    new Notice(uiText.slides.pasteEmpty);
                    return;
                }
                const view = await editingView();
                if (!view) return;
                const context = { ...initial, view };
                if (!this.current(context)) return;
                await this.reader.refreshView(view);
                const markdown = view.getViewData();
                const snapshot = this.reader.snapshot(input.file, markdown);
                const companion = snapshot && this.reader.companionFor(input.file, snapshot);
                const metadata = companion && readJsonObject(companion);
                if (!snapshot || !companion || !metadata || !this.current(context)) return;
                const theme = await readEmbeddedTheme(this.app.vault, context.path, metadata, packet.theme.layouts.keys());
                if (!this.current(context)) return;
                const origin = { vault: clipboardVaultId(this.app), path: context.path, document: snapshot.id };
                if (packet.origin.vault !== origin.vault) {
                    new Notice(uiText.slides.pasteVault);
                    return;
                }
                if (!theme || !sameClipboardTheme(packet, theme)) {
                    new Notice(uiText.slides.pasteDestination);
                    return;
                }
                const documents = [theme.master, ...theme.layouts.values()].map(document => {
                    const file = this.app.vault.getFileByPath(document.path);
                    return { file, path: document.path, mtime: file?.stat.mtime, size: file?.stat.size };
                });
                const current = () =>
                    this.current(context) &&
                    view.getViewData() === markdown &&
                    this.reader.companionFor(input.file, snapshot) === companion &&
                    documents.every(
                        document =>
                            document.file &&
                            this.app.vault.getFileByPath(document.path) === document.file &&
                            document.file.stat.mtime === document.mtime &&
                            document.file.stat.size === document.size
                    );
                const samePresentation = sameClipboardPresentation(packet, origin);
                const controller = new context.window.document.defaultView!.AbortController();
                this.transfer = controller;
                let transferred: TransferredSlides | null = null;
                let inserted = false;
                try {
                    if (!samePresentation)
                        transferred = await transferSlideAssets(
                            this.app,
                            packet,
                            context.file,
                            theme,
                            context.window,
                            current,
                            controller.signal
                        );
                    const incoming = transferred ? { ...packet, captured: transferred.captured } : packet;
                    const digest = samePresentation ? await clipboardDigest(result.source!) : null;
                    const remembered = new Map([
                        ...(this.data?.remembered(context.path, snapshot.id) ?? []),
                        ...(this.data?.remembered(context.path, snapshot.id, 'compositions') ?? [])
                    ]);
                    const prepared = prepareClipboardPaste(
                        incoming,
                        markdown,
                        snapshot.document,
                        companion,
                        remembered,
                        () => `id-${crypto.randomUUID()}`,
                        digest !== null && ownsClipboardCut(this.app, digest)
                    );
                    const valid = () => current() && (!transferred || transferred.current());
                    if (!prepared || !valid()) {
                        if (this.current(context)) new Notice(uiText.slides.pasteChanged);
                        return;
                    }
                    inserted = await this.editor.insertSlides(view.editor, prepared.slides, after, valid, prepared.compositions);
                    if (!inserted && this.current(context)) new Notice(uiText.slides.pasteChanged);
                } finally {
                    controller.abort();
                    if (this.transfer === controller) this.transfer = null;
                    if (transferred && !inserted) await transferred.cleanup().catch((error: unknown) => console.error(error));
                }
            })
            .catch((error: unknown) => {
                console.error(error);
                if (this.running && initial.canApply())
                    new Notice(error instanceof ThemeArtworkMismatch ? uiText.slides.pasteArtwork : uiText.slides.pasteFailed);
            });
        this.pastes = action;
        return action;
    }

    async cut(input: Omit<CopyContext, 'path'>, ids: Iterable<string>, editingView: () => Promise<MarkdownView | null>): Promise<void> {
        const selected = [...ids];
        const intent = this.intent + 1;
        const copied = await this.copy(input, selected);
        if (copied.kind !== 'copied' || intent !== this.intent) return;
        let digest: string | null = null;
        try {
            const view = await editingView();
            if (!view) return;
            const context = { ...input, path: copied.source.path, view };
            const current = () =>
                intent === this.intent &&
                this.current(context) &&
                view.getViewData() === copied.source.markdown &&
                this.reader.snapshot(input.file, view.getViewData())?.id === copied.source.documentId &&
                this.reader.companionFor(input.file, this.reader.snapshot(input.file, view.getViewData())!) === copied.source.companion;
            if (!current()) return;
            digest = await clipboardDigest(copied.encoded);
            if (!current()) return;
            this.app.saveLocalStorage(CLIPBOARD_CUT_KEY, digest);
            const deleted = await this.editor.deleteSlides(view.editor, selected, current);
            if (!deleted) {
                if (ownsClipboardCut(this.app, digest)) this.app.saveLocalStorage(CLIPBOARD_CUT_KEY, null);
                if (this.current(context)) new Notice(uiText.slides.cutChanged);
            }
        } catch (error) {
            console.error(error);
            if (digest && ownsClipboardCut(this.app, digest)) this.app.saveLocalStorage(CLIPBOARD_CUT_KEY, null);
            if (this.running && input.canApply()) new Notice(uiText.slides.cutFailed);
        }
    }

    async copy(input: Omit<CopyContext, 'path'>, ids: Iterable<string>): Promise<SlideCopyResult> {
        this.intent++;
        const context = { ...input, path: input.file.path };
        const result = await this.copier.copy(context, ids);
        if (result.kind === 'failed') console.error(result.error);
        if (this.current(context)) {
            if (result.kind === 'failed') new Notice(uiText.slides.copyFailed);
            else if (result.kind === 'unavailable') new Notice(uiText.slides.copyUnavailable);
            else if (result.kind === 'changed') new Notice(uiText.slides.copyChanged);
            else if (result.kind === 'newer') new Notice(uiText.slides.copyNewer);
        }
        return result;
    }
}
