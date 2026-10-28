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
import { markdownWords, spanAttributesLength } from '../format/link-tokens.ts';
import { readsAsPresentation } from '../presentation/reader.ts';
import { fieldSpans } from '../format/spans.ts';
import type { WordSpan } from '../format/spans.ts';

const hiddenMark = Decoration.replace({});
const spanWords = Decoration.mark({ class: 'markdownpoint-span' });
// Obsidian draws all of the words of a span that holds a link as one link, with no destination of its own.
const linkedWords = Decoration.mark({ class: 'markdownpoint-span markdownpoint-span-linked' });
const linkWords = Decoration.mark({ class: 'markdownpoint-span-link' });

/** Every stretch of a presentation's source that holds words: text, notes, controls and section headings. */
function wordFields(document: PresentationDocument): { from: number; to: number }[] {
    const fields = [...document.slides, ...document.compositions].flatMap(part =>
        part.blocks.map(block => ({ from: block.contentFrom, to: block.to }))
    );
    fields.push(...document.sections.map(section => ({ from: section.markerTo, to: section.to })));
    return fields;
}

/** The spans of a presentation's source, read again only for fields whose words changed. */
export class SpanIndex {
    private known = new Map<string, readonly WordSpan[]>();

    read(state: EditorState, document: PresentationDocument): WordSpan[] {
        const next = new Map<string, readonly WordSpan[]>();
        const spans: WordSpan[] = [];
        for (const field of wordFields(document)) {
            const source = state.doc.sliceString(field.from, field.to);
            if (!source.includes(']{')) continue;
            const found = next.get(source) ?? this.known.get(source) ?? fieldSpans(source);
            next.set(source, found);
            for (const span of found)
                spans.push({
                    ...span,
                    from: field.from + span.from,
                    to: field.from + span.to,
                    wordsFrom: field.from + span.wordsFrom,
                    wordsTo: field.from + span.wordsTo
                });
        }
        this.known = next;
        return spans.sort((a, b) => a.from - b.from);
    }
}

/**
 * Hide each span's brackets, attributes and enclosing delimiters, so its word reads as styled words, and the brackets and
 * destination of a link in its words, so only the link's words read as a link. A selection on any span of a word shows
 * the whole word's source, as Obsidian shows its own marks where the caret is.
 */
export function spanDecorations(state: EditorState, spans: readonly WordSpan[]): { hidden: DecorationSet; words: DecorationSet } {
    const hidden: Range<Decoration>[] = [];
    const words: Range<Decoration>[] = [];
    for (let first = 0; first < spans.length;) {
        const from = spans[first]!.from;
        let to = spans[first]!.to;
        let last = first;
        // A span inside another, or right after it, is of the same word.
        while (last + 1 < spans.length && spans[last + 1]!.from <= to) to = Math.max(to, spans[++last]!.to);
        if (!state.selection.ranges.some(range => range.from <= to && range.to >= from)) {
            const word = spans.slice(first, last + 1);
            for (const span of word) {
                hidden.push(hiddenMark.range(span.from, span.wordsFrom), hiddenMark.range(span.wordsTo, span.to));
                const linked = word.some(link => link.href !== undefined && span.wordsFrom <= link.from && link.to <= span.wordsTo);
                words.push((span.href !== undefined ? linkWords : linked ? linkedWords : spanWords).range(span.wordsFrom, span.wordsTo));
            }
        }
        first = last + 1;
    }
    // A span inside another closes before the outer one does.
    return { hidden: Decoration.set(hidden, true), words: Decoration.set(words, true) };
}

/** Live Preview's span marks, for the presentation `document` reads from the editor's state. */
export function spanMarks(document: (state: EditorState) => PresentationDocument | null): Extension {
    const plugin = ViewPlugin.fromClass(
        class {
            hidden: DecorationSet = Decoration.none;
            words: DecorationSet = Decoration.none;
            private readonly index = new SpanIndex();
            private document: PresentationDocument | null = null;
            private spans: readonly WordSpan[] = [];

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
                    this.spans = this.document ? this.index.read(state, this.document) : [];
                }
                ({ hidden: this.hidden, words: this.words } = spanDecorations(state, this.spans));
            }

            /**
             * Obsidian finds no link to open in words it draws as a span's own link, and keeps the click from placing the
             * caret: a link's words open its destination, as Obsidian opens a link, and the span's other words take the caret.
             */
            click(event: MouseEvent, view: EditorView): boolean {
                const node = event.targetNode;
                const element = node?.instanceOf(Element) ? node : node?.parentElement;
                if (event.button !== 0 || event.altKey || event.shiftKey || !element?.closest('.markdownpoint-span-linked')) return false;
                const link = element.closest('.markdownpoint-span-link');
                // A link's words break into a mark for each line they run over.
                const at = link ? view.posAtDOM(link) : -1;
                const href = this.spans.find(span => span.href !== undefined && span.wordsFrom <= at && at < span.wordsTo)?.href;
                if (href && URL.canParse(href)) window.open(href);
                else {
                    const at = view.posAtCoords({ x: event.clientX, y: event.clientY });
                    if (at === null) return false;
                    view.focus();
                    view.dispatch({ selection: { anchor: at }, userEvent: 'select.pointer' });
                }
                event.preventDefault();
                return true;
            }
        },
        {
            decorations: value => value.hidden,
            // Outside every other mark, so the words' own highlighting, such as Obsidian's link color, sits inside it.
            provide: plugin => EditorView.outerDecorations.of(view => view.plugin(plugin)?.words ?? Decoration.none),
            eventHandlers: {
                click(event, view) {
                    return this.click(event, view);
                }
            }
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
 * Take a span's `[` and `]{…}` out of the words reading view rendered from `source`, Obsidian having read them as plain
 * characters: only when the words then read as the source's own do, whichever brackets the rendering pairs. Otherwise
 * the words keep every character.
 */
export function hideRenderedSpans(element: HTMLElement, source: string): void {
    // Reading view renders a link in a span's words as a link.
    const count = fieldSpans(source).filter(span => span.href === undefined).length;
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
                    const attributes = spanAttributesLength(text.data.slice(at + 1));
                    if (!attributes) continue;
                    removals.push({ ...open, length: 1 }, { node: text, at, position: words.length + at, length: 1 + attributes });
                    at += attributes;
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

/** Reading view of a presentation's slides.md shows a span's words without the marks it renders as characters. */
export async function hideReadingSpans(vault: Vault, element: HTMLElement, context: MarkdownPostProcessorContext): Promise<void> {
    if (!element.textContent?.includes(']{')) return;
    const section = context.getSectionInfo(element);
    if (!section || !(await readsAsPresentation(vault, context.sourcePath, section.text))) return;
    hideRenderedSpans(element, sourceLines(section.text, section.lineStart, section.lineEnd));
}
