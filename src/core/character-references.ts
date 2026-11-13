/** Character references as Markdown reads them, over a run of plain words as a whole. The Obsidian plugin carries this file. */
import { decodeHTMLStrict } from "entities";

/** A token as marked gives it, by its type, the Markdown that writes it, its words and the tokens inside it. */
interface WordsToken {
  type: string;
  raw: string;
  text?: string;
  tokens?: readonly unknown[];
}

/**
 * A token's words as written, where it is plain words: text, or a bare URL GFM finds, which stays words. A run of them is
 * read as a whole: a bare URL's token ends before the `;` that closes a reference at its end. An escaped character, code
 * and Markdown kept as written end the run.
 */
export function plainWords(token: WordsToken): string | undefined {
  if (token.type === "text" && !token.tokens?.length) return token.text ?? token.raw;
  // A link's label opens with a bracket and an autolink with an angle bracket.
  return token.type === "link" && !/^[[<]/.test(token.raw) ? token.raw : undefined;
}

/**
 * A character reference, as CommonMark reads one outside code and Markdown kept as written: a name HTML defines, or a
 * decimal number of up to seven digits or a hexadecimal one of up to six, ended by `;`. A number that names no character
 * reads as U+FFFD; a name HTML does not define, or a longer number, stays as written.
 */
const CHARACTER_REFERENCE = /&(?:#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]*);/g;
const CHARACTER_REFERENCE_AT = new RegExp(CHARACTER_REFERENCE.source, "y");

/** Text with each character reference it holds read as the character it names. */
export function decodeCharacterReferences(text: string): string {
  return text.includes("&") ? text.replace(CHARACTER_REFERENCE, referencedCharacter) : text;
}

/**
 * The character a reference names. A number names its code point, or U+FFFD where it names none, as CommonMark reads it;
 * HTML's own reading turns some, such as `&#128;`, into other characters. A name is read as HTML defines it.
 */
function referencedCharacter(reference: string): string {
  if (reference[1] !== "#") return decodeHTMLStrict(reference);
  const hex = reference[2] === "x" || reference[2] === "X";
  const code = Number.parseInt(reference.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
  return code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? "�" : String.fromCodePoint(code);
}

/** Whether a character reference starts at `at`, which a reader would turn into its character. */
export function startsCharacterReference(text: string, at: number): boolean {
  CHARACTER_REFERENCE_AT.lastIndex = at;
  const reference = CHARACTER_REFERENCE_AT.exec(text)?.[0];
  return reference !== undefined && referencedCharacter(reference) !== reference;
}
