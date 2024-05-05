import { ProcessEnv } from './GetDotenvOptions';

// like String.prototype.search but returns the last index
const searchLast = (str: string, rgx: RegExp) => {
  const matches = Array.from(str.matchAll(rgx));
  return matches.length > 0 ? matches.slice(-1)[0].index : -1;
};

const replaceMatch = (
  value: string,
  match: RegExpMatchArray,
  ref: Record<string, string | undefined>,
) => {
  const [group, key, defaultValue] = match;

  const replacement = value.replace(
    group,
    ref[key] ?? (defaultValue as string | undefined) ?? '',
  );

  return interpolate(replacement, ref);
};

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
  const whitespaceMatch = tail.match(whitespacePattern);
  if (whitespaceMatch != null) return replaceMatch(value, whitespaceMatch, ref);
  else {
    // find bracket pattern: ${KEY:DEFAULT}
    const bracketPattern = /^\${([\w]+)(?::([^}]*))?}/;
    const bracketMatch = tail.match(bracketPattern);
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
 * @param value - The string to expand.
 * @param ref - The reference object to use for variable expansion.
 * @param progressive - Whether to progressively add expanded values to the
 * set of reference keys.
 * @returns The value object with expanded string values.
 */
export const dotenvExpandAll = (
  values: ProcessEnv = {},
  {
    ref = process.env,
    progressive = false,
  }: {
    ref?: ProcessEnv;
    progressive?: boolean;
  } = {},
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
 */
export const dotenvExpandFromProcessEnv = (value: string | undefined) =>
  dotenvExpand(value, process.env);
