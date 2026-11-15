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

import { StateField } from '@codemirror/state';

// Headless stand-ins for the parts of Obsidian's API the tests reach. Vitest aliases 'obsidian' to this module;
// no DOM or Obsidian app is created. Live checks use Obsidian's real implementation.

export class Component {
    load(): void {
        (this as { onload?: () => void }).onload?.();
    }
    unload(): void {
        (this as { onunload?: () => void }).onunload?.();
    }
    registerEvent(): void {}
}

/** Each notice's words, in the order they were shown. */
export const notices: string[] = [];
export class Notice {
    constructor(message: string) {
        notices.push(message);
    }
}

/** Each dialog opened, in order; none draws. */
export const modals: unknown[] = [];
export class Modal {
    constructor(readonly app: unknown) {}
    open(): void {
        modals.push(this);
    }
    close(): void {}
}

/** An editor of one note: the words it holds, which Obsidian saves to the file a moment after each edit. */
export class MarkdownView {
    readonly leaf: { view: MarkdownView } = { view: this };
    file: TFile | null;
    private text: string;
    constructor(file: TFile | null = null, text = '') {
        this.file = file;
        this.text = text;
    }
    getViewData(): string {
        return this.text;
    }
    setViewData(text: string): void {
        this.text = text;
    }
    getMode(): 'source' | 'preview' {
        return 'source';
    }
}
export const editorInfoField = StateField.define({ create: () => ({ file: { path: 'Talk/slides.md' } }), update: value => value });
export const editorLivePreviewField = StateField.define({ create: () => true, update: value => value });
export const getLanguage = () => 'en';
export const setIcon = () => undefined;
export const setTooltip = () => undefined;

export class TFolder {
    path: string;
    parent: TFolder | null = null;
    children: (TFile | TFolder)[] = [];
    constructor(path: string) {
        this.path = path;
    }
    get name(): string {
        return this.path.split('/').at(-1)!;
    }
    isRoot(): boolean {
        return this.path === '/';
    }
}
export class TFile {
    path: string;
    parent: TFolder | null = null;
    bytes: Uint8Array;
    stat: { mtime: number; size: number };
    constructor(path: string, bytes: Uint8Array, mtime: number) {
        this.path = path;
        this.bytes = bytes;
        this.stat = { mtime, size: bytes.length };
    }
    get name(): string {
        return this.path.split('/').at(-1)!;
    }
    get extension(): string {
        return this.name.split('.').at(-1)!;
    }
    get basename(): string {
        return this.name.slice(0, this.name.lastIndexOf('.'));
    }
}
export function getFrontMatterInfo(source: string) {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
    return { exists: !!match, frontmatter: match?.[1] ?? '', contentStart: match?.[0].length ?? 0 };
}
export function parseYaml(source: string): unknown {
    return Object.fromEntries(
        source.split('\n').map(line => {
            const at = line.indexOf(':');
            const value = line.slice(at + 1).trim();
            // Enough YAML for frontmatter fixtures: whole numbers, double-quoted strings and plain words
            const quoted = /^"(.*)"$/.exec(value);
            return [line.slice(0, at), quoted ? quoted[1] : /^\d+$/.test(value) ? Number(value) : value];
        })
    );
}

type Handler = (...values: never[]) => unknown;

/** Obsidian's events by name, each handler called in the order it was added. */
class Events {
    private readonly handlers = new Map<string, Handler[]>();
    on(name: string, handler: Handler): { name: string; handler: Handler } {
        this.handlers.set(name, [...(this.handlers.get(name) ?? []), handler]);
        return { name, handler };
    }
    trigger(name: string, ...values: unknown[]): void {
        for (const handler of this.handlers.get(name) ?? []) (handler as (...values: unknown[]) => unknown)(...values);
    }
}

/**
 * An app over a vault held in memory, each file by its path and its text or bytes: its files change only through `write`,
 * `remove` and `create`, which tell the vault's handlers as Obsidian does, and `open` shows a note in an editor of its own.
 */
export function memoryApp(files: Readonly<Record<string, string | Uint8Array>>, name = 'Vault') {
    const encoder = new TextEncoder();
    const root = new TFolder('/');
    const entries = new Map<string, TFile | TFolder>([['/', root]]);
    let clock = 1;
    const folderAt = (path: string): TFolder => {
        if (!path) return root;
        const found = entries.get(path);
        if (found instanceof TFolder) return found;
        const folder = new TFolder(path);
        const parent = folderAt(path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
        folder.parent = parent;
        parent.children.push(folder);
        entries.set(path, folder);
        return folder;
    };
    const vaultEvents = new Events();
    const vault = {
        configDir: '.config',
        adapter: { exists: () => Promise.resolve(false) },
        getName: () => name,
        getRoot: () => root,
        getAbstractFileByPath: (path: string) => entries.get(path) ?? null,
        getFileByPath: (path: string) => {
            const found = entries.get(path);
            return found instanceof TFile ? found : null;
        },
        getFolderByPath: (path: string) => {
            const found = entries.get(path || '/');
            return found instanceof TFolder ? found : null;
        },
        getFiles: () => [...entries.values()].filter(entry => entry instanceof TFile),
        getResourcePath: (file: TFile) => `app://local/${file.path}`,
        // The bytes as they are now, in a buffer of their own, as Obsidian gives them
        readBinary: (file: TFile) => Promise.resolve(file.bytes.slice().buffer),
        read: (file: TFile) => Promise.resolve(new TextDecoder('utf-8', { ignoreBOM: true }).decode(file.bytes)),
        cachedRead: (file: TFile) => Promise.resolve(new TextDecoder('utf-8', { ignoreBOM: true }).decode(file.bytes)),
        on: (name: string, handler: Handler) => vaultEvents.on(name, handler),
        /** A file made or replaced in place, as a save or a sync leaves it, or one that keeps its time and size. */
        write(path: string, contents: string | Uint8Array, keepStat = false): TFile {
            const bytes = typeof contents === 'string' ? encoder.encode(contents) : contents;
            const existing = entries.get(path);
            if (existing instanceof TFile) {
                existing.bytes = bytes;
                if (!keepStat) existing.stat = { mtime: ++clock, size: bytes.length };
                vaultEvents.trigger('modify', existing);
                return existing;
            }
            const file = new TFile(path, bytes, ++clock);
            const parent = folderAt(path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
            file.parent = parent;
            parent.children.push(file);
            entries.set(path, file);
            vaultEvents.trigger('create', file);
            return file;
        },
        /**
         * A file or folder given another name in its folder, as Obsidian renames one: the same one, at another path, and
         * what a folder holds with it. Its own rename alone is told.
         */
        rename(path: string, name: string): void {
            const entry = entries.get(path);
            if (!entry) return;
            const to = path.slice(0, path.lastIndexOf('/') + 1) + name;
            for (const [at, moved] of [...entries]) {
                if (at !== path && !at.startsWith(path + '/')) continue;
                entries.delete(at);
                moved.path = to + at.slice(path.length);
                entries.set(moved.path, moved);
            }
            vaultEvents.trigger('rename', entry, path);
        },
        remove(path: string): void {
            const file = entries.get(path);
            if (!(file instanceof TFile) || !file.parent) return;
            file.parent.children = file.parent.children.filter(entry => entry !== file);
            entries.delete(path);
            vaultEvents.trigger('delete', file);
        }
    };
    for (const [path, contents] of Object.entries(files)) {
        const bytes = typeof contents === 'string' ? encoder.encode(contents) : contents;
        const file = new TFile(path, bytes, clock);
        const parent = folderAt(path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
        file.parent = parent;
        parent.children.push(file);
        entries.set(path, file);
    }
    const workspaceEvents = new Events();
    const views: MarkdownView[] = [];
    let recent: MarkdownView | null = null;
    const workspace = {
        on: (name: string, handler: Handler) => workspaceEvents.on(name, handler),
        trigger: (name: string, ...values: unknown[]) => workspaceEvents.trigger(name, ...values),
        onLayoutReady: (ready: () => void) => ready(),
        getMostRecentLeaf: () => recent?.leaf ?? null,
        getLeavesOfType: (type: string) => (type === 'markdown' ? views.map(view => view.leaf) : []),
        getActiveFile: () => recent?.file ?? null
    };
    const metadataCache = { on: () => ({}) };
    return {
        vault,
        workspace,
        metadataCache,
        /** The note at `path` opened in an editor, holding its file's words, as the author opens it. */
        open(path: string): MarkdownView {
            const file = vault.getFileByPath(path);
            const view = new MarkdownView(file, file ? new TextDecoder('utf-8', { ignoreBOM: true }).decode(file.bytes) : '');
            views.push(view);
            recent = view;
            workspaceEvents.trigger('file-open', file);
            workspaceEvents.trigger('active-leaf-change', view.leaf);
            return view;
        },
        /** Words typed into an editor, as its editor-change tells; Obsidian saves them with `save`. */
        type(view: MarkdownView, text: string): void {
            view.setViewData(text);
            workspaceEvents.trigger('editor-change', {}, view);
        },
        /** An editor's words saved to its file, as Obsidian saves them a moment after an edit. */
        save(view: MarkdownView): void {
            if (view.file) vault.write(view.file.path, view.getViewData());
        }
    };
}
