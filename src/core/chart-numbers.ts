/** How a deck writes a chart's numbers: the rule its language reads cells by, and a cell's number read, spelled and respelled by it. */
import { CHART_NUMBER_LOCALES, CHART_NUMBER_PARENTS, CHART_NUMBER_PROFILES, CHART_NUMBER_SCRIPTS } from "./chart-number-rules.js";

/**
 * How a deck writes a number in Latin digits, from Unicode CLDR: its decimal mark, its group mark, and how many digits
 * each group holds, nearest the point first and beyond it, as Hindi groups 12,34,567.
 */
export interface ChartNumberRule { decimal: string; group: string; primary: number; secondary: number }

/**
 * The rule a deck's cells read by, as CLDR resolves its locale (presentationLocale's). The tag is named in full, the
 * script it's likely written in filled in where it names none (de-CH as de-Latn-CH, zh-HK as zh-Hant-HK), and walks to
 * its first entry: through the parent CLDR names for it, else the tag with its last subtag gone, a language and its
 * script standing last before root. A script a language isn't likely written in has no entry and reads root's rule.
 */
export function chartNumberRule(locale: string): ChartNumberRule {
  const parts = locale.split("-"), singleton = parts.findIndex(part => part.length === 1);
  const [language = "", ...subtags] = singleton < 0 ? parts : parts.slice(0, singleton);
  const script = /^[A-Z][a-z]{3}$/.test(subtags[0] ?? "") ? subtags.shift() : undefined;
  const region = /^(?:[A-Z]{2}|\d{3})$/.test(subtags[0] ?? "") ? subtags[0] : undefined;
  const written = script ?? (region === undefined ? undefined : CHART_NUMBER_SCRIPTS[`${language}-${region}`]) ?? CHART_NUMBER_SCRIPTS[language];
  let tag = [language, written, ...subtags].filter(Boolean).join("-");
  while (!Object.hasOwn(CHART_NUMBER_LOCALES, tag)) {
    const named = tag.split("-");
    tag = Object.hasOwn(CHART_NUMBER_PARENTS, tag) ? CHART_NUMBER_PARENTS[tag]! : named.length > 2 ? named.slice(0, -1).join("-") : "root";
  }
  const [decimal, group, primary, secondary] = CHART_NUMBER_PROFILES[CHART_NUMBER_LOCALES[tag]!]!;
  // A locale that writes no groups still reads a space between them, three digits apart.
  return { decimal, group, primary: primary || 3, secondary: secondary || primary || 3 };
}

/**
 * How a cell spells its number, so a counting value keeps the cell's own spelling: "$1,284,392", "99.99%", "3.1×",
 * "1 250 kr" and "($1,234.50)" count with their words, signs, separators and decimals.
 */
export interface ChartNumberFormat {
  /** The words before and after the digits of a value that is no loss. */
  prefix: string;
  suffix: string;
  /**
   * The words before and after a loss's digits, its marks among them, as the cell writes them: "-$" and "" for "-$4.50",
   * "$(" and ")" for "$(1,234.50)", "" and " kr-" for "1 234,50 kr-". A cell that writes no loss spells one with a minus
   * after its prefix.
   */
  negativePrefix: string;
  negativeSuffix: string;
  decimals: number;
  /** The mark the cell groups its whole digits with, as it writes it, or none. */
  group: string;
  /** How many digits a group holds, nearest the point and beyond it: the deck's. */
  primary: number;
  secondary: number;
  /** The deck's decimal mark. */
  point: string;
}

export interface ChartNumber { value: number; format: ChartNumberFormat }

/** How a count spells its number when its cell holds none: plain digits, the deck's point. */
export const plainFormat = (rule: ChartNumberRule): ChartNumberFormat =>
  ({ prefix: "", suffix: "", negativePrefix: "-", negativeSuffix: "", decimals: 0, group: "", primary: rule.primary, secondary: rule.secondary, point: rule.decimal });

/** The most digits toFixed spells after the point; one more throws a RangeError, which refuses the whole render. */
const MAX_FIXED_DIGITS = 100;

/** Every space a cell may group digits with reads as one space, and both apostrophes as one apostrophe. */
const GROUP_SPACE = /[\u0020\u00A0\u202F\u2009]/u;

const markKind = (mark: string): string => GROUP_SPACE.test(mark) ? " " : mark === "\u2019" ? "'" : mark;

const escapeClass = (text: string): string => text.replace(/[\\\]^-]/g, "\\$&");

/** A cell's sign, prefix, digits and suffix, by a rule's marks: digits run from a digit, or the decimal mark, to a digit. */
const numberPatterns = new Map<string, RegExp>();

function numberPattern(rule: ChartNumberRule): RegExp {
  const key = `${rule.decimal}\u0000${rule.group}`;
  let pattern = numberPatterns.get(key);
  if (!pattern) {
    const marks = escapeClass(`${rule.decimal}${rule.group}\u0020\u00A0\u202F\u2009'\u2019`), point = escapeClass(rule.decimal);
    numberPatterns.set(key, pattern = new RegExp(`^(?<sign1>[-\\u2212]?)(?<prefix>[^\\d\\-\\u2212]*?)(?<sign2>[-\\u2212]?)(?<digits>[${point}]?\\d(?:[\\d${marks}]*\\d)?)(?<suffix>\\D*)$`, "u"));
  }
  return pattern;
}

/**
 * A cell's number and how it is spelled, by its deck's rule, or null when the cell holds no single number by it. The
 * deck's decimal mark is the point; whole digits stand ungrouped, or grouped by the deck's group mark or by a space, in
 * the deck's widths, never by both. Nothing is guessed: "1,234" is 1234 in English and 1.234 in Swedish, and "1,23" in
 * English holds no number. A loss is written as spreadsheets write one: with a minus before the number or after its
 * prefix, in parentheses, or with a minus ending the cell, as "-$4.50", "($4.50)" and "4.50-" do.
 */
export function parseChartNumber(text: string, rule: ChartNumberRule): ChartNumber | null {
  return readChartNumber(text, rule)?.number ?? null;
}

/**
 * The words a cell's digits stand in, as a value that is no loss and as a loss spell them, and whether the cell writes
 * a loss: by a minus before its digits or its prefix; by a pair of parentheses around its digits, the prefix and suffix
 * inside or outside them, as "(1,234.50)", "($1,234.50)" and "$(1,234.50)" write one; or by a minus ending the cell, as
 * "1,234.50-" and "1 234,50 kr-" do. A parenthesis with no partner across the digits, as in "(EUR) 5 (est.)", a minus
 * within the suffix's words, as in "5-year", and a dash after a colon, a comma or a period, as a whole price "100:-" or
 * "10,-" is written, are words. The minus before the digits decides a cell that also writes another mark, as "(-5)" does.
 */
function signedWords(sign1: string, prefix: string, sign2: string, suffix: string): Pick<ChartNumberFormat, "prefix" | "suffix" | "negativePrefix" | "negativeSuffix"> & { loss: boolean } {
  if (sign1 || sign2) return { prefix, suffix, negativePrefix: `${sign1}${prefix}${sign2}`, negativeSuffix: suffix, loss: true };
  const open = prefix.lastIndexOf("("), close = suffix.indexOf(")");
  if (open >= 0 && !prefix.includes(")", open) && close >= 0 && !suffix.slice(0, close).includes("(")) {
    return { prefix: prefix.slice(0, open) + prefix.slice(open + 1), suffix: suffix.slice(0, close) + suffix.slice(close + 1), negativePrefix: prefix, negativeSuffix: suffix, loss: true };
  }
  if (/(?<![:.,])[-−]$/u.test(suffix)) return { prefix, suffix: suffix.slice(0, -1), negativePrefix: prefix, negativeSuffix: suffix, loss: true };
  return { prefix, suffix, negativePrefix: `${prefix}-`, negativeSuffix: suffix, loss: false };
}

/**
 * A cell's number read by a rule, with the parts it is spelled from: its signs and words as written, its whole digits
 * without their group marks, whether it grouped them, and the digits after its point, if it has one.
 */
function readChartNumber(text: string, rule: ChartNumberRule): ChartNumberRead | null {
  const match = numberPattern(rule).exec(text.trim());
  return match?.groups ? readNumberParts(match.groups, rule) : null;
}

/** A cell's number read from its parts, and what it is spelled from. */
interface ChartNumberRead { number: ChartNumber; sign1: string; prefix: string; sign2: string; whole: string; grouped: boolean; fraction: string | null; suffix: string }

/** A cell's number from the parts a rule's pattern found in it, or null when they spell none by the rule. */
function readNumberParts(groups: Readonly<Record<string, string | undefined>>, rule: ChartNumberRule): ChartNumberRead | null {
  const { sign1 = "", prefix = "", sign2 = "", digits = "", suffix = "" } = groups;
  // A prefix that ends in a period or a comma would spell a point the deck doesn't write, as ".5" in Swedish.
  if ((sign1 && sign2) || /[.,]$/.test(prefix)) return null;
  const at = digits.indexOf(rule.decimal);
  if (at >= 0 && digits.indexOf(rule.decimal, at + 1) >= 0) return null;
  const whole = at < 0 ? digits : digits.slice(0, at), fraction = at < 0 ? "" : digits.slice(at + rule.decimal.length);
  if (/\D/.test(fraction)) return null;
  const marks = [...whole].filter(character => !/\d/.test(character));
  if (!groupedByRule(whole, marks, rule)) return null;
  const { loss, ...words } = signedWords(sign1, prefix, sign2, suffix);
  const value = digitsValue(whole, fraction, loss);
  if (!Number.isFinite(value)) return null;
  return {
    number: { value, format: { ...words, decimals: Math.min(fraction.length, MAX_FIXED_DIGITS), group: marks[0] ?? "", primary: rule.primary,
      secondary: rule.secondary, point: rule.decimal } },
    sign1, prefix, sign2, whole: whole.replace(/\D/g, ""), grouped: marks.length > 0, fraction: at < 0 ? null : fraction, suffix
  };
}

/**
 * Whether whole digits stand ungrouped, or grouped by one kind of mark, the deck's group mark or a space, in the deck's
 * widths: the group nearest the point holds the primary width and every one beyond it the secondary, the first up to
 * that many.
 */
function groupedByRule(whole: string, marks: readonly string[], rule: ChartNumberRule): boolean {
  const kinds = new Set(marks.map(markKind));
  if (kinds.size > 1) return false;
  const [kind] = kinds;
  if (kind === undefined) return true;
  if (kind !== " " && kind !== markKind(rule.group)) return false;
  const groups = whole.split(/\D/u), last = groups.length - 1;
  return !groups.some((group, index) => index === last ? group.length !== rule.primary
    : index === 0 ? group.length < 1 || group.length > rule.secondary : group.length !== rule.secondary);
}

/** The number whole digits and a fraction spell, below zero for a loss. */
function digitsValue(whole: string, fraction: string, loss: boolean): number {
  return Number(`${whole.replace(/\D/g, "") || "0"}.${fraction || "0"}`) * (loss ? -1 : 1);
}

/**
 * A cell's number as another rule spells it, or null when `from` reads no number in it: its signs, words and digits
 * kept, its point, group mark and group widths taken from `to`, so "1 234,50" from a Swedish computer is "1,234.50" in
 * an English deck, and its loss "(1 234,50)" is "(1,234.50)". The same rule gives the cell back as it is.
 */
export function respellChartNumber(text: string, from: ChartNumberRule, to: ChartNumberRule): string | null {
  const read = readChartNumber(text, from);
  if (!read) return null;
  if (sameRule(from, to)) return text;
  const whole = read.grouped ? grouped(read.whole, to) : read.whole;
  return `${read.sign1}${read.prefix}${read.sign2}${whole}${read.fraction === null ? "" : `${to.decimal}${read.fraction}`}${read.suffix}`;
}

/** Whether two rules spell every number alike. */
export const sameRule = (a: ChartNumberRule, b: ChartNumberRule): boolean => a.decimal === b.decimal && a.group === b.group && a.primary === b.primary && a.secondary === b.secondary;

/** The language a theme's chart cells are written in, whatever the deck's: a theme has no language of its own. */
export const THEME_CELL_LOCALE = "en-US";

/**
 * The rule a chart's cells read by: a theme's own words, which `scope` marks, are written as en-US, so a deck in any
 * language shows them alike, and a deck's own words as the deck's language, `locale`.
 */
export function chartCellRule(content: { scope?: "theme" } | undefined, locale: string): ChartNumberRule {
  return chartNumberRule(content?.scope === "theme" ? THEME_CELL_LOCALE : locale);
}

/** Whole digits in their groups: the primary width nearest the point, the secondary beyond it. */
function grouped(whole: string, format: Pick<ChartNumberFormat, "group" | "primary" | "secondary">): string {
  if (!format.group || whole.length <= format.primary) return whole;
  const head = whole.slice(0, -format.primary), parts = [whole.slice(-format.primary)];
  for (let end = head.length; end > 0; end -= format.secondary) parts.unshift(head.slice(Math.max(0, end - format.secondary), end));
  return parts.join(format.group);
}

/** A value spelled as its cell spells its number: the same words, separators and decimals. */
export function formatChartNumber(value: number, format: ChartNumberFormat): string {
  const fixed = Math.abs(value).toFixed(format.decimals);
  // From 1e21 toFixed spells an exponent; a value that large is whole, so its digits are its integer's.
  const [whole = "0", fraction] = fixed.includes("e") ? [BigInt(Math.abs(value)).toString(), "0".repeat(format.decimals) || undefined] : fixed.split(".");
  const digits = fraction ? `${grouped(whole, format)}${format.point}${fraction}` : grouped(whole, format);
  // Rounding decides the sign, so a count passing through zero never shows a negative zero.
  const loss = Number(fixed) !== 0 && value < 0;
  return `${loss ? format.negativePrefix : format.prefix}${digits}${loss ? format.negativeSuffix : format.suffix}`;
}
