import { PATTERN_END } from "../common/pattern-end.js";
import { LOCALE_ALIAS_RULES, LOCALE_REGION_CHOICES } from "./locale-alias-rules.js";

/**
 * A language tag as the format spells one, in any case: a language, then its script, region and variants where it names
 * them, as sv, sr-Latn, fr-CA or de-CH-1996. The variant posix is none of them, since Unicode writes it as an extension,
 * en-US-u-va-posix, which no tag here holds.
 */
export const LANGUAGE_TAG = new RegExp(`^(?![\\s\\S]*-[Pp][Oo][Ss][Ii][Xx](?![^-]))(?:[A-Za-z]{2,3}|[A-Za-z]{5,8})(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*${PATTERN_END}`);

/** A language tag's parts: its language, empty for und, its script and region, empty where it names none, and its variants in order. */
interface LocaleParts {
  language: string;
  script: string;
  region: string;
  variants: string[];
}

const SCRIPT = /^[A-Za-z]{4}$/, REGION = /^(?:[A-Za-z]{2}|[0-9]{3})$/;

/** The parts of a tag the grammar admits, each in its usual case and its variants sorted; null where it names a variant twice. */
function localeParts(tag: string): LocaleParts | null {
  const [first, ...rest] = tag.split("-") as [string, ...string[]];
  const language = first.toLowerCase();
  const script = rest[0] !== undefined && SCRIPT.test(rest[0]) ? rest.shift()! : "";
  const region = rest[0] !== undefined && REGION.test(rest[0]) ? rest.shift()!.toUpperCase() : "";
  const variants = rest.map(variant => variant.toLowerCase()).sort();
  if (variants.some((variant, index) => variant === variants[index - 1])) return null;
  return { language: language === "und" ? "" : language, script: script && script[0]!.toUpperCase() + script.slice(1).toLowerCase(), region, variants };
}

/** A rule's tag and what it becomes, its place in Annex C's order, and for a region with several replacements, the choices among them. */
interface AliasRule { from: LocaleParts; to: LocaleParts[]; order: number; choices?: Readonly<Record<string, string>> }

/** The part a rule names first, which a tag must have for the rule to match: its language, else its script, region or first variant. */
const ruleKey = ({ language, script, region, variants }: LocaleParts): string =>
  language ? `language ${language}` : script ? `script ${script}` : region ? `region ${region}` : `variant ${variants[0]}`;

/** The rules by the part each names first, each list in Annex C's order; read once. */
let rulesByKey: Map<string, AliasRule[]> | undefined;
function aliasRules(): Map<string, AliasRule[]> {
  if (rulesByKey) return rulesByKey;
  rulesByKey = new Map();
  LOCALE_ALIAS_RULES.forEach(([from, to], order) => {
    const parts = localeParts(from)!, choices = parts.region ? LOCALE_REGION_CHOICES[parts.region] : undefined;
    const rule: AliasRule = { from: parts, to: to.split(" ").map(each => localeParts(each)!), order, ...choices ? { choices } : {} };
    const key = ruleKey(parts), list = rulesByKey!.get(key);
    if (list) list.push(rule);
    else rulesByKey!.set(key, [rule]);
  });
  return rulesByKey;
}

/** Whether every part a rule names is one the tag has, its variants among the tag's. */
const matches = ({ from }: AliasRule, tag: LocaleParts): boolean => (!from.language || from.language === tag.language) &&
  (!from.script || from.script === tag.script) && (!from.region || from.region === tag.region) && from.variants.every(variant => tag.variants.includes(variant));

/** The first rule in Annex C's order that matches the tag: the first that matches in each list of a part the tag has, the earliest of them. */
function firstMatch(tag: LocaleParts): AliasRule | undefined {
  const rules = aliasRules();
  let first: AliasRule | undefined;
  for (const key of [`language ${tag.language}`, `script ${tag.script}`, `region ${tag.region}`, ...tag.variants.map(variant => `variant ${variant}`)]) {
    const match = rules.get(key)?.find(rule => matches(rule, tag));
    if (match && (!first || match.order < first.order)) first = match;
  }
  return first;
}

/**
 * The replacement a rule gives the tag: its one, or for a region with several, the one the tag's language, with its
 * script where it names one, is most likely spoken in, else the first.
 */
function replacement(rule: AliasRule, tag: LocaleParts): LocaleParts {
  if (!rule.choices) return rule.to[0]!;
  const language = tag.language || "und", script = tag.script === "Zzzz" ? "" : tag.script;
  const region = (script ? rule.choices[`${language}-${script}`] : undefined) ?? rule.choices[language];
  return rule.to.find(each => each.region === region) ?? rule.to[0]!;
}

/**
 * The most rules a tag is replaced by before its canonical form, past which the table holds a cycle, which would hang
 * every reader of a locale: CLDR's own aliases replace a tag at most a few times.
 */
const MAX_REPLACEMENTS = 64;

/**
 * A locale in Unicode's canonical form, as UTS #35's Annex C makes one from CLDR's alias rules, the pinned table's, never
 * the computer's: each part in its usual case, its variants in alphabetical order, and each alias replaced, as `iw` by
 * `he`, `sh` by `sr-Latn` and the region SU by the country its language is most likely spoken in. The first rule that
 * matches replaces each part it names with its replacement's, and fills a part the tag lacks from it, until none
 * matches. Null for a tag the grammar refuses or one that names a variant twice.
 */
export function canonicalLocale(tag: string): string | null {
  const parts = LANGUAGE_TAG.test(tag) ? localeParts(tag) : null;
  if (!parts) return null;
  for (let replaced = 0, rule = firstMatch(parts); rule; replaced++, rule = firstMatch(parts)) {
    if (replaced === MAX_REPLACEMENTS) throw new Error(`The locale table replaces ${tag} in a cycle`);
    const { from } = rule, to = replacement(rule, parts);
    for (const part of ["language", "script", "region"] as const) {
      if (from[part] || !parts[part]) parts[part] = to[part];
    }
    if (from.variants.length) parts.variants = [...new Set([...parts.variants.filter(variant => !from.variants.includes(variant)), ...to.variants])].sort();
    else if (!parts.variants.length) parts.variants = [...to.variants];
  }
  return [parts.language || "und", parts.script, parts.region, ...parts.variants].filter(Boolean).join("-");
}

/** A locale's language subtag in its canonical form, und where it names none; null for a tag the grammar refuses. */
export function localeLanguage(tag: string): string | null {
  return canonicalLocale(tag)?.split("-")[0] ?? null;
}
