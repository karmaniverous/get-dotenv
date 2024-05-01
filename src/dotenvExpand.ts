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

  console.log({ group, key, defaultValue });

  const replacement = value.replace(
    group,
    ref[key] ?? (defaultValue as string | undefined) ?? '',
  );

  return interpolate(replacement, ref);
};

const interpolate = (
  value: string | undefined,
  ref: Record<string, string | undefined>,
): string | undefined => {
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

export const dotenvExpand = (
  value: string | undefined,
  ref: Record<string, string | undefined> = process.env,
) => {
  const result = interpolate(value, ref);
  return result ? result.replace(/\\\$/g, '$') : undefined;
};

export const dotenvExpandAll = (
  values: Record<string, string | undefined> = {},
  ref: Record<string, string | undefined> = process.env,
  progressive = false,
) =>
  Object.keys(values).reduce<Record<string, string | undefined>>((acc, key) => {
    acc[key] = dotenvExpand(values[key], {
      ...ref,
      ...(progressive ? acc : {}),
    });
    return acc;
  }, {});
