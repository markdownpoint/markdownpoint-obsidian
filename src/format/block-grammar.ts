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
import type { Token, TokenizerObject } from 'marked';

/**
 * Block rules where the MarkdownPoint app reads Markdown differently from Marked's defaults. They decide where code
 * and HTML blocks are, and so which marker lines are slide boundaries; every block-level lexer here uses them.
 */
export const blockRules: TokenizerObject = {
    list(source) {
        // An empty item's marker is read without the space after it, so the list ends where the app's list ends
        const empty = /^( {0,3}(?:[*+-]|\d{1,9}[.)]))[ \t](?=\n|$)/.exec(source);
        if (!empty) return false;
        const token = Tokenizer.prototype.list.call(this, empty[1] + source.slice(empty[0].length));
        return token ? { ...token, raw: source.slice(0, token.raw.length + 1) } : false;
    },
    html(source) {
        // A line break tag starts a paragraph, not an HTML block that would swallow the lines after it
        return /^<br[ \t]*\/?>/i.test(source) ? undefined : false;
    }
};

const blockGrammar = new Marked({ gfm: true, tokenizer: blockRules });

/** Block tokens as the MarkdownPoint app reads them, for finding code blocks. */
export function blockTokens(markdown: string): Token[] {
    return new blockGrammar.Lexer(blockGrammar.defaults).blockTokens(markdown);
}
