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

export interface TextBindingName {
    readonly name: string;
    readonly number: string | null;
}

/** A text object's readable name, or a composition instance's control name. */
export function textBindingName(binding: string): TextBindingName {
    const parts = binding.slice(binding.lastIndexOf('.') + 1).split('-');
    // Only MDP's explicit allocation spelling is technical: id- plus a letter
    // and five letters/digits. A similarly sized authored word stays intact.
    if (parts.at(-2) === 'id' && /^[a-z][a-z0-9]{5}$/.test(parts.at(-1) ?? '')) parts.splice(-2);
    const number = parts.length > 1 && /^\d+$/.test(parts.at(-1)!) ? parts.pop()! : null;
    return { name: parts.join('-') || 'text', number };
}

export interface TextFieldLabels {
    readonly names: Readonly<Record<string, string>>;
    readonly text: string;
    readonly numbered: (values: { name: string; number: string }) => string;
}

/** Known field types are translated; custom authored names keep their own words. */
export function textBindingLabel(binding: TextBindingName, labels: TextFieldLabels): string {
    const authored = binding.name.replaceAll('-', ' ');
    const name =
        binding.name === 'text'
            ? labels.text
            : Object.hasOwn(labels.names, binding.name)
              ? labels.names[binding.name]!
              : authored.charAt(0).toUpperCase() + authored.slice(1);
    return binding.number === null ? name : labels.numbered({ name, number: binding.number });
}
