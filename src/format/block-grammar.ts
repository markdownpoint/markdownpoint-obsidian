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

import { Marked, Tokenizer } from 'marked';
import type { Lexer, Token, TokenizerObject, Tokens } from 'marked';
import { MAX_MARKDOWN_NESTING } from '../readers/markdownpoint-readers.js';

/** How many lists and quotes the block each lexer reads stands in. */
const nesting = new WeakMap<object, number>();

/**
 * A list's or a quote's token, read one level deeper; none past `MAX_MARKDOWN_NESTING`, where the marker reads as words,
 * as MarkdownPoint reads it, so Marked never recurses deep enough to overflow its stack.
 */
function nested<T>(lexer: object, read: () => T): T | undefined {
    const depth = nesting.get(lexer) ?? 0;
    if (depth >= MAX_MARKDOWN_NESTING) return undefined;
    nesting.set(lexer, depth + 1);
    try {
        return read();
    } finally {
        nesting.set(lexer, depth);
    }
}

/** How many later definitions of a label already defined each lexer has kept, each under a tag of its own. */
const repeatedDefinitions = new WeakMap<object, number>();

/**
 * A link definition as the text keeps it. Marked drops a later definition of a label already defined, lines and all, so
 * every offset past it would slip; such a one stays a token under a tag no reference names, as a reference's label folds
 * its whitespace to one space, and the first definition stands, as CommonMark reads it.
 */
function keptDefinition(lexer: Lexer, token: Tokens.Def): Tokens.Def {
    if (!Object.hasOwn(lexer.tokens.links, token.tag)) return token;
    const kept = (repeatedDefinitions.get(lexer) ?? 0) + 1;
    repeatedDefinitions.set(lexer, kept);
    return { ...token, tag: `${token.tag}\n${kept}` };
}

/**
 * Block rules where the MarkdownPoint app reads Markdown differently from Marked's defaults. They decide where code
 * and HTML blocks are, and so which marker lines are slide boundaries; every block-level lexer here uses them.
 */
export const blockRules: TokenizerObject = {
    list(source) {
        return nested(this.lexer, () => {
            // An empty item's marker is read without the space after it, so the list ends where the app's list ends
            const empty = /^( {0,3}(?:[*+-]|\d{1,9}[.)]))[ \t](?=\n|$)/.exec(source);
            const token = empty ? Tokenizer.prototype.list.call(this, empty[1] + source.slice(empty[0].length)) : undefined;
            return token ? { ...token, raw: source.slice(0, token.raw.length + 1) } : Tokenizer.prototype.list.call(this, source);
        });
    },
    blockquote(source) {
        return nested(this.lexer, () => Tokenizer.prototype.blockquote.call(this, source));
    },
    html(source) {
        // A line break tag starts a paragraph, not an HTML block that would swallow the lines after it
        return /^<br[ \t]*\/?>/i.test(source) ? undefined : false;
    },
    def(source) {
        // A link definition lives in its paragraph, as CommonMark reads it: one whose label, destination or title would run
        // past a fence, a blank line or any block that ends the paragraph is read within the paragraph, so a title that
        // runs past it is none and the definition before it stands. The paragraph is read over the definition's lines and
        // the line after them, so a run of definitions reads in time in line with its length.
        const token = Tokenizer.prototype.def.call(this, source);
        if (!token) return token;
        const words = token.raw.replace(/\n+$/, '');
        const next = source.indexOf('\n', words.length + 1);
        const paragraph = this.rules.block.paragraph.exec(next < 0 ? source : source.slice(0, next))![0];
        const read = words.length <= paragraph.length ? token : Tokenizer.prototype.def.call(this, paragraph);
        return read && keptDefinition(this.lexer, read);
    }
};

const blockGrammar = new Marked({ gfm: true, tokenizer: blockRules });

/** Block tokens as the MarkdownPoint app reads them, for finding code blocks. */
export function blockTokens(markdown: string): Token[] {
    return new blockGrammar.Lexer(blockGrammar.defaults).blockTokens(markdown);
}
