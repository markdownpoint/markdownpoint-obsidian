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

import { Menu, Modal, Notice } from 'obsidian';
import type { App } from 'obsidian';
import type { EmbeddedTheme } from '../format/embedded-theme.ts';
import { layoutName, orderedLayouts } from '../format/new-slide.ts';
import { slideStructure } from '../format/structure.ts';
import { renderThumbnail } from '../outline/thumbnail.ts';
import { LAYOUT_DIGITS, layoutDigit } from '../settings/layout-shortcuts.ts';
import type { LayoutAssignments } from '../settings/layout-shortcuts.ts';
import type { SharedSettings } from '../settings/shared.ts';
import { uiText } from '../ui-text.ts';

export class LayoutPicker extends Modal {
    private active = false;
    private assignments: LayoutAssignments = {};
    constructor(
        app: App,
        private readonly theme: EmbeddedTheme,
        private readonly shortcuts: SharedSettings,
        private readonly choose: (key: string) => void
    ) {
        super(app);
    }

    onOpen(): void {
        this.active = true;
        this.assignments = this.shortcuts.layoutShortcuts;
        this.setTitle(uiText.slides.new);
        this.modalEl.addClass('markdownpoint-layout-picker');
        const grid = this.contentEl.createDiv({ cls: 'markdownpoint-layout-grid' });
        const buttons: HTMLButtonElement[] = [];
        for (const key of orderedLayouts(this.theme)) {
            const layout = this.theme.layouts.get(key)!;
            const name = layoutName(key, layout.value);
            const button = grid.createEl('button', {
                cls: 'markdownpoint-layout-choice',
                attr: { type: 'button', 'data-layout': key, 'aria-label': name }
            });
            renderThumbnail(button.createSpan({ cls: 'markdownpoint-thumbnail' }), slideStructure({ layout: key }, this.theme));
            const caption = button.createSpan({ cls: 'markdownpoint-layout-caption' });
            caption.createSpan({ cls: 'markdownpoint-layout-name', text: name });
            caption.createEl('kbd', { cls: 'markdownpoint-layout-shortcut', attr: { 'aria-hidden': 'true' } });
            button.addEventListener('contextmenu', event => {
                event.preventDefault();
                this.shortcutMenu(button, key, event);
            });
            button.addEventListener('keydown', event => {
                if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.shortcutMenu(button, key);
                }
            });
            button.addEventListener('click', () => {
                this.close();
                this.choose(key);
            });
            buttons.push(button);
        }
        grid.addEventListener('keydown', event => {
            if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
            const digit = /^Digit([1-9])$/.exec(event.code)?.[1] ?? (/^[1-9]$/.test(event.key) ? event.key : null);
            if (digit) {
                event.preventDefault();
                event.stopPropagation();
                const key = this.assignments[digit];
                if (key && this.theme.layouts.has(key)) {
                    this.close();
                    this.choose(key);
                }
                return;
            }
            if (event.shiftKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
            const at = buttons.findIndex(button => button === grid.ownerDocument.activeElement);
            if (at < 0) return;
            const columns = buttons.filter(button => button.offsetTop === buttons[0]?.offsetTop).length;
            const index =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? buttons.length - 1
                      : at +
                        (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -columns : columns);
            event.preventDefault();
            buttons[Math.max(0, Math.min(buttons.length - 1, index))]?.focus();
        });
        this.refreshShortcuts();
        this.contentEl.createEl('p', { cls: 'markdownpoint-layout-hint', text: uiText.slides.shortcutHint });
        buttons[0]?.focus();
    }

    private refreshShortcuts(): void {
        for (const button of this.contentEl.querySelectorAll<HTMLButtonElement>('button[data-layout]')) {
            const key = button.dataset.layout!,
                digit = layoutDigit(this.assignments, key);
            const badge = button.querySelector<HTMLElement>('.markdownpoint-layout-shortcut')!;
            badge.setText(digit ?? '');
            badge.toggleClass('is-unassigned', digit === null);
            button.setAttribute(
                'aria-label',
                uiText.slides.layoutShortcutLabel({ name: layoutName(key, this.theme.layouts.get(key)!.value), digit })
            );
        }
    }

    private shortcutMenu(button: HTMLButtonElement, key: string, event?: MouseEvent): void {
        const menu = new Menu(),
            selected = layoutDigit(this.assignments, key);
        const assign = (digit: string | null) => {
            if (!this.active) return;
            menu.hide();
            void this.shortcuts
                .assign(key, digit)
                .then(() => {
                    if (this.active) {
                        this.assignments = this.shortcuts.layoutShortcuts;
                        this.refreshShortcuts();
                    }
                })
                .catch((error: unknown) => {
                    console.error(error);
                    new Notice(uiText.slides.shortcutFailed);
                });
        };
        const choices = (target: Menu) => {
            for (const digit of LAYOUT_DIGITS)
                target.addItem(item =>
                    item
                        .setTitle(digit)
                        .setChecked(selected === digit)
                        .onClick(() => assign(digit))
                );
            target.addSeparator();
            target.addItem(item =>
                item
                    .setTitle(uiText.slides.noShortcut)
                    .setChecked(selected === null)
                    .onClick(() => assign(null))
            );
        };
        menu.addItem(item => {
            item.setTitle(uiText.slides.shortcut).setIcon('keyboard');
            // Obsidian 1.13's own menus use this capability; it is not in its public declarations.
            const factory: unknown = Reflect.get(item, 'setSubmenu');
            const child: unknown = typeof factory === 'function' ? Reflect.apply(factory, item, []) : null;
            if (child instanceof Menu) choices(child);
            else
                item.onClick(() => {
                    const fallback = new Menu();
                    choices(fallback);
                    const bounds = button.getBoundingClientRect();
                    fallback.showAtPosition({ x: bounds.left, y: bounds.bottom }, button.ownerDocument);
                });
        });
        menu.onHide(() => {
            if (this.active && button.isConnected) button.focus({ preventScroll: true });
        });
        if (event) menu.showAtMouseEvent(event);
        else {
            const bounds = button.getBoundingClientRect();
            menu.showAtPosition({ x: bounds.left, y: bounds.bottom }, button.ownerDocument);
        }
    }

    onClose(): void {
        this.active = false;
        this.contentEl.empty();
    }
}
