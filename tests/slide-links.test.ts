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

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { remapMarkdownSlideLinks } from '../src/format/slide-links.ts';

const ids = new Map([
    ['one', 'copy-one'],
    ['two', 'copy-two']
]);
const rewrite = (source: string) => remapMarkdownSlideLinks(source, ids);

test('copied slide links follow their new identities without rewriting labels, titles or unrelated links', () => {
    const source =
        '  See [the *detail*](slide:two "slide:one title") and [back](slide:one).\n[Other](slide:elsewhere), [web](https://example.com/slide:two).  \n\n';
    const expected =
        '  See [the *detail*](slide:copy-two "slide:one title") and [back](slide:copy-one).\n[Other](slide:elsewhere), [web](https://example.com/slide:two).  \n\n';
    assert.equal(rewrite(source), expected);
    assert.equal(remapMarkdownSlideLinks(source, new Map()), source);
    assert.equal(remapMarkdownSlideLinks(source, new Map([['two', 'two']])), source);
});

test('literal code, images, escaped links, reference syntax and autolinks remain unchanged', () => {
    for (const source of [
        '`[code](slide:two)`',
        '```md\n[code](slide:two)\n```\n',
        '    [code](slide:two)\n',
        '\\[escaped](slide:two)',
        '![picture](slide:two)',
        '![alt [link](slide:two)](assets/picture.png)',
        '[reference][two]\n\n[two]: slide:two "Title"\n',
        '<slide:two>',
        'slide:two',
        '<div>\n[inside HTML](slide:two)\n</div>\n',
        '<!-- [comment](slide:two) -->'
    ])
        assert.equal(rewrite(source), source, source);
});

test('nested Markdown uses exact source offsets through lists, quotes, tables and CRLF', () => {
    const sources = [
        '> [A\r\n> long label](slide:two)\r\n',
        '- First\n  - [Nested](slide:two)\n\n    `[literal](slide:two)`\n',
        '# A [heading](slide:two)\n',
        '==[Highlight](slide:two)== and [Look [there](slide:two)]{color=accent}',
        'A <span>[real link](slide:two)</span> inside text.'
    ];
    for (const source of sources) {
        const expected = source.replace(/\]\(slide:two\)(?!`)/g, '](slide:copy-two)');
        assert.equal(rewrite(source), expected, source);
    }
});

test('identical table source stays literal in rich text and relinks only in a table field', () => {
    const source = '| Header | Other |\r\n| --- | --- |\r\n| [Go](slide:two) | `[No](slide:two)` |\r\n';
    assert.equal(rewrite(source), source);
    assert.equal(remapMarkdownSlideLinks(source, ids, 'table'), source.replace('[Go](slide:two)', '[Go](slide:copy-two)'));
    for (const prefix of ['    ', '\t', '\r\n\r\n\t']) {
        const padded = prefix + source + '\r\n  ';
        assert.equal(remapMarkdownSlideLinks(padded, ids, 'table'), padded.replace('[Go](slide:two)', '[Go](slide:copy-two)'));
    }
    assert.equal(rewrite('Before [Go](slide:two)\n\n' + source), 'Before [Go](slide:copy-two)\n\n' + source);
    for (const invalid of [
        '[Go](slide:two)',
        source + '\nNot a table [Go](slide:two)',
        source + '\n' + source,
        '| Header |\n| --- |\n| [Go](slide:two) | excess |\n',
        '| Header |\n| --- |\n| [Go](slide:two) | |\n'
    ])
        assert.equal(remapMarkdownSlideLinks(invalid, ids, 'table'), invalid);
    for (const source of [
        '| | Other |\n| --- | --- |\n| [Go](slide:two) | x |\n',
        '| | |\n| --- | --- |\n| [Go](slide:two) | |\n',
        '| Header | Other |\n| --- | --- |\n| [Go](slide:two) |\n'
    ])
        assert.equal(remapMarkdownSlideLinks(source, ids, 'table'), source.replace('slide:two', 'slide:copy-two'));
});

test('decoded destinations change while angle brackets, source encoding elsewhere and link titles survive', () => {
    assert.equal(rewrite('[A](<slide:two> "Label")'), '[A](<slide:copy-two> "Label")');
    assert.equal(rewrite('[A](slide&#58;two "Keep &amp; here")'), '[A](slide:copy-two "Keep &amp; here")');
    assert.equal(rewrite('[A](sl&#105;de:two)'), '[A](slide:copy-two)');
    assert.equal(rewrite('[A](slide\\:two)'), '[A](slide:copy-two)');
    assert.equal(rewrite('[A](slide%3Atwo)'), '[A](slide%3Atwo)');
    assert.equal(rewrite('[Go](slide:two\r\n "Title")'), '[Go](slide:copy-two\r\n "Title")');
    assert.equal(rewrite('[Go](slide:two\r "Title")'), '[Go](slide:copy-two\r "Title")');
});

test('repeated matching links preserve Unicode, visible link-like words and authored whitespace', () => {
    const source = '🌲 [slide:two](slide:two)\r\n\r\n[Again](slide:two)  \r\n\r\n\t';
    assert.equal(rewrite(source), '🌲 [slide:two](slide:copy-two)\r\n\r\n[Again](slide:copy-two)  \r\n\r\n\t');
});

test('MarkdownPoint line breaks retain following inline links without opening opaque HTML blocks', () => {
    for (const source of [
        '<br>\n[Next](slide:two)',
        '<BR/>\r\n[Next](slide:two)',
        '<br   >[Next](slide:two)',
        '> <br>\n> [Next](slide:two)',
        '- <br />\n  [Next](slide:two)',
        '[A<br>label](slide:two)',
        '[Unrelated](<br>) then [Next](slide:two)'
    ])
        assert.equal(rewrite(source), source.replace('(slide:two)', '(slide:copy-two)'), source);
    for (const source of [
        '<br class="special">\n[Literal](slide:two)',
        '    <br>\n    [Literal](slide:two)',
        '```md\n<br>\n[Literal](slide:two)\n```',
        '<div>\n<br>\n[Literal](slide:two)\n</div>'
    ])
        assert.equal(rewrite(source), source, source);
});

test('one contextual parse recognizes multiline destinations and titles inside quotes and lists', () => {
    for (const source of [
        '> [Go](\n> slide:two)',
        '> [Go](slide:two\n> "Title")',
        '> > [Go](\r\n> > slide:two\r\n> > "Title")',
        '- [Go](\n  slide:two\n  "Title")',
        '> - [Go](\r\n>   <slide&#58;two>\r\n>   "Title")'
    ])
        assert.equal(rewrite(source), source.replace(/slide(?::|&#58;)two/, 'slide:copy-two'), source);
    const code = '> ```md\n> [Go](\n> slide:two)\n> ```';
    assert.equal(rewrite(code), code);
});

test('MarkdownPoint bare URL spans stay literal even when they contain link-shaped characters', () => {
    for (const source of [
        'ftp://example.com/[Go](slide:two)',
        'https://example.com?q=[Go](slide:two)',
        'www.example.com/[Go](slide:two)',
        'HTTP://example.com/[Go](slide:two)',
        'abchttps://example.com/[Go](slide:two)',
        '> https://example.com/[Go](slide:two)',
        '**ftp://example.com/[Go](slide:two)**',
        '*ftp://example.com/[Go](slide:two)*',
        '~~ftp://example.com/[Go](slide:two)~~',
        '**abchttps://example.com/[Go](slide:two)**',
        '**emphasis *ftp://example.com/[Go](slide:two)* text**',
        '**ftp://example.com/[Go](slide:two)** then https://example.com/[Later](slide:two)',
        '[[ftp://x/[Go](slide:two)](https://x)](https://x)',
        '[**ftp://x/[Go](slide:two)**](https://x)'
    ])
        assert.equal(rewrite(source + ' and [real](slide:two)'), source + ' and [real](slide:copy-two)');
    assert.equal(rewrite('[https://example.com](slide:two)'), '[https://example.com](slide:copy-two)');
    assert.equal(rewrite('> [https://example.com](\n> slide:two)'), '> [https://example.com](\n> slide:copy-two)');
    const table = '| A | B |\n| --- | --- |\n|https://example.com|[Go](slide:two)|\n';
    assert.equal(remapMarkdownSlideLinks(table, ids, 'table'), table.replace('slide:two', 'slide:copy-two'));
    const fenced = '```md\nAn inline ``` marker.\n```\n\nhttps://example.com/[Go](slide:two) and [real](slide:two)';
    assert.equal(rewrite(fenced), fenced.replace('[real](slide:two)', '[real](slide:copy-two)'));
});

test('a long field rewrites each real destination once and keeps its code examples', () => {
    const line = '[Go](slide:two) and `[Go](slide:two)`.\n\n';
    assert.equal(rewrite(line.repeat(1000)), '[Go](slide:copy-two) and `[Go](slide:two)`.\n\n'.repeat(1000));
    assert.equal(rewrite('==[Go](slide:two)== '.repeat(1000)), '==[Go](slide:copy-two)== '.repeat(1000));
    assert.equal(rewrite('**==[Go](slide:two)==** '.repeat(1000)), '**==[Go](slide:copy-two)==** '.repeat(1000));
});

test("the format's block lexer distinguishes tab-indented quote code and single-column tables", () => {
    const code = '> \t[Go](slide:two)';
    assert.equal(rewrite(code), code);
    const table = '| Header\n| ---\n| [Go](slide:two)';
    assert.equal(rewrite(table), table);
    assert.equal(remapMarkdownSlideLinks(table, ids, 'table'), table.replace('slide:two', 'slide:copy-two'));
});

test('parse-only provenance cannot collide with authored URI spelling or leak into copied source', () => {
    for (const existing of ['slide:mdp-copy-0-0', 'sl&#105;de:mdp-copy-0-0', String.raw`slide:mdp-copy-0\\-0`]) {
        const source = '`slide:two` and [independent](' + existing + ')';
        assert.equal(rewrite(source), source);
        assert.equal(rewrite(source + ' [real](slide:two)'), source + ' [real](slide:copy-two)');
    }
    assert.equal(rewrite('[Escaped](slide\\&colon;two)'), '[Escaped](slide:copy-two)');
    const reference = '![alt [Go](slide:two)][slide:one]\n\n[slide:one]: picture.png';
    assert.equal(rewrite(reference), reference);
    assert.equal(rewrite(reference + '\n\n[real](slide:two)'), reference + '\n\n[real](slide:copy-two)');
});

test('MarkdownPoint formatting boundaries keep adjacent real links separate from literal URLs', () => {
    for (const source of [
        '==ftp://x==[Go](slide:two)',
        '~~ftp://x~~[Go](slide:two)',
        '[ftp://x]{color=accent}[Go](slide:two)',
        '[ftp://x]{color="#F0A"}[Go](slide:two)',
        '[ftp://x]{}[Go](slide:two)',
        '[**ftp://x**]{}[***y***]{}[*z*]{}[Go](slide:two)',
        '[ftp://x]{font-weight=600}[Go](slide:two)',
        '[ftp://x]{font-weight="900"}[Go](slide:two)',
        '[ftp://x]{color=muted font-weight=600}[Go](slide:two)',
        '[ftp://x]{font-weight=300 color="#2F7D4F"}[Go](slide:two)',
        '[[ftp://x]{}]{color=accent}[Go](slide:two)',
        '==`a==b` [Go](slide:two)==',
        '[`a]b` [Go](slide:two)]{color=accent}',
        '==![a==b](picture.png) [Go](slide:two)==',
        '====ftp://x==[Go](slide:two)',
        '==``ftp://x==`[Go](slide:two)',
        '**ftp://x:**17[Go](slide:two)',
        '*ftp://x:*17[Go](slide:two)',
        '**ftp://x++**17[Go](slide:two)',
        '**ftp://x🙂**17[Go](slide:two)',
        'これは**「ftp://x」**です[Go](slide:two)',
        '==[ftp://x==b](invalid[Go](slide:two)',
        '~~[ftp://x~~b](invalid[Go](slide:two)',
        '==[a==b](https://example.com/a(b)) [Go](slide:two)==',
        '==[a==b](<https://example.com/)> "title )") [Go](slide:two)==',
        '==[reference][a\\]==b] [Go](slide:two)==\n\n[a\\]==b]: https://example.com'
    ])
        assert.equal(rewrite(source), source.replace('[Go](slide:two)', '[Go](slide:copy-two)'));
    for (const literal of [
        '~ftp://x~[Go](slide:two)',
        '[ftp://x]{color=not_valid}[Go](slide:two)',
        '**==ftp://x**[Go](slide:two)==**',
        '[ftp://x]{font-weight=450}[Go](slide:two)',
        '[ftp://x]{font-weight=600.0}[Go](slide:two)',
        '[ftp://x]{color=accent-}[Go](slide:two)',
        '[ftp://x]{size=2}[Go](slide:two)',
        '[]{}ftp://x[Go](slide:two)'
    ]) {
        assert.equal(rewrite(literal), literal);
    }
});
