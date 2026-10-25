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

interface StoredFile {
    readonly path: string;
    readonly stat: { readonly mtime: number; readonly size: number };
}
interface StoredFolder {
    readonly path: string;
    readonly children: readonly unknown[];
}
interface CreationVault<File extends StoredFile, Folder extends StoredFolder> {
    getAbstractFileByPath(path: string): File | Folder | null;
    createFolder(path: string): Promise<Folder>;
    create(path: string, source: string): Promise<File>;
    copy(file: File, path: string): Promise<File>;
    trash(file: File | Folder): Promise<void>;
}

/** New folders only. On failure, remove this operation's unchanged output and keep foreign edits. */
export async function createPresentationFiles<File extends StoredFile, Folder extends StoredFolder>(
    vault: CreationVault<File, Folder>,
    root: string,
    files: ReadonlyMap<string, string | File>,
    canContinue: () => boolean
): Promise<File> {
    const folders: { folder: Folder; path: string }[] = [],
        created: { file: File; path: string; mtime: number; size: number }[] = [];
    const check = () => {
        if (!canContinue()) throw new Error('Presentation creation canceled');
    };
    const paths = [...files.keys()];
    if (
        !files.has('slides.md') ||
        !files.has('presentation.mdpoint') ||
        !root ||
        [...paths, root].some(path => path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..'))
    )
        throw new Error('Invalid presentation file paths');
    check();
    if (vault.getAbstractFileByPath(root)) throw new Error('Presentation folder already exists');
    try {
        const folder = await vault.createFolder(root);
        folders.push({ folder, path: root });
        check();
        const parents = new Set(
            paths.flatMap(path =>
                path
                    .split('/')
                    .slice(0, -1)
                    .map((_, index, parts) => parts.slice(0, index + 1).join('/'))
            )
        );
        for (const relative of [...parents].sort((a, b) => a.split('/').length - b.split('/').length)) {
            const path = `${root}/${relative}`,
                folder = await vault.createFolder(path);
            folders.push({ folder, path });
            check();
        }
        // Publish the pair last; the reader never treats a folder without its theme as ready.
        const order = [
            ...paths.filter(path => path !== 'slides.md' && path !== 'presentation.mdpoint'),
            'presentation.mdpoint',
            'slides.md'
        ];
        let markdown: File | null = null;
        for (const relative of order) {
            check();
            const source = files.get(relative)!,
                path = `${root}/${relative}`;
            if (vault.getAbstractFileByPath(path)) throw new Error('A presentation file appeared during creation');
            const file = typeof source === 'string' ? await vault.create(path, source) : await vault.copy(source, path);
            created.push({ file, path, mtime: file.stat.mtime, size: file.stat.size });
            check();
            if (relative === 'slides.md') markdown = file;
        }
        return markdown!;
    } catch (error) {
        for (const entry of created.reverse()) {
            if (
                vault.getAbstractFileByPath(entry.path) !== entry.file ||
                entry.file.stat.mtime !== entry.mtime ||
                entry.file.stat.size !== entry.size
            )
                continue;
            try {
                await vault.trash(entry.file);
            } catch (cleanupError) {
                console.error(cleanupError);
            }
        }
        for (const entry of folders.reverse()) {
            if (vault.getAbstractFileByPath(entry.path) !== entry.folder || entry.folder.children.length) continue;
            try {
                await vault.trash(entry.folder);
            } catch (cleanupError) {
                console.error(cleanupError);
            }
        }
        throw error;
    }
}
