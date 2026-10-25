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

import { isRecord } from '../format/recognition.ts';
import { assignLayoutDigit, readLayoutAssignments } from './layout-shortcuts.ts';
import type { LayoutAssignments } from './layout-shortcuts.ts';

interface SettingsHost {
    loadData(): Promise<unknown>;
    saveData(data: unknown): Promise<void>;
}

/** One serialized owner for synced preferences; workspace placement remains device-local. */
export class SharedSettings {
    private readonly host: SettingsHost;
    private data: Record<string, unknown> = {};
    private writes: Promise<void> = Promise.resolve();
    private revision = 0;
    layoutShortcuts: LayoutAssignments = readLayoutAssignments(undefined);
    ready: Promise<void>;
    get showSlideImages(): boolean {
        return this.data.showSlideImages !== false;
    }

    constructor(host: SettingsHost) {
        this.host = host;
        this.ready = this.read();
        void this.ready.catch((error: unknown) => console.error(error));
    }

    private async read(): Promise<void> {
        const revision = ++this.revision;
        const loaded = await this.host.loadData();
        if (revision !== this.revision) return;
        this.apply(isRecord(loaded) ? loaded : {});
    }

    private apply(data: Record<string, unknown>): void {
        this.data = data;
        this.layoutShortcuts = readLayoutAssignments(data.layoutShortcuts);
    }

    reload(): Promise<void> {
        this.ready = this.writes.then(() => this.read());
        return this.ready;
    }
    assign(layout: string, digit: string | null): Promise<void> {
        return this.change(data => ({ ...data, layoutShortcuts: assignLayoutDigit(this.layoutShortcuts, layout, digit) }));
    }
    setShowSlideImages(show: boolean): Promise<void> {
        return this.change(data => ({ ...data, showSlideImages: show }));
    }

    private change(update: (data: Record<string, unknown>) => Record<string, unknown>): Promise<void> {
        const ready = this.ready;
        const saving = this.writes.then(async () => {
            await ready;
            const data = update(this.data);
            await this.host.saveData(data);
            this.revision++;
            this.apply(data);
        });
        this.writes = saving.catch(() => undefined);
        return saving;
    }
}
