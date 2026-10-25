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

import { captureSlides } from '../format/capture.ts';
import { encodeSlideClipboard } from '../format/clipboard.ts';
import type { PresentationDocument } from '../format/document.ts';
import type { EmbeddedTheme } from '../format/embedded-theme.ts';
import { readJsonObject } from '../format/json.ts';
import { readsFormatFully } from '../format/format-version.ts';

export interface CopySource {
    readonly path: string;
    readonly documentId: string;
    readonly markdown: string;
    readonly companion: string;
    readonly index: PresentationDocument;
}

export interface SlideCopyHost<Context> {
    current(context: Context): boolean;
    read(context: Context): Promise<CopySource | null>;
    theme(source: CopySource, metadata: Readonly<Record<string, unknown>>, layouts: readonly string[]): Promise<EmbeddedTheme | null>;
    vaultId(): string;
    write(context: Context, encoded: string): Promise<void>;
}

export type SlideCopyResult =
    | { kind: 'copied'; token: string; source: CopySource; encoded: string }
    | { kind: 'canceled' | 'unavailable' | 'changed' | 'newer' }
    | { kind: 'failed'; error: unknown };

/** Latest intent wins preparation; clipboard writes finish in their requested order. */
export class SlideCopy<Context> {
    private readonly host: SlideCopyHost<Context>;
    private revision = 0;
    private running = true;
    private writes: Promise<void> = Promise.resolve();

    constructor(host: SlideCopyHost<Context>) {
        this.host = host;
    }
    stop(): void {
        this.running = false;
        this.revision++;
    }

    async copy(context: Context, ids: Iterable<string>): Promise<SlideCopyResult> {
        const revision = ++this.revision;
        const selected = [...ids];
        const current = () => this.running && revision === this.revision && this.host.current(context);
        try {
            if (!current()) return { kind: 'canceled' };
            const source = await this.host.read(context);
            if (!current()) return { kind: 'canceled' };
            const metadata = source && readJsonObject(source.companion);
            if (!source || !metadata) return { kind: 'unavailable' };
            // A newer minor may hold keys the destination's version doesn't have, which the MarkdownPoint app would refuse there
            if (!readsFormatFully(metadata.markdownpoint)) return { kind: 'newer' };
            const captured = captureSlides(source.markdown, source.index, source.companion, selected);
            if (!captured) return { kind: 'unavailable' };
            const layouts = new Set<string>();
            for (const part of captured.slides) {
                const record = readJsonObject(part.record);
                if (typeof record?.layout !== 'string') return { kind: 'unavailable' };
                layouts.add(record.layout);
            }
            const theme = await this.host.theme(source, metadata, [...layouts]);
            if (!current()) return { kind: 'canceled' };
            if (!theme) return { kind: 'unavailable' };
            const token = crypto.randomUUID();
            const encoded = encodeSlideClipboard(
                token,
                { vault: this.host.vaultId(), path: source.path, document: source.documentId },
                captured,
                theme
            );
            if (encoded === null) return { kind: 'unavailable' };
            const write = this.writes.then(async (): Promise<SlideCopyResult> => {
                if (!current()) return { kind: 'canceled' };
                // Recheck after waiting for another write, not before joining its queue.
                const latest = await this.host.read(context);
                if (!current()) return { kind: 'canceled' };
                if (
                    !latest ||
                    latest.path !== source.path ||
                    latest.documentId !== source.documentId ||
                    latest.markdown !== source.markdown ||
                    latest.companion !== source.companion
                )
                    return { kind: 'changed' };
                await this.host.write(context, encoded);
                return current() ? { kind: 'copied', token, source, encoded } : { kind: 'canceled' };
            });
            this.writes = write.then(
                () => undefined,
                () => undefined
            );
            return await write;
        } catch (error) {
            return current() ? { kind: 'failed', error } : { kind: 'canceled' };
        }
    }
}
