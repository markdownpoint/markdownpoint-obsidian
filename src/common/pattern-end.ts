/**
 * The end of a pattern that matches a whole string, as every JSON Schema validator reads it: where no character follows.
 * ECMAScript's `$` is the string's end, while Python's and Java's also match before a final line break, a carriage
 * return, U+0085 or a line separator among them.
 */
export const PATTERN_END = "(?![\\s\\S])";
