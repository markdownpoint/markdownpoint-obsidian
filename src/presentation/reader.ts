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

import { Component, MarkdownView, Notice, getFrontMatterInfo, parseYaml } from 'obsidian';
import type { App, TAbstractFile, TFile } from 'obsidian';
import { indexPresentation } from '../format/document.ts';
import type { PresentationDocument } from '../format/document.ts';
import { isRecord, newerFormat, presentationCompanionPath, presentationIdentity, presentationMember } from '../format/recognition.ts';
import { presentationFiles } from './presentation-files.ts';
import { outlineSections, outlineSlides } from '../outline/model.ts';
import type { OutlinePresentation } from '../outline/model.ts';
import { uiText } from '../ui-text.ts';
import type { SlideData } from './slide-data.ts';
import { readEmbeddedTheme } from './theme-reader.ts';
import { embeddedThemePaths } from '../format/embedded-theme.ts';
import type { EmbeddedTheme } from '../format/embedded-theme.ts';
import { assignedSlideImages } from '../format/slide-images.ts';
import { readSlideImages } from './image-reader.ts';
import type { SlideImagePreview } from './image-reader.ts';
import { slideStructure } from '../format/structure.ts';
import { CompanionDocument } from '../format/companion.ts';

interface PresentationSource {
    readonly file: TFile;
    readonly path: string;
    readonly companionPath: string;
    readonly companion: unknown;
    readonly companionText: string;
    theme: EmbeddedTheme | null;
    markdown: string | null;
    snapshot: PresentationSnapshot | null;
}

export interface PresentationSnapshot {
    readonly id: string;
    readonly bodyStart: number;
    readonly document: PresentationDocument;
    readonly outline: OutlinePresentation;
    readonly images: ReadonlyMap<string, readonly SlideImagePreview[]>;
}

export class PresentationReader extends Component {
    private sources = new WeakMap<TFile, PresentationSource>();
    private reads = new WeakMap<TFile, { readonly view: MarkdownView | null }>();
    private followed: TFile | null = null;
    private requested: TFile | null = null;
    private running = false;
    // Presentations a newer format keeps closed, told once each session
    private readonly newer = new Set<string>();

    constructor(
        private readonly app: App,
        private readonly publish: (model: OutlinePresentation | null, view: MarkdownView | null) => void,
        private readonly changed: (file: TFile) => void,
        private readonly data: SlideData | null = null
    ) {
        super();
    }

    onload(): void {
        this.running = true;
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', leaf => {
                if (leaf?.view instanceof MarkdownView) this.refresh(leaf.view);
            })
        );
        this.registerEvent(this.app.workspace.on('file-open', () => this.refreshActive()));
        this.registerEvent(
            this.app.workspace.on('editor-change', (_editor, info) => {
                if (!(info instanceof MarkdownView) || !info.file) return;
                if (!this.syncEditor(info) && !this.reads.has(info.file) && this.app.workspace.getMostRecentLeaf() === info.leaf)
                    this.refresh(info);
            })
        );
        this.registerEvent(
            this.app.metadataCache.on('changed', (file, markdown) => {
                const source = this.sources.get(file);
                if (!source) return;
                const view = this.findView(file);
                if (!view || view.getMode() === 'preview') this.update(source, markdown, view);
            })
        );
        this.registerEvent(this.app.vault.on('modify', file => this.onFileChange(file)));
        this.registerEvent(this.app.vault.on('delete', file => this.onFileChange(file)));
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => this.onFileChange(file, oldPath)));
        this.app.workspace.onLayoutReady(() => {
            if (!this.running) return;
            // Obsidian reports every existing file as created while the vault loads
            this.registerEvent(this.app.vault.on('create', file => this.onFileChange(file)));
            this.refreshActive();
        });
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
        for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
            if (leaf.view instanceof MarkdownView && leaf.view.file && presentationCompanionPath(leaf.view.file.path))
                candidates.add(leaf.view.file);
        }
        for (const candidate of candidates) {
            if (!candidate) continue;
            const source = this.sources.get(candidate);
            const companionPath = presentationCompanionPath(candidate.path);
            // Deleted entries no longer have a parent object; paths still identify
            // conflicts removed from the source folder and files renamed out of it.
            const companionChange = [file.path, oldPath].some(
                path =>
                    path !== undefined &&
                    presentationMember(path.slice(path.lastIndexOf('/') + 1)) !== null &&
                    path.slice(0, path.lastIndexOf('/') + 1) === candidate.path.slice(0, candidate.path.lastIndexOf('/') + 1)
            );
            const themeRoot = source?.theme?.root ?? candidate.path.slice(0, candidate.path.lastIndexOf('/') + 1) + 'themes';
            const themeChange = [file.path, oldPath].some(
                path => path !== undefined && (path === themeRoot || path.startsWith(themeRoot + '/'))
            );
            if (themeChange && source) source.theme = null;
            const root = candidate.path.slice(0, candidate.path.lastIndexOf('/') + 1);
            const mediaChange = [file.path, oldPath].some(
                path =>
                    path !== undefined &&
                    ['media', 'generated'].some(folder => path === root + folder || path.startsWith(root + folder + '/'))
            );
            const affected =
                themeChange ||
                mediaChange ||
                file === candidate ||
                file.path === companionPath ||
                companionChange ||
                [file.path, oldPath].some(
                    path =>
                        path !== undefined &&
                        [candidate.path, source?.path, source?.companionPath].some(owned => owned === path || owned?.startsWith(path + '/'))
                );
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
        if (this.requested !== view.file) {
            const source = this.sources.get(view.file);
            if (source) source.theme = null;
        }
        this.requested = view.file;
        await this.read(view.file, view);
    }

    /** Read a retained outline's closed presentation without opening a document tab. */
    async refreshClosedFile(file: TFile): Promise<void> {
        await this.read(file, null);
    }

    private findView(file: TFile): MarkdownView | null {
        const recent = this.app.workspace.getMostRecentLeaf();
        if (recent?.view instanceof MarkdownView && recent.view.file === file) return recent.view;
        const leaf = this.app.workspace
            .getLeavesOfType('markdown')
            .find(leaf => leaf.view instanceof MarkdownView && leaf.view.file === file);
        return leaf?.view instanceof MarkdownView ? leaf.view : null;
    }

    private refreshFile(file: TFile, view: MarkdownView | null): void {
        void this.read(file, view).catch((error: unknown) => console.error(error));
    }

    private async read(file: TFile, view: MarkdownView | null): Promise<void> {
        const request = { view };
        this.reads.set(file, request);
        const path = file.path;
        const pair = presentationCompanionPath(path) && presentationFiles(this.app.vault, path);
        const companionFile = pair && pair.markdown === file ? pair.companion : null;
        const companionPath = companionFile?.path;
        try {
            if (!companionPath || !companionFile) {
                this.forget(file);
                return;
            }
            await this.data?.ready.catch(() => undefined);
            const companionText = await this.app.vault.read(companionFile);
            const companion: unknown = JSON.parse(companionText);
            const markdown = view ? view.getViewData() : await this.app.vault.read(file);
            // The file's newest request owns its metadata. A reused editor is never a
            // source for that earlier file, and unloading invalidates every request.
            if (
                !this.running ||
                this.reads.get(file) !== request ||
                file.path !== path ||
                this.app.vault.getAbstractFileByPath(path) !== file ||
                presentationFiles(this.app.vault, path)?.companion !== companionFile ||
                (view && view.file !== file)
            )
                return;
            const layouts =
                isRecord(companion) && isRecord(companion.slides)
                    ? Object.values(companion.slides).flatMap(record =>
                          isRecord(record) && typeof record.layout === 'string' ? [record.layout] : []
                      )
                    : [];
            const previous = this.sources.get(file)?.theme;
            const themePaths = embeddedThemePaths(path, companion, new Set(layouts));
            const theme =
                previous &&
                previous.root === themePaths?.root &&
                isRecord(companion) &&
                companion.theme === previous.key &&
                layouts.every(key => previous.layouts.has(key))
                    ? previous
                    : await readEmbeddedTheme(this.app.vault, path, companion, new Set(layouts));
            if (
                !this.running ||
                this.reads.get(file) !== request ||
                file.path !== path ||
                this.app.vault.getAbstractFileByPath(path) !== file ||
                presentationFiles(this.app.vault, path)?.companion !== companionFile ||
                (view && view.file !== file)
            )
                return;
            const source: PresentationSource = {
                file,
                path,
                companionPath,
                companion,
                companionText,
                theme,
                markdown: null,
                snapshot: null
            };
            this.sources.set(file, source);
            this.update(source, view ? view.getViewData() : markdown, view);
        } catch {
            if (this.running && this.reads.get(file) === request) this.forget(file);
        } finally {
            if (this.reads.get(file) === request) this.reads.delete(file);
        }
    }

    private forget(file: TFile): void {
        const known = this.sources.delete(file);
        this.reads.delete(file);
        if (this.followed === file) {
            this.followed = null;
            this.publish(null, null);
        }
        // An editor only decorates a known source, so an ordinary note named slides.md has nothing to clear
        if (known) this.changed(file);
    }

    private update(source: PresentationSource, markdown: string, view: MarkdownView | null): void {
        const snapshot = this.snapshot(source.file, markdown);
        if (snapshot && this.requested === source.file) this.followed = source.file;
        if (this.followed === source.file) this.publish(snapshot?.outline ?? null, view);
        if (snapshot)
            this.data?.observe(
                source.path,
                snapshot.id,
                source.companionText,
                new Set(snapshot.document.slides.map(slide => slide.id)),
                new Set(snapshot.document.compositions.map(part => part.id))
            );
        this.changed(source.file);
    }

    /** Explicit native actions publish before their caret/outline handoff. */
    syncEditor(view: MarkdownView): boolean {
        const source = view.file && this.sources.get(view.file);
        if (!this.running || !source || source.path !== view.file?.path) return false;
        this.update(source, view.getViewData(), view);
        return true;
    }

    /** Just-undone source may be visible before its companion restore reaches disk. */
    companionFor(file: TFile, snapshot: PresentationSnapshot): string | null {
        const source = this.sources.get(file);
        if (!this.running || !source || source.path !== file.path) return null;
        let companion = source.companionText;
        for (const kind of ['slides', 'compositions'] as const) {
            const parts = snapshot.document[kind];
            if (!parts.length && kind === 'compositions') continue;
            const data = kind === 'compositions' ? CompanionDocument.ensure(companion, kind) : CompanionDocument.read(companion, kind);
            if (!data) return null;
            const missing = new Map<string, string>();
            for (const part of parts) {
                if (data.records.has(part.id)) continue;
                const remembered = this.data?.remembered(source.path, snapshot.id, kind).get(part.id);
                if (remembered === undefined) return null;
                missing.set(part.id, remembered);
            }
            const updated = missing.size ? data.change(missing) : companion;
            if (updated === null) return null;
            companion = updated;
        }
        return companion;
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
        const header = frontmatterOf(markdown);
        const id = header && presentationIdentity(header.frontmatter, source.companion);
        if (!header || !id || !isRecord(source.companion) || !isRecord(source.companion.slides)) return null;
        return { id, bodyStart: header.bodyStart };
    }

    /** A presentation of a newer format opens as an ordinary note; its author learns why once. */
    private tellNewer(source: PresentationSource, markdown: string): void {
        const header = frontmatterOf(markdown);
        const version = header && newerFormat(header.frontmatter, source.companion);
        if (!version || this.newer.has(source.path)) return;
        this.newer.add(source.path);
        new Notice(uiText.presentations.newerFormat({ version }));
    }

    private parse(source: PresentationSource, markdown: string): PresentationSnapshot | null {
        const identity = this.identity(source, markdown);
        if (!identity) this.tellNewer(source, markdown);
        if (!identity || !isRecord(source.companion) || !isRecord(source.companion.slides)) return null;
        const document = indexPresentation(markdown, identity.bodyStart);
        const slides = source.companion.slides;
        if (!document) return null;
        const skipped = new Set<string>();
        const images = new Map<string, readonly SlideImagePreview[]>();
        const structures = new Map<string, ReturnType<typeof slideStructure>>();
        for (const slide of document.slides) {
            let metadata: unknown = slides[slide.id];
            if (!Object.hasOwn(slides, slide.id)) {
                const remembered = this.data?.remembered(source.path, identity.id).get(slide.id);
                if (remembered === undefined) return null;
                metadata = JSON.parse(remembered);
            }
            if (!isRecord(metadata) || (metadata.skipped !== undefined && typeof metadata.skipped !== 'boolean')) return null;
            if (metadata.skipped === true) skipped.add(slide.id);
            structures.set(slide.id, slideStructure(metadata, source.theme));
            const current = Object.hasOwn(slides, slide.id)
                ? source.companion
                : { ...source.companion, slides: { ...slides, [slide.id]: metadata } };
            images.set(slide.id, readSlideImages(this.app.vault, assignedSlideImages(source.path, current, slide.id, source.theme)));
        }
        const sections = outlineSections(markdown, document);
        if (sections.length && document.slides.some(slide => slide.from < document.sections[0]!.from)) return null;
        return {
            id: identity.id,
            bodyStart: identity.bodyStart,
            document,
            images,
            outline: {
                documentId: identity.id,
                path: source.path,
                slides: outlineSlides(markdown, document, uiText.emptySlide, skipped).map(slide => ({
                    ...slide,
                    structure: structures.get(slide.id)
                })),
                sections
            }
        };
    }
}

function frontmatterOf(markdown: string): { frontmatter: unknown; bodyStart: number } | null {
    const header = getFrontMatterInfo(markdown);
    try {
        return { frontmatter: header.exists ? parseYaml(header.frontmatter) : null, bodyStart: header.contentStart };
    } catch {
        return null;
    }
}
