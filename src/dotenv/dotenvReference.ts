/**
 * The reference syntax the dotenv expander reads: `$VAR[:default]` and
 * `${VAR[:default]}`, with `\$` a literal `$`. Internal: shared by the
 * expander and the writer.
 */

/** A reference parsed at a `$`. */
export interface Reference {
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

/**
 * Parse the reference that starts at `text[at]` (a `$`), if any.
 *
 * @param text - The text.
 * @param at - The index of a `$`.
 * @returns The reference, or `undefined` when the `$` starts none.
 */
export const parseReference = (
  text: string,
  at: number,
): Reference | undefined => {
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
 * Escape `value` so the expander gives it back unchanged: a `\` goes before
 * each `$` the expander would act on (review 5916926264 #4). That is a `$`
 * after a `\` (the pair would read as `\$`) and a `$` that starts a
 * reference. Any other `$` (`cost $`, `$!`) is left alone.
 *
 * Whether a `$` starts a reference depends on the text after it, escapes
 * included (an escaped `\$` hides a `}` from a braced default's search), so
 * the scan runs right to left over the already-escaped tail.
 *
 * @param value - A literal value.
 * @returns The text to write, which expands to `value` whatever the
 * variables.
 */
export const escapeExpansion = (value: string): string => {
  let out = '';
  for (let i = value.length - 1; i >= 0; i--) {
    const ch = value.charAt(i);
    out = ch + out;
    if (
      ch === '$' &&
      (value.charAt(i - 1) === '\\' || parseReference(out, 0) !== undefined)
    )
      out = `\\${out}`;
  }
  return out;
};
