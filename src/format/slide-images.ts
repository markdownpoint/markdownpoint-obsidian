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

import type { EmbeddedTheme } from './embedded-theme.ts';
import { isRecord, presentationCompanionPath } from './recognition.ts';

export interface SlideImageReference {
    readonly path: string;
    readonly name: string | null;
    readonly category: 'background' | 'placeholder' | 'image';
}
interface Ancestor {
    readonly source: string;
    readonly parent: Ancestor | null;
}
interface ImageObject {
    raw: Record<string, unknown>;
    asset: unknown;
    scope: string;
    placeholder: boolean;
}
const imageExtension = /\.(?:png|apng|jpe?g|gif|webp|svg|avif|bmp)$/i;

function imagePath(value: unknown, scope: string, presentation: boolean): string | null {
    if (
        typeof value !== 'string' ||
        !imageExtension.test(value) ||
        value.includes('\\') ||
        value.includes(':') ||
        [...value].some(character => character.charCodeAt(0) < 32)
    )
        return null;
    const parts = value.split('/');
    if (parts.some(part => !part || part === '.' || part === '..') || (presentation && !['media', 'generated'].includes(parts[0]!)))
        return null;
    return scope + value;
}

/** List assigned pictures, not generation history or unused composition defaults. */
export function assignedSlideImages(
    markdownPath: string,
    companion: unknown,
    slideId: string,
    theme: EmbeddedTheme | null
): readonly SlideImageReference[] {
    if (!presentationCompanionPath(markdownPath) || !isRecord(companion) || !isRecord(companion.slides)) return [];
    const slide = companion.slides[slideId];
    if (!isRecord(slide)) return [];
    const root = markdownPath.slice(0, markdownPath.lastIndexOf('/') + 1);
    const layout = theme && typeof slide.layout === 'string' ? theme.layouts.get(slide.layout)?.value : undefined;
    const scheme = typeof slide.scheme === 'string' ? slide.scheme : typeof layout?.scheme === 'string' ? layout.scheme : 'light';
    const schemes = theme?.master.value.schemes;
    const definition = isRecord(schemes) ? schemes[scheme] : undefined;
    const appearance = isRecord(definition) && definition.appearance === 'dark' ? 'dark' : scheme === 'dark' ? 'dark' : 'light';
    const picture = (value: unknown) => (isRecord(value) ? (value[scheme] ?? value[appearance] ?? value.light) : value);
    const objects = new Map<string, ImageObject>();
    const addLevel = (level: Record<string, unknown>, scope: string, inherited: boolean) => {
        const held = new Set(objects.keys());
        if (isRecord(level.overrides))
            for (const [id, override] of Object.entries(level.overrides)) {
                const current = objects.get(id);
                if (!current) continue;
                if (override === null) objects.delete(id);
                else if (isRecord(override)) {
                    const asset = picture(override.asset);
                    const replacement = typeof asset === 'string';
                    objects.set(id, {
                        ...current,
                        raw: { ...current.raw, ...override, type: current.raw.type },
                        ...(replacement ? { asset, scope } : {})
                    });
                }
            }
        if (Array.isArray(level.objects))
            for (const object of level.objects) {
                if (!isRecord(object) || typeof object.id !== 'string' || held.has(object.id)) continue;
                objects.set(object.id, {
                    raw: object,
                    scope,
                    placeholder: inherited && object.placeholder === true,
                    asset: inherited && object.placeholder === true ? undefined : picture(object.asset)
                });
            }
    };
    if (theme) {
        addLevel(theme.master.value, theme.root + '/', true);
        if (layout) addLevel(layout, theme.root + '/', true);
    }
    addLevel(slide, root, false);
    const references: SlideImageReference[] = [];
    const ownBackground = isRecord(slide.background) ? slide.background.image : undefined;
    const background =
        ownBackground !== undefined ? ownBackground : isRecord(companion.background) ? companion.background.image : undefined;
    const backgroundPath = imagePath(background, root, true);
    if (backgroundPath) references.push({ path: backgroundPath, name: null, category: 'background' });
    const pending = [...objects.values()].map(object => ({ object, parent: null as Ancestor | null }));
    const expanded = new Set<string>();
    for (let index = 0; index < pending.length; index++) {
        const { object, parent } = pending[index]!;
        const raw = object.raw;
        if (raw.type === 'image' || raw.type === 'video') {
            const path = imagePath(object.asset, object.scope, object.scope === root);
            if (path)
                references.push({
                    path,
                    name: typeof raw.alt === 'string' ? raw.alt : typeof raw.name === 'string' ? raw.name : null,
                    category: object.placeholder ? 'placeholder' : 'image'
                });
        }
        if (raw.type !== 'composition' || typeof raw.source !== 'string' || !isRecord(companion.compositions)) continue;
        let cycle = false;
        for (let ancestor = parent; ancestor; ancestor = ancestor.parent)
            if (ancestor.source === raw.source) {
                cycle = true;
                break;
            }
        if (cycle) continue;
        const composition = companion.compositions[raw.source];
        if (!isRecord(composition) || !Array.isArray(composition.objects)) continue;
        const controls = isRecord(composition.controls) ? composition.controls : {};
        const values = isRecord(raw.controls) ? raw.controls : {};
        const instance = JSON.stringify([raw.source, values]);
        if (expanded.has(instance)) continue;
        expanded.add(instance);
        for (const member of composition.objects) {
            if (!isRecord(member)) continue;
            const binding = isRecord(member.bind) && typeof member.bind.asset === 'string' ? member.bind.asset : null;
            const control = binding ? controls[binding] : undefined;
            const bound = binding !== null && isRecord(control) && control.type === 'media';
            const asset = bound ? (values[binding] ?? control.default) : member.asset;
            pending.push({ object: { raw: member, scope: root, asset, placeholder: bound }, parent: { source: raw.source, parent } });
        }
    }
    const rank = { background: 0, placeholder: 1, image: 2 };
    const seen = new Set<string>();
    return references
        .sort((a, b) => rank[a.category] - rank[b.category])
        .filter(reference => {
            if (seen.has(reference.path)) return false;
            seen.add(reference.path);
            return true;
        });
}
