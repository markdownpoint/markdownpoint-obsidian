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

import type { EditorState, Extension, Range } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { MarkdownPostProcessorContext, Vault } from 'obsidian';
import type { PresentationDocument } from '../format/document.ts';
import { markdownWords } from '../format/link-tokens.ts';
import { readsAsPresentation } from '../presentation/reader.ts';
import { fieldGroups } from '../format/groups.ts';
import type { WordGroup } from '../format/groups.ts';

const hiddenMark = Decoration.replace({});
const groupWords = Decoration.mark({ class: 'markdownpoint-group' });

/** Every stretch of a presentation's source that holds words: text, notes, controls and section headings. */
function wordFields(document: PresentationDocument): { from: number; to: number }[] {
    const fields = [...document.slides, ...document.compositions].flatMap(part =>
        part.blocks.map(block => ({ from: block.contentFrom, to: block.to }))
    );
    fields.push(...document.sections.map(section => ({ from: section.markerTo, to: section.to })));
    return fields;
}

/** The groups of a presentation's source, read again only for fields whose words changed. */
export class GroupIndex {
    private known = new Map<string, readonly WordGroup[]>();

    read(state: EditorState, document: PresentationDocument): WordGroup[] {
        const next = new Map<string, readonly WordGroup[]>();
        const groups: WordGroup[] = [];
        for (const field of wordFields(document)) {
            const source = state.doc.sliceString(field.from, field.to);
            if (!source.includes(']{}')) continue;
            const found = next.get(source) ?? this.known.get(source) ?? fieldGroups(source);
            next.set(source, found);
            for (const group of found)
                groups.push({
                    from: field.from + group.from,
                    to: field.from + group.to,
                    wordsFrom: field.from + group.wordsFrom,
                    wordsTo: field.from + group.wordsTo
                });
        }
        this.known = next;
        return groups.sort((a, b) => a.from - b.from);
    }
}

/**
 * Hide each group's brackets, braces and enclosing delimiters, so its word reads as styled words. A selection on any
 * group of a word shows the whole word's source, as Obsidian shows its own marks where the caret is.
 */
export function groupDecorations(state: EditorState, groups: readonly WordGroup[]): { hidden: DecorationSet; words: DecorationSet } {
    const hidden: Range<Decoration>[] = [];
    const words: Range<Decoration>[] = [];
    for (let first = 0; first < groups.length;) {
        let last = first;
        while (last + 1 < groups.length && groups[last + 1]!.from === groups[last]!.to) last++;
        const from = groups[first]!.from;
        const to = groups[last]!.to;
        if (!state.selection.ranges.some(range => range.from <= to && range.to >= from))
            for (const group of groups.slice(first, last + 1)) {
                hidden.push(hiddenMark.range(group.from, group.wordsFrom), hiddenMark.range(group.wordsTo, group.to));
                words.push(groupWords.range(group.wordsFrom, group.wordsTo));
            }
        first = last + 1;
    }
    // A group inside another closes before the outer one does.
    return { hidden: Decoration.set(hidden, true), words: Decoration.set(words, true) };
}

/** Live Preview's group marks, for the presentation `document` reads from the editor's state. */
export function groupMarks(document: (state: EditorState) => PresentationDocument | null): Extension {
    const plugin = ViewPlugin.fromClass(
        class {
            hidden: DecorationSet = Decoration.none;
            words: DecorationSet = Decoration.none;
            private readonly index = new GroupIndex();
            private document: PresentationDocument | null = null;
            private groups: readonly WordGroup[] = [];

            constructor(view: EditorView) {
                this.refresh(view.state, true);
            }

            update(update: ViewUpdate): void {
                const reread = update.docChanged || document(update.state) !== this.document;
                if (reread || update.selectionSet) this.refresh(update.state, reread);
            }

            private refresh(state: EditorState, reread: boolean): void {
                if (reread) {
                    this.document = document(state);
                    this.groups = this.document ? this.index.read(state, this.document) : [];
                }
                ({ hidden: this.hidden, words: this.words } = groupDecorations(state, this.groups));
            }
        },
        {
            decorations: value => value.hidden,
            // Outside every other mark, so the words' own highlighting, such as Obsidian's link color, sits inside it.
            provide: plugin => EditorView.outerDecorations.of(view => view.plugin(plugin)?.words ?? Decoration.none)
        }
    );
    return plugin;
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

interface RenderedPlace {
    readonly node: Text;
    readonly at: number;
    /** Where it stands in the rendered words. */
    readonly position: number;
}

/**
 * Take a group's `[` and `]{}` out of the words reading view rendered from `source`, Obsidian having read them as plain
 * characters: only when the words then read as the source's own do, whichever brackets the rendering pairs. Otherwise
 * the words keep every character.
 */
export function hideRenderedGroups(element: HTMLElement, source: string): void {
    const count = fieldGroups(source).length;
    if (!count) return;
    let words = '';
    const opened: RenderedPlace[] = [];
    const removals: (RenderedPlace & { readonly length: number })[] = [];
    const visit = (node: Node, code: boolean): void => {
        if (node.nodeType === TEXT_NODE) {
            const text = node as Text;
            for (let at = 0; !code && at < text.data.length; at++) {
                if (text.data[at] === '[') opened.push({ node: text, at, position: words.length + at });
                else if (text.data[at] === ']' && opened.length) {
                    const open = opened.pop()!;
                    if (!text.data.startsWith(']{}', at)) continue;
                    removals.push({ ...open, length: 1 }, { node: text, at, position: words.length + at, length: 3 });
                    at += 2;
                }
            }
            words += text.data;
        }
        const inCode = code || (node.nodeType === ELEMENT_NODE && (node.nodeName === 'CODE' || node.nodeName === 'PRE'));
        node.childNodes.forEach(child => visit(child, inCode));
    };
    visit(element, false);
    if (removals.length !== count * 2) return;
    // From the end, so an earlier offset in the same text stays where it was.
    removals.sort((a, b) => b.position - a.position);
    let shown = words;
    for (const removal of removals) shown = shown.slice(0, removal.position) + shown.slice(removal.position + removal.length);
    const bare = (text: string) => text.replace(/\s+/g, '');
    if (bare(shown) !== bare(markdownWords(source))) return;
    for (const removal of removals) removal.node.deleteData(removal.at, removal.length);
}

/** Lines `first` to `last` of `text`, as a section's source. */
function sourceLines(text: string, first: number, last: number): string {
    let from = 0;
    for (let line = 0; line < first; line++) {
        const next = text.indexOf('\n', from);
        if (next < 0) return '';
        from = next + 1;
    }
    let to = from;
    for (let line = first; line <= last && to < text.length; line++) {
        const next = text.indexOf('\n', to);
        to = next < 0 ? text.length : next + 1;
    }
    return text.slice(from, to).replace(/\r\n?/g, '\n');
}

/** Reading view of a presentation's slides.md shows a group's words without the marks it renders as characters. */
export async function hideReadingGroups(vault: Vault, element: HTMLElement, context: MarkdownPostProcessorContext): Promise<void> {
    if (!element.textContent?.includes(']{}')) return;
    const section = context.getSectionInfo(element);
    if (!section || !(await readsAsPresentation(vault, context.sourcePath, section.text))) return;
    hideRenderedGroups(element, sourceLines(section.text, section.lineStart, section.lineEnd));
}
