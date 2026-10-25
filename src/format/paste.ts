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

import type { CapturedPart, CapturedSlides } from './capture.ts';
import type { SlideClipboard, ClipboardOrigin } from './clipboard.ts';
import { CompanionDocument } from './companion.ts';
import { prepareSlideCopies } from './copy.ts';
import type { PresentationDocument } from './document.ts';
import type { EmbeddedTheme } from './embedded-theme.ts';
import { presentationCompanionPath } from './recognition.ts';

export function sameClipboardPresentation(packet: SlideClipboard, origin: ClipboardOrigin): boolean {
    return (
        packet.origin.vault === origin.vault &&
        packet.origin.document === origin.document &&
        presentationCompanionPath(packet.origin.path) === presentationCompanionPath(origin.path)
    );
}

export function sameClipboardTheme(packet: SlideClipboard, theme: EmbeddedTheme): boolean {
    return (
        packet.theme.id === theme.id &&
        packet.theme.master.source === theme.master.source &&
        [...packet.theme.layouts].every(([key, layout]) => theme.layouts.get(key)?.source === layout.source)
    );
}

/** Gather the destination's exact reusable definitions and every reserved identity. */
export function prepareClipboardPaste(
    packet: SlideClipboard,
    markdown: string,
    document: PresentationDocument,
    companion: string,
    remembered: ReadonlyMap<string, string>,
    mint: () => string,
    restoreCut = false
): CapturedSlides | null {
    const slides = CompanionDocument.read(companion);
    const definitions = CompanionDocument.ensure(companion, 'compositions');
    if (!slides || !definitions) return null;
    const held: CapturedPart[] = [];
    for (const part of document.compositions) {
        const record = definitions.records.get(part.id);
        if (record === undefined) return null;
        held.push({ id: part.id, markdown: markdown.slice(part.from, part.to), record });
    }
    const occupied = new Set([
        ...slides.records.keys(),
        ...definitions.records.keys(),
        ...remembered.keys(),
        ...document.slides.map(part => part.id),
        ...document.compositions.map(part => part.id)
    ]);
    const standing = new Set([...document.slides, ...document.compositions].map(part => part.id));
    const preserve =
        restoreCut &&
        packet.captured.slides.every(
            part =>
                !standing.has(part.id) &&
                !definitions.records.has(part.id) &&
                (slides.records.get(part.id) === undefined || slides.records.get(part.id) === part.record) &&
                (remembered.get(part.id) === undefined || remembered.get(part.id) === part.record)
        );
    if (preserve) for (const part of packet.captured.slides) occupied.delete(part.id);
    return prepareSlideCopies(packet.captured, held, occupied, packet.schemas, mint, preserve);
}
