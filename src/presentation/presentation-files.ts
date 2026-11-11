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

import { TFile } from 'obsidian';
import type { TFolder, Vault } from 'obsidian';
import { inSavedVersions, presentationMember, presentationPairNames } from '../format/recognition.ts';

/**
 * Resolve both files from the live folder inventory for readers and the last write guard. A pair under a presentation's
 * `versions/` has none, as the app opens it only from its presentation, and neither has one inside another
 * presentation's folder: its `slides.md` opens as a note.
 */
export function presentationFiles(vault: Vault, memberPath: string): { markdown: TFile; companion: TFile } | null {
    const found = pairAt(vault, memberPath);
    return found && 'pair' in found ? found.pair : null;
}

/** The outermost presentation around the pair `memberPath` names, which keeps it from opening as a presentation; null when none does. */
export function presentationAround(vault: Vault, memberPath: string): TFolder | null {
    const found = pairAt(vault, memberPath);
    return found && 'around' in found ? found.around : null;
}

function pairAt(vault: Vault, memberPath: string): { pair: { markdown: TFile; companion: TFile } } | { around: TFolder } | null {
    if (inSavedVersions(memberPath, path => holdsPresentationFile(vault, path), caselessVaults.has(vault))) return null;
    const slash = memberPath.lastIndexOf('/');
    const folder = slash < 0 ? vault.getRoot() : vault.getFolderByPath(memberPath.slice(0, slash));
    if (!folder) return null;
    const files = folder.children.filter((entry): entry is TFile => entry instanceof TFile);
    const names = presentationPairNames(files.map(file => file.name));
    if (!names) return null;
    const around = folder.parent && enclosingPresentation(folder.parent);
    if (around) return { around };
    return {
        pair: { markdown: files.find(file => file.name === names.markdown)!, companion: files.find(file => file.name === names.companion)! }
    };
}

/**
 * The outermost folder at or above `folder` that holds a whole presentation, its `presentation.mdpoint` and `slides.md`
 * by name in any case, as MarkdownPoint finds one; null when none does. A presentation's folder holds one presentation,
 * so none opens or is made inside another, and a lone presentation file makes no folder one.
 */
export function enclosingPresentation(folder: TFolder): TFolder | null {
    let outermost: TFolder | null = null;
    for (let at: TFolder | null = folder; at; at = at.parent) {
        let companion = false;
        let markdown = false;
        for (const entry of at.children) {
            if (!(entry instanceof TFile)) continue;
            const name = entry.name.toLowerCase();
            if (name === 'presentation.mdpoint') companion = true;
            else if (name === 'slides.md') markdown = true;
        }
        if (companion && markdown) outermost = at;
    }
    return outermost;
}

/** The vaults whose volume finds a name in another case, and each vault's one look at it. */
const caselessVaults = new WeakSet<Vault>();
const vaultCases = new WeakMap<Vault, Promise<void>>();

/**
 * Learns, once a vault, whether its volume finds a name in another case: the plugins folder of its config folder, where
 * this plugin stands, spelled so is found, though no folder is spelled so. A reader awaits it before it takes a pair, so
 * `presentationFiles` answers with it.
 */
export function learnVaultCase(vault: Vault): Promise<void> {
    let learned = vaultCases.get(vault);
    if (!learned) {
        const known = `${vault.configDir}/plugins`;
        const other = [...known].map(letter => (letter === letter.toLowerCase() ? letter.toUpperCase() : letter.toLowerCase())).join('');
        learned = (async () => {
            if (other !== known && (await vault.adapter.exists(other)) && !(await vault.adapter.exists(other, true)))
                caselessVaults.add(vault);
        })().catch((error: unknown) => console.error(error));
        vaultCases.set(vault, learned);
    }
    return learned;
}

/** Whether the vault's folder at `path`, the root at '', holds a presentation file, under any name a sync or a copy gives it. */
function holdsPresentationFile(vault: Vault, path: string): boolean {
    const folder = path ? vault.getFolderByPath(path) : vault.getRoot();
    return !!folder?.children.some(entry => entry instanceof TFile && presentationMember(entry.name) === 'companion');
}
