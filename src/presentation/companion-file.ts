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

interface CompanionVault<File> {
  getPair(path: string): { readonly markdown: File; readonly companion: File } | null;
  read(file: File): Promise<string>;
  process(file: File, update: (source: string) => string): Promise<string>;
}

/** Prepare durable recovery data, then commit only against the source it was read from. */
export async function processCompanion<File>(vault: CompanionVault<File>, path: string, update: (source: string) => Promise<string>, canCommit: () => boolean = () => true): Promise<void> {
  const pair = vault.getPair(path);
  if (!pair) throw new Error("Presentation files are missing or ambiguous");
  const file = pair.companion;
  const samePair = () => {
    const current = vault.getPair(path);
    return current !== null && current.markdown === pair.markdown && current.companion === file;
  };
  const changed = new Error("Presentation data changed while preparing its update");
  const canceled = new Error("Presentation data update canceled");
  const moved = new Error("Presentation files changed while preparing their update");
  for (;;) {
    if (!samePair()) throw moved;
    const before = await vault.read(file);
    const after = await update(before);
    if (after === before) return;
    try {
      await vault.process(file, current => {
        // Vault.process may wait for other work and read the file asynchronously.
        // This is the last synchronous boundary before its actual write.
        if (!canCommit()) throw canceled;
        if (!samePair()) throw moved;
        if (current !== before) throw changed;
        return after;
      });
      return;
    } catch (error) {
      if (error === canceled) return;
      if (error !== changed) throw error;
      // Re-read only after an actual concurrent change; this is not a poll.
    }
  }
}
