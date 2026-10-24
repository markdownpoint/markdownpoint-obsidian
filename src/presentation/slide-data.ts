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

import { CompanionDocument, isSlideRecordSource, reconcileSlideRecords } from "../format/companion.ts";
import { isDocumentId, isRecord, isStableId, presentationCompanionPath, presentationIdentity } from "../format/recognition.ts";
export interface SlideDataHost {
  loadRecovery(): Promise<unknown>;
  saveRecovery(data: unknown): Promise<void>;
  process(path: string, update: (source: string) => Promise<string>, canCommit: () => boolean): Promise<void>;
  failed(path: string, error: unknown): void;
}

interface SavedSlides {
  path: string;
  readonly document: string;
  records: ReadonlyMap<string, string>;
  present: ReadonlySet<string> | null;
  source: string | null;
  dirty: boolean;
  saving: Promise<void> | null;
}

const empty: ReadonlyMap<string, string> = new Map();
const sameMembers = (first: ReadonlySet<string> | null, second: ReadonlySet<string>) =>
  first !== null && first.size === second.size && [...second].every(id => first.has(id));

/** Local complete records make native text undo recoverable, including after a tab closes. */
export class SlideData {
  private readonly entries = new Map<string, SavedSlides>();
  private readonly host: SlideDataHost;
  private running = true;
  readonly ready: Promise<void>;

  constructor(host: SlideDataHost) {
    this.host = host;
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    const stored = await this.host.loadRecovery();
    if (!Array.isArray(stored)) return;
    for (const value of stored) {
      if (!isRecord(value) || typeof value.path !== "string" || !presentationCompanionPath(value.path) ||
        !isDocumentId(value.document) || !isRecord(value.records)) continue;
      const records = new Map<string, string>();
      for (const [id, raw] of Object.entries(value.records)) {
        if (!isStableId(id) || typeof raw !== "string" || !isSlideRecordSource(raw)) continue;
        records.set(id, raw);
      }
      if (records.size) this.entries.set(this.key(value.path, value.document), {
        path: value.path, document: value.document, records, present: null, source: null, dirty: false, saving: null,
      });
    }
  }

  stop(): void { this.running = false; }

  remembered(path: string, document: string): ReadonlyMap<string, string> {
    return this.entries.get(this.key(path, document))?.records ?? empty;
  }

  /** Save complete current records before any native transaction removes their text. */
  async remember(path: string, document: string, companion: string, ids: Iterable<string>): Promise<boolean> {
    await this.ready;
    if (!this.running || !presentationCompanionPath(path) || !this.matches(companion, document)) return false;
    const data = CompanionDocument.read(companion);
    const selected = new Set(ids);
    if (!data || !selected.size || [...selected].some(id => !data.records.has(id))) return false;
    const key = this.key(path, document);
    const entry = this.entries.get(key) ?? { path, document, records: empty, present: null, source: null, dirty: false, saving: null };
    entry.records = new Map([...entry.records, ...[...selected].map(id => [id, data.records.get(id)!] as const)]);
    this.entries.set(key, entry);
    await this.persist();
    return true;
  }

  /** Ordinary typing with the same membership does no companion work. */
  observe(path: string, document: string, companion: string, present: ReadonlySet<string>): void {
    const entry = this.entries.get(this.key(path, document));
    if (!this.running || !entry || (entry.source === companion && sameMembers(entry.present, present)) || !this.matches(companion, document)) return;
    const next = reconcileSlideRecords(companion, entry.records, present);
    if (!next) return;
    entry.source = companion;
    const membershipChanged = !sameMembers(entry.present, present);
    entry.present = new Set(present);
    // Observed snapshots can precede an in-flight write. Only the atomic disk
    // callback replaces a recovery record with newer external contents.
    if (next.companion !== companion || (entry.saving && membershipChanged)) {
      entry.dirty = true;
      this.save(entry);
    }
  }

  retry(path: string, document: string): void {
    const entry = this.entries.get(this.key(path, document));
    if (entry?.present) { entry.dirty = true; this.save(entry); }
  }

  async settled(path: string, document: string): Promise<void> {
    const entry = this.entries.get(this.key(path, document));
    while (entry?.saving) await entry.saving;
  }

  async rename(from: string, to: string): Promise<void> {
    await this.ready;
    if (!this.running) return;
    let changed = false;
    for (const [key, entry] of [...this.entries]) {
      if (entry.path !== from && !entry.path.startsWith(from + "/")) continue;
      this.entries.delete(key);
      entry.path = to + entry.path.slice(from.length);
      this.entries.set(this.key(entry.path, entry.document), entry);
      changed = true;
    }
    if (changed) await this.persist();
  }

  private save(entry: SavedSlides): void {
    if (!this.running || entry.saving || !entry.present) return;
    // Assign before starting, including when a host completes its callback synchronously.
    let failed = false;
    entry.saving = Promise.resolve().then(async () => {
      while (this.running && entry.dirty && entry.present) {
        entry.dirty = false;
        const path = presentationCompanionPath(entry.path);
        if (!path) return;
        await this.host.process(path, async source => {
          if (!this.running || !entry.present) return source;
          if (!this.matches(source, entry.document)) throw new Error("Presentation identity changed before saving slide data");
          const next = reconcileSlideRecords(source, entry.records, entry.present);
          if (!next) throw new Error("Cannot update malformed presentation data");
          // Capture newer external record contents before removing them from disk.
          entry.records = next.remembered;
          // The backup transaction must complete before the companion is changed.
          // This also retries a prior failure after updating the in-memory copy.
          if (next.companion !== source) await this.persist();
          return this.running ? next.companion : source;
        }, () => this.running);
      }
    }).catch((error: unknown) => {
      failed = true;
      entry.dirty = true;
      if (this.running) this.host.failed(entry.path, error);
    }).finally(() => {
      entry.saving = null;
      if (entry.dirty && !failed) this.save(entry);
    });
  }

  private persist(): Promise<void> {
    return this.host.saveRecovery([...this.entries.values()].map(entry => ({
      path: entry.path, document: entry.document, records: Object.fromEntries(entry.records),
    })));
  }

  private matches(source: string, document: string): boolean {
    try { return presentationIdentity({ markdownpoint: 1, document }, JSON.parse(source)) === document; }
    catch { return false; }
  }

  private key(path: string, document: string): string { return JSON.stringify([path, document]); }
}
