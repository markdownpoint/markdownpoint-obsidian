/** A table of what Unicode CLDR resolves for each locale, short as its chain allows, as scripts/generate-cldr-rules.ts writes one. */
export interface CldrTable {
  /** Each tag, named in full with its script, that resolves otherwise than the chain before it, by its profile's index. */
  readonly locales: Readonly<Record<string, number>>;
  /** Each tag whose chain goes on at the parent CLDR names for it, rather than at the tag with its last subtag gone. */
  readonly parents: Readonly<Record<string, string>>;
  /** The script a language, or a language in a region, is written in where its tag names none. */
  readonly scripts: Readonly<Record<string, string>>;
}

/**
 * The index of the profile `locale` reads in `table`, as CLDR resolves it. The tag is named in full, the script it's
 * likely written in filled in where it names none (de-CH as de-Latn-CH, zh-HK as zh-Hant-HK), and walks to its first
 * entry: through the parent CLDR names for it, else the tag with its last subtag gone, a language and its script standing
 * last before root. A script a language isn't likely written in has no entry and reads root's.
 */
export function cldrProfile(locale: string, { locales, parents, scripts }: CldrTable): number {
  const { language, script, subtags } = writtenTag(locale, scripts);
  let tag = [language, script, ...subtags].filter(Boolean).join("-");
  while (!Object.hasOwn(locales, tag)) {
    const named = tag.split("-");
    tag = Object.hasOwn(parents, tag) ? parents[tag]! : named.length > 2 ? named.slice(0, -1).join("-") : "root";
  }
  return locales[tag]!;
}

/**
 * A tag's language, the script it is written in, its own, else the one its language is likely written in in its region,
 * else in general, and its subtags between them and any extension: a region and variants.
 */
export function writtenTag(locale: string, scripts: CldrTable["scripts"]): { language: string; script: string | undefined; subtags: string[] } {
  const parts = locale.split("-"), singleton = parts.findIndex(part => part.length === 1);
  const [language = "", ...subtags] = singleton < 0 ? parts : parts.slice(0, singleton);
  const own = /^[A-Z][a-z]{3}$/.test(subtags[0] ?? "") ? subtags.shift() : undefined;
  const region = /^(?:[A-Z]{2}|\d{3})$/.test(subtags[0] ?? "") ? subtags[0] : undefined;
  return { language, script: own ?? (region === undefined ? undefined : scripts[`${language}-${region}`]) ?? scripts[language], subtags };
}
