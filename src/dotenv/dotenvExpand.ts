import type { ProcessEnv } from '@/src/core';

/**
 * Dotenv expansion utilities.
 *
 * This module expands environment-variable references in strings and
 * records. References take an optional default:
 *
 * - Unbraced: `$VAR[:default]` (the default runs to the next whitespace)
 * - Braced: `${VAR[:default]}` (the default may itself contain braced
 *   references)
 *
 * The text is scanned once, left to right:
 *
 * - `\$` is a literal `$`.
 * - A `$` that starts no reference stays literal.
 * - A reference to a set variable is replaced by that variable's value,
 *   verbatim; otherwise by its default, expanded; otherwise by the empty
 *   string.
 * - A referenced value is a composed value: it has already been expanded
 *   once, so it is spliced in as-is and never expanded again (#94). It is not
 *   re-scanned with the surrounding text either, and `$&`, `$$` and the other
 *   `String.replace` patterns have no special meaning.
 * - A value never sees itself: while a key is being expanded it is not in
 *   the reference map, so a reference to it (`SELF=$SELF`) resolves to the
 *   value composed before it, else counts as unset and takes its default.
 *   So `P=${P:/usr/bin}:/x` expands to `/usr/bin:/x` when nothing earlier
 *   sets `P`.
 */

/** A reference parsed at a `$`. */
interface Reference {
  /** The variable name. */
  name: string;
  /** The raw default, when one is given. */
  fallback: string | undefined;
  /** Index just past the reference. */
  end: number;
}

const UNBRACED = /\$(\w+)(?::(\S*))?/y;
const BRACED_HEAD = /\$\{(\w+)(:?)/y;

/**
 * Find the `}` that closes a braced default starting at `from`, skipping
 * escaped dollars and nested `${…}` references.
 */
const closingBrace = (text: string, from: number): number => {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text.startsWith('\\$', i)) i++;
    else if (text.startsWith('${', i)) {
      depth++;
      i++;
    } else if (text[i] === '}') {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
};

/** Parse the reference that starts at `text[at]` (a `$`), if any. */
const parseReference = (text: string, at: number): Reference | undefined => {
  UNBRACED.lastIndex = at;
  const plain = UNBRACED.exec(text);
  if (plain?.[1])
    return { name: plain[1], fallback: plain[2], end: UNBRACED.lastIndex };

  BRACED_HEAD.lastIndex = at;
  const head = BRACED_HEAD.exec(text);
  if (!head?.[1]) return undefined;
  const start = BRACED_HEAD.lastIndex;
  if (!head[2])
    return text[start] === '}'
      ? { name: head[1], fallback: undefined, end: start + 1 }
      : undefined;
  const close = closingBrace(text, start);
  return close === -1
    ? undefined
    : { name: head[1], fallback: text.slice(start, close), end: close + 1 };
};

/**
 * Expand `text` against `ref`. Referenced values are substituted verbatim;
 * only defaults are expanded further.
 */
const expandText = (text: string, ref: ProcessEnv): string => {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('\\$', i)) {
      out += '$';
      i += 2;
      continue;
    }
    const reference = text[i] === '$' ? parseReference(text, i) : undefined;
    if (!reference) {
      out += text.charAt(i);
      i++;
      continue;
    }
    const { name, fallback, end } = reference;
    // A plain-object ref inherits `toString` and the like: only a string is set.
    const value: unknown = ref[name];
    if (typeof value === 'string') out += value;
    else if (fallback !== undefined) out += expandText(fallback, ref);
    i = end;
  }
  return out;
};

/**
 * Expands environment-variable references in a string. References may be
 * written `$VAR[:default]` or `${VAR[:default]}`; unknown variables without a
 * default expand to the empty string.
 *
 * @param value - The string to expand.
 * @param ref - The reference object to use for variable expansion.
 * @returns The expanded string, or `undefined` when it is empty.
 *
 * @example
 * ```ts
 * process.env.FOO = 'bar';
 * dotenvExpand('Hello $FOO'); // "Hello bar"
 * dotenvExpand('Hello $BAZ:world'); // "Hello world"
 * dotenvExpand('Price \\$5'); // "Price $5"
 * ```
 *
 * @remarks
 * `ref` holds composed values: each has already been expanded once, so a
 * referenced value is substituted verbatim and never expanded again (#94).
 * With `ref = { P: '$5' }`, `$P` expands to `$5`. Only a default is expanded,
 * by the same rules. The text is scanned once, left to right, and each
 * substituted value is spliced in as-is (it is not re-scanned with the text
 * around it):
 *
 * - `\$` is a literal `$`.
 * - A `$` that starts no reference (`cost $`, `$!`) stays literal, and the
 *   other references in the value are still expanded.
 * - The unbraced default runs to the next whitespace, so `$HOST:8080` reads
 *   `8080` as `HOST`'s default; write `${HOST}:8080`. There is no `:-` form:
 *   `${A:-x}` has the default `-x`.
 * - A variable set to the empty string is used as is; only an unset variable
 *   takes its default.
 * - A value never sees itself: a key that is being expanded is not yet in
 *   the reference map ({@link dotenvExpandAll} adds it only once it is
 *   expanded), so a reference to it resolves to the value composed before
 *   it, else counts as unset. With nothing earlier setting `P`,
 *   `P=${P:/usr/bin}:/x` expands to `/usr/bin:/x`.
 */
export const dotenvExpand = (
  value: string | undefined,
  ref: ProcessEnv = process.env,
): string | undefined => {
  const result = value ? expandText(value, ref) : '';
  return result || undefined;
};

/**
 * Options for {@link dotenvExpandAll}.
 *
 * @public
 */
export interface DotenvExpandAllOptions {
  /**
   * The reference object to use for expansion (defaults to process.env).
   */
  ref?: ProcessEnv;
  /**
   * Whether to progressively add expanded values to the set of reference keys.
   */
  progressive?: boolean;
}

/**
 * Expands environment variables in the values of a JSON object.
 * Variables may be presented with optional default as `$VAR[:default]` or
 * `${VAR[:default]}`. Unknown variables will expand to an empty string.
 *
 * @param values - The values object to expand.
 * @param options - Expansion options.
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
 * Options:
 * - ref: The reference object to use for expansion (defaults to process.env).
 * - progressive: Whether to progressively add expanded values to the set of
 *   reference keys.
 *
 * When `progressive` is true, each expanded key becomes available for
 * subsequent expansions in the same object (left-to-right by object key order).
 *
 * Each value is expanded by the rules of {@link dotenvExpand}. A key that
 * references an earlier key gets that key's expanded value verbatim, so with
 * `{ P: '\\$5', Q: '$P' }` both are `$5` (#94).
 */
export function dotenvExpandAll<T extends ProcessEnv | Readonly<ProcessEnv>>(
  values: T,
  options: DotenvExpandAllOptions = {},
): ProcessEnv & {
  [K in keyof T]: string | undefined;
} {
  const { ref = process.env, progressive = false } = options;
  const out = Object.keys(values).reduce<ProcessEnv>((acc, key) => {
    acc[key] = dotenvExpand(values[key], {
      ...ref,
      ...(progressive ? acc : {}),
    });
    return acc;
  }, {});
  // Key-preserving return with a permissive index signature to allow later additions.
  return out as ProcessEnv & {
    [K in keyof T]: string | undefined;
  };
}

/**
 * Expands environment variables in a string using `process.env` as the
 * expansion reference; a `process.env` value is substituted verbatim (#94). Variables may be presented with optional default as
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
