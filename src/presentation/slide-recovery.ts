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

/** Device-local recovery records, scoped to the desktop vault's absolute path. */
export class SlideRecovery {
  private readonly database: Promise<IDBDatabase>;

  constructor(factory: IDBFactory, vaultPath: string) {
    this.database = new Promise((resolve, reject) => {
      const request = factory.open(`markdownpoint-slide-recovery:${vaultPath}`, 1);
      let blocked = false;
      request.onupgradeneeded = () => { request.result.createObjectStore("recovery"); };
      request.onerror = () => { reject(request.error ?? new Error("Cannot open slide recovery data")); };
      request.onblocked = () => { blocked = true; reject(new Error("Slide recovery data is open in another version")); };
      request.onsuccess = () => {
        const database = request.result;
        if (blocked) { database.close(); return; }
        database.onversionchange = () => { database.close(); };
        resolve(database);
      };
    });
  }

  async read(): Promise<unknown> {
    const database = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("recovery", "readonly");
      const request = transaction.objectStore("recovery").get("slides");
      let value: unknown;
      request.onsuccess = () => { value = request.result; };
      transaction.oncomplete = () => { resolve(value); };
      transaction.onerror = transaction.onabort = () => { reject(transaction.error ?? new Error("Cannot read slide recovery data")); };
    });
  }

  /** Resolve only after IndexedDB commits, before a companion record is removed. */
  async write(value: unknown): Promise<void> {
    const database = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("recovery", "readwrite", { durability: "strict" });
      transaction.objectStore("recovery").put(value, "slides");
      transaction.oncomplete = () => { resolve(); };
      transaction.onerror = transaction.onabort = () => { reject(transaction.error ?? new Error("Cannot save slide recovery data")); };
    });
  }

  close(): void { void this.database.then(database => { database.close(); }).catch(() => undefined); }
}
