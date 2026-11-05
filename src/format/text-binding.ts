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

import { ALLOCATED_TAIL } from './id-allocation.ts';

export interface TextBindingName {
    readonly name: string;
    readonly number: string | null;
    /** The name is a composition control's: the author's words, shown as written. */
    readonly control: boolean;
}

/** A text object's readable name, or a composition instance's control name. */
export function textBindingName(binding: string): TextBindingName {
    // An instance's text control is `instance.control`: after the first dot, the control's name, dots included.
    const dot = binding.indexOf('.');
    if (dot >= 0) return { name: binding.slice(dot + 1), number: null, control: true };
    const parts = binding.split('-');
    // Only the MarkdownPoint app's explicit allocation spelling is technical: id- plus a letter
    // and five letters/digits. A similarly sized authored word stays intact.
    if (parts.at(-2) === 'id' && ALLOCATED_TAIL.test(parts.at(-1) ?? '')) parts.splice(-2);
    const number = parts.length > 1 && /^\d+$/.test(parts.at(-1)!) ? parts.pop()! : null;
    return { name: parts.join('-') || 'text', number, control: false };
}

export interface TextFieldLabels {
    readonly names: Readonly<Record<string, string>>;
    readonly text: string;
    readonly numbered: (values: { name: string; number: string }) => string;
}

/** Known field types are translated; custom authored names and a control's name keep their own words. */
export function textBindingLabel(binding: TextBindingName, labels: TextFieldLabels): string {
    if (binding.control) return binding.name;
    const authored = binding.name.replaceAll('-', ' ');
    const name =
        binding.name === 'text'
            ? labels.text
            : Object.hasOwn(labels.names, binding.name)
              ? labels.names[binding.name]!
              : authored.charAt(0).toUpperCase() + authored.slice(1);
    return binding.number === null ? name : labels.numbered({ name, number: binding.number });
}
