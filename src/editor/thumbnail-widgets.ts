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

import { ViewPlugin } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { setIcon, setTooltip } from 'obsidian';
import type { SlideStructure } from '../format/structure.ts';
import type { SlideImagePreview } from '../presentation/image-reader.ts';
import { knownOrientation, readPictureOrientation } from '../presentation/picture-orientation.ts';
import { renderThumbnail } from '../outline/thumbnail.ts';
import { imageSpacing, imageSpaceNeeded, setImageSpacing } from './image-spacing.ts';
import { uiText } from '../ui-text.ts';

interface SlideChrome {
    readonly structure: SlideStructure | null;
    readonly images: readonly SlideImagePreview[];
}
export interface SlideThumbnailState {
    readonly id: string | null;
    readonly slides: ReadonlyMap<string, SlideChrome>;
}

/** Measured editor chrome shares the scroll container without changing authored Markdown. */
export function slideThumbnails(readState: (view: EditorView) => SlideThumbnailState) {
    return ViewPlugin.define(view => {
        const host = view.scrollDOM.createDiv({ cls: 'markdownpoint-slide-tools-layer' });
        const columns = new Map<string, HTMLElement>();
        let active = true;
        let pendingSpacing = false;
        const measure = () =>
            view.requestMeasure({
                key: host,
                read: () => {
                    const available = readState(view);
                    const bounds = host.getBoundingClientRect();
                    const content = view.contentDOM.getBoundingClientRect();
                    const ends = new Map(
                        [...view.contentDOM.querySelectorAll<HTMLElement>('.markdownpoint-slide-image-space[data-slide-end]')].map(
                            element => [element.dataset.slideEnd!, element]
                        )
                    );
                    const current = view.state.field(imageSpacing);
                    const heights = new Map(current.presentationId === available.id ? current.heights : []);
                    for (const id of heights.keys()) if (!available.slides.get(id)?.images.length) heights.delete(id);
                    const items: { id: string; chrome: SlideChrome; top: number; right: number }[] = [];
                    for (const boundary of view.contentDOM.querySelectorAll<HTMLElement>('.markdownpoint-slide-boundary[data-slide]')) {
                        const id = boundary.dataset.slide!;
                        const chrome = available.slides.get(id);
                        if (!chrome || (!chrome.structure && !chrome.images.length)) continue;
                        let next = boundary.nextElementSibling;
                        while (
                            next &&
                            !next.matches('.markdownpoint-field-header, .markdownpoint-slide-boundary, .markdownpoint-slide-image-space')
                        )
                            next = next.nextElementSibling;
                        const top =
                            (next?.matches('.markdownpoint-field-header')
                                ? next.getBoundingClientRect().top
                                : boundary.getBoundingClientRect().bottom) - bounds.top;
                        const column = columns.get(id);
                        const height = column?.getBoundingClientRect().height ?? 0;
                        items.push({ id, chrome, top, right: bounds.right - content.right });
                        const end = ends.get(id);
                        if (chrome.images.length && column && end) {
                            const space = imageSpaceNeeded(top + bounds.top + height, end.getBoundingClientRect().top);
                            if (space) heights.set(id, space);
                            else heights.delete(id);
                        }
                    }
                    return { items, presentationId: available.id, heights, document: view.state.doc };
                },
                write: ({ items, presentationId, heights, document }) => {
                    if (!active) return;
                    let changed = false;
                    const keep = new Set(items.map(item => item.id));
                    for (const [id, column] of columns)
                        if (!keep.has(id)) {
                            column.remove();
                            columns.delete(id);
                        }
                    for (const { id, chrome, top, right } of items) {
                        let column = columns.get(id);
                        if (!column) {
                            column = host.createDiv({ cls: 'markdownpoint-slide-column', attr: { 'data-slide': id } });
                            columns.set(id, column);
                            const button = column.createEl('button', {
                                cls: 'markdownpoint-slide-tools markdownpoint-thumbnail',
                                attr: { type: 'button', 'data-slide': id, 'aria-label': uiText.slides.actions }
                            });
                            setTooltip(button, uiText.slides.actions);
                            const menu = () => {
                                const bounds = button.getBoundingClientRect();
                                button.dispatchEvent(
                                    new view.dom.ownerDocument.defaultView!.MouseEvent('contextmenu', {
                                        bubbles: true,
                                        cancelable: true,
                                        button: 2,
                                        clientX: bounds.left,
                                        clientY: bounds.top
                                    })
                                );
                            };
                            button.addEventListener('click', event => {
                                event.preventDefault();
                                menu();
                            });
                            button.addEventListener('keydown', event => {
                                if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    menu();
                                }
                            });
                            column.createDiv({ cls: 'markdownpoint-slide-images' });
                            changed = true;
                        }
                        const button = column.querySelector<HTMLButtonElement>('button')!;
                        const before = button.dataset.structure;
                        renderThumbnail(button, chrome.structure);
                        button.toggleClass('is-fallback', !chrome.structure);
                        if (!chrome.structure) {
                            button.removeClass('is-unavailable');
                            if (before !== button.dataset.structure) setIcon(button, 'more-horizontal');
                        }
                        if (before !== button.dataset.structure) changed = true;
                        const images = column.querySelector<HTMLElement>('.markdownpoint-slide-images')!;
                        const key = JSON.stringify(chrome.images.map(image => [image.src, image.name]));
                        if (images.dataset.images !== key) {
                            images.dataset.images = key;
                            images.empty();
                            changed = true;
                            for (const preview of chrome.images) {
                                // The picture drawn from its pixels as stored, turned by the orientation MarkdownPoint
                                // reads, never the browser's: hidden in its box until that is known.
                                const box = images.createSpan({ cls: 'markdownpoint-slide-image' });
                                const image = box.createEl('img', {
                                    attr: {
                                        alt: preview.name || uiText.images.preview,
                                        loading: 'lazy',
                                        decoding: 'async',
                                        draggable: 'false',
                                        crossorigin: 'anonymous'
                                    }
                                });
                                const turn = (orientation: number) => box.setAttribute('data-orientation', String(orientation));
                                const known = knownOrientation(preview.src);
                                if (known !== undefined) turn(known);
                                else
                                    // Lazy pictures mount past the view, so only one that loads is read.
                                    image.addEventListener(
                                        'load',
                                        () =>
                                            void readPictureOrientation(image.win, preview.src, preview.path, preview.size).then(
                                                orientation => turn(orientation ?? 1)
                                            ),
                                        { once: true }
                                    );
                                image.addEventListener(
                                    'error',
                                    () => {
                                        box.remove();
                                        if (active) measure();
                                    },
                                    { once: true }
                                );
                                image.src = preview.src;
                            }
                        }
                        column.toggleClass('has-images', chrome.images.length > 0);
                        column.style.setProperty('--markdownpoint-thumbnail-top', `${top}px`);
                        column.style.setProperty('--markdownpoint-thumbnail-right', `${right}px`);
                    }
                    const previous = view.state.field(imageSpacing);
                    const different =
                        previous.presentationId !== presentationId ||
                        previous.heights.size !== heights.size ||
                        [...heights].some(([id, height]) => previous.heights.get(id) !== height);
                    if (different && !pendingSpacing) {
                        pendingSpacing = true;
                        view.dom.ownerDocument.defaultView!.queueMicrotask(() => {
                            pendingSpacing = false;
                            if (active && view.state.doc === document && readState(view).id === presentationId)
                                view.dispatch({ effects: setImageSpacing.of({ presentationId, heights }) });
                        });
                    }
                    if (changed)
                        view.dom.ownerDocument.defaultView!.queueMicrotask(() => {
                            if (active) measure();
                        });
                }
            });
        view.scrollDOM.addEventListener('scroll', measure, { passive: true });
        measure();
        return {
            update: measure,
            destroy: () => {
                active = false;
                view.scrollDOM.removeEventListener('scroll', measure);
                host.remove();
            }
        };
    });
}
