/**
 * @packageDocumentation
 * Dotenv value formatting: how a value is written to a dotenv line (bare or
 * quoted, and with what escaping).
 */

const needsQuoted = (value: string, hasInlineSuffix: boolean): boolean => {
  if (value.includes('\n')) return true;
  if (value.includes('\r')) return true;
  // Preserve correctness: leading/trailing whitespace should be quoted.
  if (/^\s|\s$/.test(value)) return true;
  // Inline comment safety: if there is a suffix (comment) and the value contains '#', quote it.
  if (hasInlineSuffix && value.includes('#')) return true;
  return false;
};

const escapeDoubleQuoted = (value: string): string =>
  // Minimal escaping: escape only `"`. (Do not force-escape backslashes.)
  value.replace(/"/g, '\\"');

const toFileEol = (valueLf: string, fileEol: '\n' | '\r\n'): string =>
  fileEol === '\n' ? valueLf : valueLf.replace(/\n/g, '\r\n');

/**
 * A formatted value: the token written after the separator and its quote style.
 *
 * @internal
 */
export interface FormattedDotenvValue {
  /** The text written after the separator (quotes included). */
  token: string;
  /** The quote style the token uses; `null` for a bare value. */
  quote: '"' | "'" | null;
}

/**
 * Render a value as the token written after `KEY=`.
 *
 * @param args - The value, the preferred quote style, whether the line has an
 * inline comment suffix, and the file EOL.
 * @returns The token and the quote style it uses.
 *
 * @internal
 */
export const formatDotenvValue = (args: {
  value: string;
  preferQuote: '"' | "'" | null;
  hasInlineSuffix: boolean;
  fileEol: '\n' | '\r\n';
}): FormattedDotenvValue => {
  const { value, preferQuote, hasInlineSuffix, fileEol } = args;

  const multiline = value.includes('\n');
  if (multiline) {
    // Multiline correctness: use double quotes.
    return {
      token: `"${toFileEol(escapeDoubleQuoted(value), fileEol)}"`,
      quote: '"',
    };
  }

  const mustQuote = needsQuoted(value, hasInlineSuffix);
  if (!mustQuote && preferQuote === null) return { token: value, quote: null };

  // Try to preserve original quote style when safe.
  if (preferQuote === "'" && !value.includes("'") && !mustQuote) {
    return { token: `'${value}'`, quote: "'" };
  }
  if (preferQuote === "'" && !value.includes("'")) {
    return { token: `'${value}'`, quote: "'" };
  }

  // Prefer double quotes as the general safe fallback.
  return { token: `"${escapeDoubleQuoted(value)}"`, quote: '"' };
};
