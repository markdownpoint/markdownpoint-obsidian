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

import { Component, MarkdownView, Notice, TFile, getFrontMatterInfo, parseYaml } from 'obsidian';
import type { App, TAbstractFile, Vault } from 'obsidian';
import { indexPresentation } from '../format/document.ts';
import type { PresentationDocument } from '../format/document.ts';
import { isRecord, newerFormat, presentationCompanionPath, presentationIdentity, presentationMember } from '../format/recognition.ts';
import { learnVaultCase, presentationAround, presentationFiles } from './presentation-files.ts';
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
import { slideTextPlaceholders } from '../format/new-slide.ts';
import { CompanionDocument } from '../format/companion.ts';
import { readJsonObject } from '../format/json.ts';
import { readPresentationFile, readPresentationMarkdown } from '../readers/markdownpoint-readers.js';
import type { PairProblem, PairReading, PresentationFileReading } from '../readers/markdownpoint-readers.js';

interface PresentationSource {
    readonly file: TFile;
    readonly path: string;
    readonly companionPath: string;
    readonly companion: unknown;
    readonly companionText: string;
    /** Its theme as read for the layouts its slides use, which holds those MarkdownPoint reads. */
    themeRead: { readonly theme: EmbeddedTheme; readonly layouts: ReadonlySet<string> } | null;
    markdown: string | null;
    snapshot: PresentationSnapshot | null;
}

export interface PresentationSnapshot {
    readonly id: string;
    readonly bodyStart: number;
    readonly document: PresentationDocument;
    readonly outline: OutlinePresentation;
    readonly images: ReadonlyMap<string, readonly SlideImagePreview[]>;
    /** Each slide's layout text placeholders in reading order, with or without their blocks. */
    readonly placeholders: ReadonlyMap<string, readonly string[]>;
}

export class PresentationReader extends Component {
    private sources = new WeakMap<TFile, PresentationSource>();
    private reads = new WeakMap<TFile, { readonly view: MarkdownView | null }>();
    private followed: TFile | null = null;
    private requested: TFile | null = null;
    private running = false;
    // Presentations a newer format keeps closed, told once each session
    private readonly newer = new Set<string>();
    // Presentations inside another's folder, which open as notes, told once each session
    private readonly nested = new Set<string>();
    // Presentations MarkdownPoint can't read, which open as notes, told once each session for each file a reason names
    private readonly refused = new Set<string>();

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
        // An edit decides nothing of whether the pair opens, which is read from its files once Obsidian saves the edit
        this.registerEvent(
            this.app.workspace.on('editor-change', (_editor, info) => {
                if (info instanceof MarkdownView && info.file) this.syncEditor(info);
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
        // A change Obsidian reports to either file of a pair reads it anew, open or not, though a write left the file's time
        // and size as they were
        if (file instanceof TFile) changes.set(file, (changes.get(file) ?? 0) + 1);
        for (const changed of [file.path, oldPath]) {
            if (changed === undefined || !presentationMember(changed.slice(changed.lastIndexOf('/') + 1))) continue;
            const slash = changed.lastIndexOf('/');
            const folder = slash < 0 ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(changed.slice(0, slash));
            for (const entry of folder?.children ?? []) if (entry instanceof TFile) pairReadings.delete(entry);
        }
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
            const themeRoot = source?.themeRead?.theme.root ?? candidate.path.slice(0, candidate.path.lastIndexOf('/') + 1) + 'themes';
            // The theme's folder, a file in it, or a folder around it, as a rename of its parent moves it
            const themeChange = [file.path, oldPath].some(
                path => path !== undefined && (path === themeRoot || path.startsWith(themeRoot + '/') || themeRoot.startsWith(path + '/'))
            );
            if (themeChange && source) source.themeRead = null;
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

    /** The author opened or turned to a note: a presentation MarkdownPoint can't read says why as it opens. */
    private refresh(view: MarkdownView): void {
        void this.refreshView(view, true).catch((error: unknown) => console.error(error));
    }

    async refreshView(view: MarkdownView, opened = false): Promise<void> {
        if (!view.file || !presentationCompanionPath(view.file.path)) return;
        if (this.requested !== view.file) {
            const source = this.sources.get(view.file);
            if (source) source.themeRead = null;
        }
        this.requested = view.file;
        await this.read(view.file, view, opened);
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

    private async read(file: TFile, view: MarkdownView | null, opened = false): Promise<void> {
        const request = { view };
        this.reads.set(file, request);
        const path = file.path;
        const pair = presentationCompanionPath(path) && presentationFiles(this.app.vault, path);
        const companionFile = pair && pair.markdown === file ? pair.companion : null;
        const companionPath = companionFile?.path;
        // The file's newest request owns its metadata. A reused editor is never a
        // source for that earlier file, and unloading invalidates every request.
        const current = () =>
            this.running &&
            this.reads.get(file) === request &&
            file.path === path &&
            this.app.vault.getAbstractFileByPath(path) === file &&
            presentationFiles(this.app.vault, path)?.companion === companionFile &&
            (!view || view.file === file);
        try {
            if (!companionPath || !companionFile) {
                this.tellNested(path);
                this.forget(file);
                return;
            }
            await this.data?.ready.catch(() => undefined);
            await learnVaultCase(this.app.vault);
            // Taken before the read, so the files read are at least as new as they say
            const stamp = pairStamp(companionFile, file);
            const companionStamp = fileStamp(companionFile);
            const [companionBytes, markdownBytes] = await Promise.all([
                this.app.vault.readBinary(companionFile),
                this.app.vault.readBinary(file)
            ]);
            if (!current()) return;
            const companionText = fileText(companionBytes);
            const markdown = fileText(markdownBytes);
            const { reading, repairs } = await this.admit(
                path,
                stamp,
                companionStamp,
                companionFile,
                companionBytes,
                companionText,
                file,
                markdownBytes,
                markdown
            );
            if (!current()) return;
            if (!reading.opens) {
                this.forget(file);
                if (opened) this.tellRefused(path, reading.problem, markdown, companionText);
                return;
            }
            // Held as it is on disk, so the plugin's saves write back what its records restore. A save of the words alone
            // leaves it as it was read.
            const known = this.sources.get(file);
            const companion = known?.companionText === companionText ? known.companion : readJsonObject(companionText);
            if (!companion) {
                this.forget(file);
                return;
            }
            const layouts =
                isRecord(companion) && isRecord(companion.slides)
                    ? Object.values(companion.slides).flatMap(record =>
                          isRecord(record) && typeof record.layout === 'string' ? [record.layout] : []
                      )
                    : [];
            // The theme read before, while nothing in it changed, for every layout the slides use, read or not
            const previous = this.sources.get(file)?.themeRead;
            const themePaths = embeddedThemePaths(path, companion, new Set(layouts));
            const themeRead =
                previous &&
                previous.theme.root === themePaths?.root &&
                isRecord(companion) &&
                companion.theme === previous.theme.key &&
                layouts.every(key => previous.layouts.has(key))
                    ? previous
                    : await readEmbeddedTheme(this.app.vault, path, companion, new Set(layouts)).then(
                          theme => theme && { theme, layouts: new Set(layouts) }
                      );
            if (!current()) return;
            const source: PresentationSource = {
                file,
                path,
                companionPath,
                companion,
                companionText,
                themeRead,
                markdown: null,
                snapshot: null
            };
            this.sources.set(file, source);
            this.update(source, view ? view.getViewData() : markdown, view);
            // Opened for the records the plugin writes back: its save writes them, whatever it saved before
            if (repairs) this.data?.retry(path, repairs);
        } catch {
            if (this.running && this.reads.get(file) === request) this.forget(file);
        } finally {
            if (this.reads.get(file) === request) this.reads.delete(file);
        }
    }

    /**
     * Whether a pair opens as MarkdownPoint opens it, read from its two files. The plugin's two writes of an edit, its save
     * of the companion and Obsidian's of the words, land in either order, a moment apart or, after a write that failed,
     * after a restart: a pair refused only until the plugin writes back the records it keeps for this presentation opens,
     * and `repairs` names the presentation whose save writes them.
     */
    private async admit(
        path: string,
        stamp: string,
        companionStamp: string,
        companionFile: TFile,
        companionBytes: ArrayBuffer,
        companionText: string,
        markdownFile: TFile,
        markdownBytes: ArrayBuffer,
        markdown: string
    ): Promise<{ reading: PairReading; repairs?: string }> {
        const reading = await readPairOnce(stamp, companionFile, markdownFile, () =>
            Promise.resolve(readPair(path, companionFile, companionBytes, companionStamp, markdownFile, markdownBytes))
        );
        const header = !reading.opens && this.data ? frontmatterOf(markdown) : null;
        const id = header && isRecord(header.frontmatter) ? header.frontmatter.id : undefined;
        const document = header && typeof id === 'string' ? indexPresentation(markdown, header.bodyStart) : null;
        if (!this.data || !document || typeof id !== 'string') return { reading };
        const saved = this.data.reconciled(
            path,
            id,
            companionText,
            new Set(document.slides.map(slide => slide.id)),
            new Set(document.compositions.map(part => part.id))
        );
        if (saved === companionText) return { reading };
        const pending = readPair(path, companionFile, new TextEncoder().encode(saved), null, markdownFile, markdownBytes);
        // A refusal the plugin's writes leave in place is the one the files on disk have
        return pending.opens ? { reading: pending, repairs: id } : { reading };
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
        return presentationHeader(markdown, source.companion);
    }

    /** A presentation inside another's folder opens as an ordinary note, as the app opens none there; its author learns why once. */
    private tellNested(path: string): void {
        const around = presentationCompanionPath(path) ? presentationAround(this.app.vault, path) : null;
        if (!around || this.nested.has(path)) return;
        this.nested.add(path);
        const folder = path.slice(0, path.lastIndexOf('/'));
        new Notice(uiText.presentations.nested({ presentation: folder.slice(folder.lastIndexOf('/') + 1), outer: around.name }));
    }

    /** A presentation of a newer format opens as an ordinary note; its author learns why once. Whether it is one. */
    private tellNewer(path: string, markdown: string, companion: unknown): boolean {
        const header = frontmatterOf(markdown);
        const version = header && newerFormat(header.frontmatter, companion);
        if (!version) return false;
        if (this.newer.has(path)) return true;
        this.newer.add(path);
        new Notice(uiText.presentations.newerFormat({ version }));
        return true;
    }

    /**
     * A presentation MarkdownPoint can't read opens as an ordinary note. Its author learns why while opening it, once each
     * session for each file a reason names, and the MarkdownPoint app names the reason itself.
     */
    private tellRefused(path: string, problem: PairProblem, markdown: string, companionText: string): void {
        if (this.tellNewer(path, markdown, readJsonObject(companionText))) return;
        const told = JSON.stringify([path, problem.file ?? null]);
        if (this.refused.has(told)) return;
        this.refused.add(told);
        const slash = path.lastIndexOf('/');
        // A presentation at the vault's root is named by its vault
        const folder = slash < 0 ? this.app.vault.getName() : path.slice(0, slash);
        const presentation = folder.slice(folder.lastIndexOf('/') + 1);
        new Notice(
            problem.file
                ? uiText.presentations.unreadableFile({ file: problem.file, presentation })
                : uiText.presentations.unreadable({ presentation })
        );
    }

    private parse(source: PresentationSource, markdown: string): PresentationSnapshot | null {
        const identity = this.identity(source, markdown);
        if (!identity) this.tellNewer(source.path, markdown, source.companion);
        if (!identity || !isRecord(source.companion) || !isRecord(source.companion.slides)) return null;
        const document = indexPresentation(markdown, identity.bodyStart);
        const slides = source.companion.slides;
        if (!document) return null;
        const skipped = new Set<string>();
        const images = new Map<string, readonly SlideImagePreview[]>();
        const structures = new Map<string, ReturnType<typeof slideStructure>>();
        const placeholders = new Map<string, readonly string[]>();
        for (const slide of document.slides) {
            let metadata: unknown = slides[slide.id];
            if (!Object.hasOwn(slides, slide.id)) {
                const remembered = this.data?.remembered(source.path, identity.id).get(slide.id);
                if (remembered === undefined) return null;
                metadata = JSON.parse(remembered);
            }
            if (!isRecord(metadata) || (metadata.skipped !== undefined && typeof metadata.skipped !== 'boolean')) return null;
            if (metadata.skipped === true) skipped.add(slide.id);
            structures.set(slide.id, slideStructure(metadata, source.themeRead?.theme ?? null));
            placeholders.set(slide.id, slideTextPlaceholders(metadata, source.themeRead?.theme ?? null));
            const current = Object.hasOwn(slides, slide.id)
                ? source.companion
                : { ...source.companion, slides: { ...slides, [slide.id]: metadata } };
            images.set(
                slide.id,
                readSlideImages(this.app.vault, assignedSlideImages(source.path, current, slide.id, source.themeRead?.theme ?? null))
            );
        }
        const sections = outlineSections(markdown, document);
        if (sections.length && document.slides.some(slide => slide.from < document.sections[0]!.from)) return null;
        return {
            id: identity.id,
            bodyStart: identity.bodyStart,
            document,
            images,
            placeholders,
            outline: {
                id: identity.id,
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

/** The identity and body of a presentation's slides.md read with its companion, or null when they make no presentation. */
function presentationHeader(markdown: string, companion: unknown): { id: string; bodyStart: number } | null {
    const header = frontmatterOf(markdown);
    const id = header && presentationIdentity(header.frontmatter, companion);
    if (!header || !id || !isRecord(companion) || !isRecord(companion.slides)) return null;
    return { id, bodyStart: header.bodyStart };
}

/** A file's text as Obsidian reads it: past nothing, a byte order mark kept, as MarkdownPoint's readers then read it. */
function fileText(bytes: ArrayBuffer): string {
    return new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
}

/**
 * Whether a pair opens in MarkdownPoint, read by MarkdownPoint's own readers from the bytes of its two files. The
 * presentation file's bytes as `companionStamp` names them are read once for each Markdown file read beside them, and
 * those no stamp names, as the plugin's own records not yet saved, alone.
 */
function readPair(
    path: string,
    companion: TFile,
    companionBytes: ArrayBuffer | Uint8Array,
    companionStamp: string | null,
    markdown: TFile,
    markdownBytes: ArrayBuffer
): PairReading {
    const slash = path.lastIndexOf('/');
    const folder = slash < 0 ? '/' : path.slice(0, slash);
    return readPresentationMarkdown(presentationFileReading(folder, companion, companionBytes, companionStamp), {
        name: markdown.name,
        bytes: new Uint8Array(markdownBytes)
    });
}

/** A pair's two files as their last changes left them, each by its time and size. */
function pairStamp(companion: TFile, markdown: TFile): string {
    return JSON.stringify([companion.stat.mtime, companion.stat.size, markdown.stat.mtime, markdown.stat.size]);
}

// How many changes Obsidian has reported to each file, which its stamp names beside its time and size: a write that left
// them as they were still makes it read anew
const changes = new WeakMap<TFile, number>();

/** A file as its last change left it: its time and size, and how many changes Obsidian has reported to it. */
function fileStamp(file: TFile): string {
    return JSON.stringify([file.stat.mtime, file.stat.size, changes.get(file) ?? 0]);
}

// Each presentation file's reading, by its folder and the stamp it had before it was read: a save of the words alone,
// as Obsidian makes while its author types, reads only the Markdown file beside it
const fileReadings = new WeakMap<TFile, { readonly key: string; readonly reading: PresentationFileReading }>();

/** The reading of a presentation file's bytes in `folder`: the one kept for the file while `stamp` names it, else theirs. */
function presentationFileReading(
    folder: string,
    companion: TFile,
    bytes: ArrayBuffer | Uint8Array,
    stamp: string | null
): PresentationFileReading {
    const key = stamp === null ? null : JSON.stringify([folder, stamp]);
    const kept = fileReadings.get(companion);
    if (key !== null && kept?.key === key) return kept.reading;
    const reading = readPresentationFile(folder, { name: companion.name, bytes: new Uint8Array(bytes) });
    if (key !== null) fileReadings.set(companion, { key, reading });
    return reading;
}

// Each pair's reading, by the stamp its files had before they were read: a file that changes changes its stamp, so the
// reader's reads and the reading view's sections read files that haven't changed once, together
const pairReadings = new WeakMap<TFile, { readonly companion: TFile; readonly stamp: string; readonly reading: Promise<PairReading> }>();

/** The pair's reading for the files as `stamp` names them: the one kept for them, else `read`'s, kept until either changes. */
function readPairOnce(stamp: string, companion: TFile, markdown: TFile, read: () => Promise<PairReading>): Promise<PairReading> {
    const kept = pairReadings.get(markdown);
    if (kept?.companion === companion && kept.stamp === stamp) return kept.reading;
    const reading = read();
    const keeping = { companion, stamp, reading };
    pairReadings.set(markdown, keeping);
    // A read that failed is no answer: the next one reads the files again
    reading.catch(() => {
        if (pairReadings.get(markdown) === keeping) pairReadings.delete(markdown);
    });
    return reading;
}

/** Whether `path` is the slides.md of a presentation that opens, as MarkdownPoint opens it from its two files. */
export async function readsAsPresentation(vault: Vault, path: string): Promise<boolean> {
    await learnVaultCase(vault);
    const pair = presentationCompanionPath(path) ? presentationFiles(vault, path) : null;
    if (!pair || pair.markdown.path !== path) return false;
    const { markdown, companion } = pair;
    const companionStamp = fileStamp(companion);
    const reading = readPairOnce(pairStamp(companion, markdown), companion, markdown, async () => {
        const [companionBytes, markdownBytes] = await Promise.all([vault.readBinary(companion), vault.readBinary(markdown)]);
        return readPair(path, companion, companionBytes, companionStamp, markdown, markdownBytes);
    });
    try {
        return (await reading).opens;
    } catch {
        return false;
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
