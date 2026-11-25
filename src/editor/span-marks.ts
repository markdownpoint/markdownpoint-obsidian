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
import { readsAsPresentation } from '../presentation/reader.ts';
import { decodeCharacterReferences, markdownTokens, markdownWords } from '../readers/markdownpoint-readers.js';
import { fieldSpans } from '../format/spans.ts';
import type { SpanStyle, WordSpan } from '../format/spans.ts';

// Hidden by a class rather than replaced: the buffers CodeMirror sets beside a replaced range let a line wrap inside a word.
const hiddenMark = Decoration.mark({ class: 'markdownpoint-hidden-mark' });
const spanWords = Decoration.mark({ class: 'markdownpoint-span' });
// Obsidian draws all of the words of a span that holds a link as one link, with no destination of its own.
const linkedWords = Decoration.mark({ class: 'markdownpoint-span markdownpoint-span-linked' });
const linkWords = Decoration.mark({ class: 'markdownpoint-span-link' });
// Obsidian's own classes for the styles and code it reads nowhere inside brackets inside brackets.
const styleMarks = new Map<SpanStyle, Decoration>();
/** The styles Obsidian draws inside one pair of brackets wherever MarkdownPoint reads them, whose background drawn twice would darken. */
const bracketedStyles = new Set<SpanStyle>(['highlight', 'inline-code']);

/** Every stretch of a presentation's source that holds words: text, notes and section headings. */
function wordFields(document: PresentationDocument): { from: number; to: number }[] {
    return [...blockFields(document), ...document.sections.map(section => ({ from: section.markerTo, to: section.headingTo }))];
}

/** The words of the slides' blocks, text and notes, whose paragraphs may end with an id. */
export function blockFields(document: PresentationDocument): { from: number; to: number }[] {
    return document.slides.flatMap(slide => slide.blocks.map(block => ({ from: block.contentFrom, to: block.to })));
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
            const shift = <T extends { from: number; to: number; wordsFrom: number; wordsTo: number }>(at: T): T => ({
                ...at,
                from: field.from + at.from,
                to: field.from + at.to,
                wordsFrom: field.from + at.wordsFrom,
                wordsTo: field.from + at.wordsTo
            });
            for (const span of found) spans.push({ ...shift(span), ...(span.marks ? { marks: span.marks.map(shift) } : {}) });
        }
        this.known = next;
        return spans.sort((a, b) => a.from - b.from);
    }
}

/**
 * Hide each span's brackets and attributes, and the delimiters of emphasis, highlights, strikethroughs and code in its
 * words, so its word reads as styled words, and the brackets and destination of a link in its words, so only the link's
 * words read as a link. The plugin draws the emphasis and strikethrough whose delimiters it hides, which Obsidian reads
 * otherwise beside punctuation and drawn twice look as once, and a span inside another span or a link draws its
 * highlights and its code's look too, as Obsidian reads none there. A selection on any span of a word shows the whole
 * word's source, as Obsidian shows its own marks where the caret is.
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
                for (const mark of span.marks ?? [])
                    hidden.push(hiddenMark.range(mark.from, mark.wordsFrom), hiddenMark.range(mark.wordsTo, mark.to));
                const linked = word.some(link => link.href !== undefined && span.wordsFrom <= link.from && link.to <= span.wordsTo);
                words.push((span.href !== undefined ? linkWords : linked ? linkedWords : spanWords).range(span.wordsFrom, span.wordsTo));
                const nested = word.some(other => other !== span && other.wordsFrom <= span.from && span.to <= other.wordsTo);
                for (const mark of span.marks ?? [])
                    if (nested || !bracketedStyles.has(mark.style)) words.push(styleMark(mark.style).range(mark.wordsFrom, mark.wordsTo));
            }
        }
        first = last + 1;
    }
    // A span inside another closes before the outer one does.
    return { hidden: Decoration.set(hidden, true), words: Decoration.set(words, true) };
}

/** The mark that draws `style` with Obsidian's class for it. */
function styleMark(style: SpanStyle): Decoration {
    let mark = styleMarks.get(style);
    if (!mark) styleMarks.set(style, (mark = Decoration.mark({ class: `cm-${style}` })));
    return mark;
}

/** The element a press or click of the main button lands on, or none with Option or Shift, which select. */
function pressedElement(event: MouseEvent): Element | null | undefined {
    if (event.button !== 0 || event.altKey || event.shiftKey) return null;
    const node = event.targetNode;
    return node?.instanceOf(Element) ? node : node?.parentElement;
}

/**
 * A press on a link's words keeps the caret where it is, as on Obsidian's own links: a caret in the words would show
 * their source before the click could open the link. Whether the press was the link's.
 */
export function pressLinkWords(event: MouseEvent): boolean {
    if (!pressedElement(event)?.closest('.markdownpoint-span-link')) return false;
    event.preventDefault();
    return true;
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
             * Obsidian finds no link to open in words it draws as a span's own link, or in a link whose words hold a span,
             * and keeps the click from placing the caret: a link's words open its destination, as Obsidian opens a link, and
             * the span's other words take the caret.
             */
            click(event: MouseEvent, view: EditorView): boolean {
                const element = pressedElement(event);
                if (!element?.closest('.markdownpoint-span-linked, .markdownpoint-span-link')) return false;
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
                mousedown: pressLinkWords,
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

interface RenderedTextLocation {
    readonly node: Text;
    /** Its offset in its text node. */
    readonly at: number;
    /** Its offset in the rendered words, in UTF-16 code units across every text node. */
    readonly offset: number;
}

/** The words MarkdownPoint reads in a section's source: a section that is one table as a table object's words, any other as a text's. */
function sourceWords(source: string): string {
    const blocks = markdownTokens(source).filter(token => token.type !== 'space');
    return markdownWords(source, blocks.length === 1 && blocks[0]!.type === 'table' ? 'table' : 'rich-text');
}

/**
 * Take a span's `[` and `]{…}` out of the words reading view rendered from `source`, Obsidian having read them as plain
 * characters: each `]` its span's attributes follow, in the order the source closes them, with the `[` it closes, only
 * when the words then read as MarkdownPoint reads the source's. Otherwise the words keep every character. A table cell's
 * code also drops the backslash Obsidian keeps of each `\|`, which GFM and MarkdownPoint read as `|`.
 */
export function hideRenderedSpans(element: HTMLElement, source: string): void {
    // Reading view renders a link in a span's words as a link; the others close in the order of their `]`.
    const spans = fieldSpans(source)
        .filter(span => span.href === undefined)
        .sort((a, b) => a.wordsTo - b.wordsTo);
    if (!spans.length) return;
    // As reading view renders them, each escape and character reference read.
    const attributes = spans.map(span =>
        decodeCharacterReferences(source.slice(span.wordsTo + 1, span.to).replace(/\\([!-/:-@[-`{-~])/g, '$1'))
    );
    let words = '';
    const opened: RenderedTextLocation[] = [];
    const removals: (RenderedTextLocation & { readonly length: number })[] = [];
    const escaped: Text[] = [];
    const visit = (node: Node, code: boolean, cell: boolean): void => {
        if (node.nodeType === TEXT_NODE) {
            const text = node as Text;
            for (let at = 0; !code && at < text.data.length; at++) {
                if (text.data[at] === '[') opened.push({ node: text, at, offset: words.length + at });
                else if (text.data[at] === ']' && opened.length) {
                    const open = opened.pop()!;
                    const block = attributes[removals.length / 2];
                    if (block === undefined || !text.data.startsWith(block, at + 1)) continue;
                    removals.push({ ...open, length: 1 }, { node: text, at, offset: words.length + at, length: 1 + block.length });
                    at += block.length;
                }
            }
            if (code && cell && text.data.includes('\\|')) escaped.push(text);
            words += code && cell ? text.data.replaceAll('\\|', '|') : text.data;
        }
        const name = node.nodeType === ELEMENT_NODE ? node.nodeName : '';
        // A task's box, drawn as a checkbox, reads as MarkdownPoint reads it.
        if (name === 'INPUT' && (node as HTMLInputElement).type === 'checkbox') words += (node as HTMLInputElement).checked ? '[x]' : '[ ]';
        node.childNodes.forEach(child => visit(child, code || name === 'CODE' || name === 'PRE', cell || name === 'TD' || name === 'TH'));
    };
    visit(element, false, false);
    if (removals.length !== attributes.length * 2) return;
    // From the end, so an earlier offset in the same text stays where it was.
    removals.sort((a, b) => b.offset - a.offset);
    let shown = words;
    for (const removal of removals) shown = shown.slice(0, removal.offset) + shown.slice(removal.offset + removal.length);
    const bare = (text: string) => text.replace(/\s+/g, '').replaceAll('[X]', '[x]');
    if (bare(shown) !== bare(sourceWords(source))) return;
    for (const removal of removals) removal.node.deleteData(removal.at, removal.length);
    for (const text of escaped) text.data = text.data.replaceAll('\\|', '|');
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
    if (!section || !(await readsAsPresentation(vault, context.sourcePath))) return;
    hideRenderedSpans(element, sourceLines(section.text, section.lineStart, section.lineEnd));
}
