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

import { Component, Modal } from 'obsidian';
import type { App } from 'obsidian';
import {
    compareVersions,
    getLatestReleaseNotes,
    getReleaseNotesForUpdate,
    normalizeVersion,
    shouldAutoDisplayReleaseNotesForUpdate
} from './release-notes.ts';
import type { ReleaseNote } from './release-notes.ts';
import type { SharedSettings } from './settings/shared.ts';
import { uiDate, uiText } from './ui-text.ts';

// The marker on this device, beside the synced one in plugin data
const LAST_SHOWN_VERSION_KEY = 'markdownpoint-last-shown-version';
const RELEASES_URL = 'https://github.com/markdownpoint/markdownpoint-obsidian/releases/tag/';

/** The lists under a version, in the order they are rendered. */
const CATEGORIES = [
    { key: 'new', label: uiText.whatsNew.new },
    { key: 'improved', label: uiText.whatsNew.improved },
    { key: 'changed', label: uiText.whatsNew.changed },
    { key: 'fixed', label: uiText.whatsNew.fixed }
] as const;

/** Opens the release notes once after an update, and on demand from settings. */
export class WhatsNew extends Component {
    private modal: WhatsNewModal | null = null;
    private running = false;

    constructor(
        private readonly app: App,
        private readonly version: string,
        private readonly settings: SharedSettings
    ) {
        super();
    }

    onload(): void {
        this.running = true;
        // Deferred so the dialog never opens over a workspace that is still being restored
        this.app.workspace.onLayoutReady(() => {
            if (!this.running) return;
            this.showAfterUpdate().catch((error: unknown) => console.error(error));
        });
    }

    onunload(): void {
        this.running = false;
        this.modal?.close();
        this.modal = null;
    }

    /** Opens the recent release notes on demand, from the button in settings. */
    show(): void {
        this.open(getLatestReleaseNotes());
    }

    /**
     * The release notes after an upgrade, nothing otherwise. An upgrade shows every release since
     * the one last shown, so a version installed and skipped still gets its notes read, padded with
     * a few earlier releases so the dialog carries some history.
     */
    private async showAfterUpdate(): Promise<void> {
        await this.settings.ready;
        if (!this.running) return;
        const lastShown = this.lastShownVersion();
        // A first run in this vault records the version without a dialog; the README introduces the plugin
        if (!lastShown) return this.advance(this.version);
        // A downgrade must not record the older version, because that would reopen the
        // dialog on whichever device is still running the newer one
        if (compareVersions(this.version, lastShown) <= 0) return;
        // With the dialog switched off the marker still advances, so switching it back
        // on later starts from here instead of replaying every release missed meanwhile
        if (!this.settings.showReleaseNotes) return this.advance(this.version);
        if (!shouldAutoDisplayReleaseNotesForUpdate(lastShown, this.version)) return;
        this.open(getReleaseNotesForUpdate(lastShown, this.version));
    }

    private open(notes: ReleaseNote[]): void {
        this.modal = new WhatsNewModal(this.app, notes, () => {
            this.modal = null;
            // Closed by unload rather than by the user: leaving the marker alone means
            // the dialog simply shows again next time
            if (!this.running) return;
            this.advance(this.version).catch((error: unknown) => console.error(error));
        });
        this.modal.open();
    }

    /** The newer of the two markers, discarding anything that is not a version. */
    private lastShownVersion(): string {
        const stored = normalizeVersion(this.settings.lastShownVersion);
        const local = normalizeVersion(this.app.loadLocalStorage(LAST_SHOWN_VERSION_KEY));
        const version = compareVersions(stored, local) >= 0 ? stored : local;
        // Carry a newer synced marker onto this device, otherwise a settings file that
        // syncs back from an older device would roll the marker back and repeat the dialog
        if (version && version !== local) this.app.saveLocalStorage(LAST_SHOWN_VERSION_KEY, version);
        return version;
    }

    /** Moves both markers forward. Neither is ever moved back. */
    private async advance(version: string): Promise<void> {
        const candidate = normalizeVersion(version);
        if (!candidate || compareVersions(candidate, this.lastShownVersion()) <= 0) return;
        // Written before plugin data, because the local marker is what still suppresses the
        // dialog if the settings write fails or is later overwritten by a stale device
        this.app.saveLocalStorage(LAST_SHOWN_VERSION_KEY, candidate);
        await this.settings.advanceLastShownVersion(candidate);
    }
}

/** Opens a link in the browser rather than inside Obsidian. */
function appendLink(parent: HTMLElement, url: string, label: string): void {
    parent.createEl('a', { text: label, href: url, attr: { rel: 'noopener noreferrer', target: '_blank' } });
}

/**
 * Renders the inline formatting release notes may use. The pattern is built per call because
 * `exec` advances `lastIndex` on the object it is called with, and an ==emphasis== span
 * recurses into this same function.
 */
function renderInline(container: HTMLElement, text: string): void {
    const pattern = /==([\s\S]*?)==|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|(https?:\/\/\S+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
        container.appendText(text.slice(lastIndex, match.index));
        const [, emphasis, linkLabel, linkUrl, code, bold, bareUrl] = match;
        if (emphasis) renderInline(container.createSpan({ cls: 'markdownpoint-release-emphasis' }), emphasis);
        else if (linkLabel && linkUrl) appendLink(container, linkUrl, linkLabel);
        else if (code) container.createEl('code', { text: code });
        else if (bold) container.createEl('strong', { text: bold });
        else if (bareUrl) {
            // A sentence that ends in a link would otherwise take its full stop with it
            const trailing = /[.,;:!?)]+$/.exec(bareUrl)?.[0] ?? '';
            const url = trailing ? bareUrl.slice(0, -trailing.length) : bareUrl;
            appendLink(container, url, url);
            container.appendText(trailing);
        }
        lastIndex = pattern.lastIndex;
    }
    container.appendText(text.slice(lastIndex));
}

/** Renders one note, turning each newline into a line break. */
function renderNoteText(container: HTMLElement, text: string): void {
    text.replace(/\r\n?/g, '\n')
        .split('\n')
        .forEach((line, index) => {
            if (index > 0) container.createEl('br');
            renderInline(container, line);
        });
}

/** Shows the release date the way the reader writes dates, falling back to the raw value. */
function formatReleaseDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : uiDate.format(parsed);
}

/** The What's new dialog. `onDismiss` runs once it is closed, however it was closed. */
class WhatsNewModal extends Modal {
    private closeButton: HTMLButtonElement | null = null;

    constructor(
        app: App,
        private readonly notes: ReleaseNote[],
        private readonly onDismiss: () => void
    ) {
        super(app);
    }

    onOpen(): void {
        this.modalEl.addClass('markdownpoint-whats-new');
        this.setTitle(uiText.whatsNew.title);
        // Named by the modal title through aria-labelledby, because Obsidian shows an
        // aria-label as a hover tooltip and the scroll area does not want one
        this.titleEl.id = 'markdownpoint-whats-new-title';
        const scroll = this.contentEl.createDiv({
            cls: 'markdownpoint-release-scroll',
            attr: { tabindex: '0', role: 'region', 'aria-labelledby': 'markdownpoint-whats-new-title' }
        });
        for (const note of this.notes) this.renderRelease(scroll, note);
        const buttons = this.contentEl.createDiv({ cls: 'markdownpoint-whats-new-buttons' });
        this.closeButton = buttons.createEl('button', { cls: 'mod-cta', text: uiText.whatsNew.close, attr: { type: 'button' } });
        this.closeButton.addEventListener('click', () => this.close());
    }

    open(): void {
        super.open();
        // Focus the dismiss button rather than leaving it on the editor behind the dialog,
        // so Enter and Escape both close it
        this.modalEl.win.requestAnimationFrame(() => this.closeButton?.focus({ preventScroll: true }));
    }

    onClose(): void {
        this.contentEl.empty();
        this.closeButton = null;
        this.onDismiss();
    }

    private renderRelease(container: HTMLElement, note: ReleaseNote): void {
        const section = container.createDiv({ cls: 'markdownpoint-release' });
        const heading = section.createEl('h3');
        // The version links to its release on GitHub, so the notes can be copied from there
        appendLink(heading, RELEASES_URL + note.version, uiText.whatsNew.version({ version: note.version }));
        heading.createSpan({ cls: 'markdownpoint-release-date', text: formatReleaseDate(note.date) });
        // The notes are written in English only, so they keep its direction in a right-to-left interface
        const english = { dir: 'ltr', lang: 'en' };
        if (note.info) renderNoteText(section.createEl('p', { cls: 'markdownpoint-release-info', attr: english }), note.info);
        for (const category of CATEGORIES) {
            const items = note[category.key];
            if (!items?.length) continue;
            section.createEl('h4', { text: category.label });
            const list = section.createEl('ul', { attr: english });
            for (const item of items) renderNoteText(list.createEl('li'), item);
        }
    }
}
