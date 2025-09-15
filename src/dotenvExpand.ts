import type { ProcessEnv } from './GetDotenvOptions';

/**
 * Dotenv expansion utilities.
 *
 * This module implements recursive expansion of environment-variable
 * references in strings and records. It supports both whitespace and
 * bracket syntaxes with optional defaults:
 *
 * - Whitespace: `$VAR[:default]`
 * - Bracketed: `${VAR[:default]}`
 *
 * Escaped dollar signs (`\$`) are preserved.
 * Unknown variables resolve to empty string unless a default is provided.
 */

// like String.prototype.search but returns the last index
/** @internal */
const searchLast = (str: string, rgx: RegExp) => {
  const matches = Array.from(str.matchAll(rgx));
  return matches.length > 0 ? (matches.slice(-1)[0]?.index ?? -1) : -1;
};

/**
 * Replace a single match in a value with its resolved reference.
 * Recurses via {@link interpolate} to support nested expansions.
 * @internal
 */
const replaceMatch = (
  value: string,
  match: RegExpMatchArray,
  ref: Record<string, string | undefined>,
) => {
  const group = match[0];
  const key = match[1];
  const defaultValue = match[2];
  if (!key) return value;

  const replacement = value.replace(group, ref[key] ?? defaultValue ?? '');

  return interpolate(replacement, ref);
};
/**
 * Recursively interpolate variable references in a string using the
 * provided reference object.
 * - Supports escaped dollar signs (`\$`) to avoid interpolation.
 * - Stops when no further unescaped `$` remain.
 * @internal
 */
const interpolate = (
  value = '',
  ref: Record<string, string | undefined> = {},
): string => {
  // if value is falsy, return it as is
  if (!value) return value;

  // get position of last unescaped dollar sign
  const lastUnescapedDollarSignIndex = searchLast(value, /(?!(?<=\\))\$/g);

  // return value if none found
  if (lastUnescapedDollarSignIndex === -1) return value;

  // evaluate the value tail
  const tail = value.slice(lastUnescapedDollarSignIndex);

  // find whitespace pattern: $KEY:DEFAULT
  const whitespacePattern = /^\$([\w]+)(?::([^\s]*))?/;
  const whitespaceMatch = whitespacePattern.exec(tail);
  if (whitespaceMatch != null) return replaceMatch(value, whitespaceMatch, ref);
  else {
    // find bracket pattern: ${KEY:DEFAULT}
    const bracketPattern = /^\${([\w]+)(?::([^}]*))?}/;
    const bracketMatch = bracketPattern.exec(tail);
    if (bracketMatch != null) return replaceMatch(value, bracketMatch, ref);
  }

  return value;
};

/**
 * Recursively expands environment variables in a string. Variables may be
 * presented with optional default as `$VAR[:default]` or `${VAR[:default]}`.
 * Unknown variables will expand to an empty string.
 *
 * @param value - The string to expand.
 * @param ref - The reference object to use for variable expansion.
 * @returns The expanded string.
 *
 * @example
 * ```ts
 * process.env.FOO = 'bar';
 * dotenvExpand('Hello $FOO'); // "Hello bar"
 * dotenvExpand('Hello $BAZ:world'); // "Hello world"
 * ```
 *
 * @remarks
 * The expansion is recursive. If a referenced variable itself contains
 * references, those will also be expanded until a stable value is reached.
 * Escaped references (e.g. `\$FOO`) are preserved as literals.
 */
export const dotenvExpand = (
  value: string | undefined,
  ref: ProcessEnv = process.env,
) => {
  const result = interpolate(value, ref);
  return result ? result.replace(/\\\$/g, '$') : undefined;
};

/**
 * Recursively expands environment variables in the values of a JSON object.
 * Variables may be presented with optional default as `$VAR[:default]` or
 * `${VAR[:default]}`. Unknown variables will expand to an empty string.
 *
 * @param values - The values object to expand.
 * @param ref - The reference object to use for expansion (defaults to process.env).
 * @param progressive - Whether to progressively add expanded values to the
 * set of reference keys.
 * @returns The value object with expanded string values.
 *
 * @example
 * ```ts
 * process.env.FOO = 'bar';
 * dotenvExpandAll({ A: '$FOO', B: 'x${FOO}y' });
 * // => { A: "bar", B: "xbary" }
 * ```
 *
 * @remarks
 * When {@link progressive} is true, each expanded key becomes available for
 * subsequent expansions in the same object (left-to-right by object key order).
 */
export const dotenvExpandAll = (
  values: ProcessEnv = {},
  {
    ref = process.env,
    progressive = false,
  }: { ref?: ProcessEnv; progressive?: boolean } = {},
) =>
  Object.keys(values).reduce<Record<string, string | undefined>>((acc, key) => {
    acc[key] = dotenvExpand(values[key], {
      ...ref,
      ...(progressive ? acc : {}),
    });
    return acc;
  }, {});

/**
 * Recursively expands environment variables in a string using `process.env` as
 * the expansion reference. Variables may be presented with optional default as
 * `$VAR[:default]` or `${VAR[:default]}`. Unknown variables will expand to an
 * empty string.
 *
 * @param value - The string to expand.
 * @returns The expanded string.
 *
 * @example
 * ```ts
 * process.env.FOO = 'bar';
 * dotenvExpandFromProcessEnv('Hello $FOO'); // "Hello bar"
 * ```
 */
export const dotenvExpandFromProcessEnv = (value: string | undefined) =>
  dotenvExpand(value, process.env);
