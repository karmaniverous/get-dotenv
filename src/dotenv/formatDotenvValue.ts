/**
 * @packageDocumentation
 * Dotenv value formatting, shared by get-dotenv's two dotenv writers: the
 * format-preserving editor (`editDotenvText`/`editDotenvFile`) and the
 * `outputPath` (`-o`) writer. A value is written so that get-dotenv's read
 * path, dotenv's `parse` and then get-dotenv's expander, reads it back
 * exactly (#72). A `$` the expander would act on is escaped as `\$` first
 * (review 5916926264 #4); dotenv reads `\$` verbatim in every form.
 *
 * dotenv's parser has quirks a writer must respect: a bare value ends at the
 * first `#` and is trimmed; carriage returns in the source become line feeds;
 * inside double quotes `\n` and `\r` are expanded and nothing else is
 * unescaped (so `\\` and `\"` stay as written); single quotes and backticks
 * unescape nothing; and a quote preceded by `\` doesn't close a value, which
 * then runs on to a later line. Rather than re-implement those rules, each
 * candidate form is checked with dotenv's own `parse` (the parser get-dotenv
 * reads dotenv files with), and the first one that reads back unchanged, and
 * that the parser of `editDotenvFile` reads as the same single value, is
 * written.
 */

import { parse } from 'dotenv';

import { escapeExpansion } from './dotenvReference';
import { parseDotenvDocument } from './edit/parseDotenvDocument';
import type { DotenvQuote } from './edit/types';

/**
 * A formatted value: the token written after the separator and its quote style.
 *
 * @internal
 */
export interface FormattedDotenvValue {
  /** The text written after the separator (quotes included). */
  token: string;
  /** The quote style the token uses; `null` for a bare value. */
  quote: DotenvQuote | null;
}

/** Quote styles in fallback order. */
const QUOTES: readonly DotenvQuote[] = ['"', "'", '`'];

const toFileEol = (valueLf: string, fileEol: '\n' | '\r\n'): string =>
  fileEol === '\n' ? valueLf : valueLf.replace(/\n/g, '\r\n');

/**
 * The token for a value in a quote style. In double quotes a carriage return
 * is written as `\r` (dotenv expands it there); in every other form it would
 * be read as a line feed, and the check below rejects that form.
 */
const tokenFor = (
  value: string,
  quote: DotenvQuote | null,
  fileEol: '\n' | '\r\n',
): string => {
  if (quote === null) return value;
  const body = quote === '"' ? value.replace(/\r/g, '\\r') : value;
  return `${quote}${toFileEol(body, fileEol)}${quote}`;
};

/**
 * Whether dotenv reads `token` back as `value`: on its own line, and when a
 * later line ends in each quote character (where a value whose closing quote
 * doesn't close would end instead).
 */
const readsBack = (token: string, value: string): boolean => {
  const line = `K=${token}`;
  return [line, ...QUOTES.map((q) => `${line}\nZ=1 # ${q}\n`)].every(
    (text) => parse(text).K === value,
  );
};

/**
 * Whether the parser of `editDotenvFile` reads `token` as one value in quote
 * style `quote`, closed at the token's end. Without this, a form dotenv happens to
 * accept (`"a"b"`, read by dotenv as a bare value with its outer quotes
 * stripped) would be mis-split the next time `editDotenvFile` edits the file.
 */
const editorReadsBack = (token: string, quote: DotenvQuote | null): boolean => {
  const { segments } = parseDotenvDocument(`K=${token}`);
  const [seg] = segments;
  return (
    segments.length === 1 &&
    seg?.kind === 'assignment' &&
    seg.quote === quote &&
    seg.suffix === ''
  );
};

/**
 * Format a value as the token written after `KEY=`, so that dotenv's `parse`
 * and then get-dotenv's expander read it back exactly.
 *
 * A `$` the expander would act on (one that starts a reference, or follows a
 * `\`) is written as `\$`, so the value is literal: a reference can't be
 * written through this function. Forms of that text are tried in order and
 * the first that dotenv reads back unchanged is used:
 * - with `preferQuote` (the line's current quote style): that quote, then the
 *   other quotes (double, single, backtick), then bare;
 * - without: bare, then double quotes, single quotes, backticks.
 *
 * Line breaks inside a quoted value are written in `fileEol`.
 *
 * @param args - The key (for the error message), the value, the preferred
 * quote style and the file EOL.
 * @returns The token and the quote style it uses.
 * @throws Error when no form reads back unchanged (for example, a value that
 * needs quotes and contains every quote character). The message names the
 * key, never the value.
 *
 * @internal
 */
export const formatDotenvValue = (args: {
  key: string;
  value: string;
  preferQuote?: DotenvQuote | null;
  fileEol?: '\n' | '\r\n';
}): FormattedDotenvValue => {
  const { key, preferQuote = null, fileEol = '\n' } = args;
  const value = escapeExpansion(args.value);

  const order: Array<DotenvQuote | null> =
    preferQuote === null
      ? [null, ...QUOTES]
      : [preferQuote, ...QUOTES.filter((q) => q !== preferQuote), null];

  for (const quote of order) {
    const token = tokenFor(value, quote, fileEol);
    if (editorReadsBack(token, quote) && readsBack(token, value))
      return { token, quote };
  }
  throw new Error(
    `Unable to write dotenv key "${key}": dotenv cannot read its value back unchanged in any quote style.`,
  );
};
