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

import { Notice, getFrontMatterInfo, parseYaml } from 'obsidian';
import type { App, MarkdownView, TFile } from 'obsidian';
import { indexPresentation } from '../format/document.ts';
import { readJsonObject } from '../format/json.ts';
import { isRecord, presentationIdentity } from '../format/recognition.ts';
import { presentationFiles } from './presentation-files.ts';
import type { SlideData } from './slide-data.ts';
import { uiText } from '../ui-text.ts';

interface Handoff {
    readonly file: TFile;
    readonly documentId: string;
    readonly view: MarkdownView | null;
    readonly current: () => boolean;
}

/** Save through Obsidian, await companion writes, then use its native file association. */
export async function openPresentationInDesktop(app: App, input: Handoff, data: SlideData | null): Promise<void> {
    const path = input.file.path;
    const current = () =>
        input.current() &&
        input.file.path === path &&
        app.vault.getFileByPath(path) === input.file &&
        (!input.view || input.view.file === input.file);
    try {
        if (!current()) return;
        if (input.view) await input.view.save();
        if (data && !(await data.settled(path, input.documentId))) {
            // The desktop app would open stale slide data; the save failure's own notice may already be dismissed
            if (current()) new Notice(uiText.slides.saveFailed);
            return;
        }
        if (!current()) return;
        const pair = presentationFiles(app.vault, path);
        if (!pair || pair.markdown !== input.file) {
            new Notice(uiText.presentations.openChanged);
            return;
        }
        const [markdown, source] = await Promise.all([app.vault.read(pair.markdown), app.vault.read(pair.companion)]);
        if (!current()) return;
        const latest = presentationFiles(app.vault, path),
            header = getFrontMatterInfo(markdown);
        const metadata = readJsonObject(source),
            document = indexPresentation(markdown, header.contentStart);
        const frontmatter: unknown = header.exists ? parseYaml(header.frontmatter) : null;
        const slides = metadata?.slides,
            compositions = metadata?.compositions;
        if (
            latest?.markdown !== pair.markdown ||
            latest.companion !== pair.companion ||
            (input.view && input.view.getViewData() !== markdown) ||
            presentationIdentity(frontmatter, metadata) !== input.documentId ||
            !document ||
            !isRecord(slides) ||
            document.slides.some(slide => !isRecord(slides[slide.id])) ||
            document.compositions.some(part => !isRecord(compositions) || !isRecord(compositions[part.id]))
        ) {
            new Notice(uiText.presentations.openChanged);
            return;
        }
        // Reuse an existing leaf even when pinned: requesting a navigation target can create an empty tab.
        let leaf = input.view?.leaf ?? app.workspace.getMostRecentLeaf();
        if (!leaf)
            app.workspace.iterateRootLeaves(candidate => {
                leaf ??= candidate;
            });
        if (!leaf) return;
        await leaf.openFile(pair.companion);
    } catch (error) {
        console.error(error);
        if (current()) new Notice(uiText.presentations.handoffFailed);
    }
}
