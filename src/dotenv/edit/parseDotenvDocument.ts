/**
 * Parse a dotenv file into a format-preserving document model.
 *
 * Requirements addressed:
 * - Preserve comments, blank lines, ordering, and unknown lines verbatim.
 * - Preserve separator spacing around `=`.
 * - Support multiline quoted values (double/single quotes) by grouping physical lines.
 *
 * @packageDocumentation
 */

import type {
  DotenvAssignmentSegment,
  DotenvBareKeySegment,
  DotenvDocument,
  DotenvRawSegment,
  DotenvSegment,
} from './types';

type LineWithEol = { line: string; eol: '' | '\n' | '\r\n' };

const detectFileEol = (txt: string): '\n' | '\r\n' =>
  txt.includes('\r\n') ? '\r\n' : '\n';

const endsWithNewline = (txt: string): boolean =>
  txt.endsWith('\n') || txt.endsWith('\r\n');

const splitLinesWithEol = (txt: string): LineWithEol[] => {
  const out: LineWithEol[] = [];
  let start = 0;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt.charAt(i);
    if (ch !== '\n') continue;
    const isCrlf = i > 0 && txt.charAt(i - 1) === '\r';
    const line = txt.slice(start, isCrlf ? i - 1 : i);
    out.push({ line, eol: isCrlf ? '\r\n' : '\n' });
    start = i + 1;
  }
  if (start < txt.length) {
    out.push({ line: txt.slice(start), eol: '' });
  } else if (txt.length === 0) {
    out.push({ line: '', eol: '' });
  }
  return out;
};

const normalizeInnerNewlinesToLf = (v: string): string =>
  v.replace(/\r\n/g, '\n');

const findFirstNonWhitespace = (s: string): number => {
  for (let i = 0; i < s.length; i++) {
    if (!/\s/.test(s.charAt(i))) return i;
  }
  return -1;
};

const splitInlineCommentUnquoted = (
  rhs: string,
): { value: string; suffix: string } => {
  // Match a `#` that is preceded by whitespace; keep all whitespace before `#` with the suffix.
  for (let i = 0; i < rhs.length; i++) {
    const ch = rhs.charAt(i);
    if (ch !== '#') continue;
    if (i === 0) return { value: '', suffix: rhs };
    const prev = rhs.charAt(i - 1);
    if (!/\s/.test(prev)) continue;
    let j = i;
    while (j > 0 && /\s/.test(rhs.charAt(j - 1))) j--;
    return { value: rhs.slice(0, j), suffix: rhs.slice(j) };
  }
  return { value: rhs, suffix: '' };
};

type QuotedParseResult = {
  endIndex: number;
  value: string;
  suffix: string;
};

const tryParseQuotedValueAcrossLines = (
  lines: LineWithEol[],
  startIndex: number,
  startRhs: string,
  quote: '"' | "'",
): QuotedParseResult | null => {
  // Parse the quoted value beginning at the first quote in startRhs.
  // Returns null if a closing quote is never found (to avoid corrupting segmentation).
  let idx = startIndex;
  let rhs = startRhs;

  const firstQuoteIdx = rhs.indexOf(quote);
  if (firstQuoteIdx < 0) return null;

  // Value text begins after the opening quote.
  let cursor = firstQuoteIdx + 1;
  let escaped = false;
  let valueOut = '';

  while (idx < lines.length) {
    for (; cursor < rhs.length; cursor++) {
      const ch = rhs.charAt(cursor);
      if (escaped) {
        valueOut += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        // Preserve backslashes; caller may choose to re-escape on render.
        valueOut += ch;
        escaped = true;
        continue;
      }
      if (ch === quote) {
        // Closing quote: suffix is the remainder of this physical line after the closing quote.
        return {
          endIndex: idx,
          value: normalizeInnerNewlinesToLf(valueOut),
          suffix: rhs.slice(cursor + 1),
        };
      }
      valueOut += ch;
    }

    // Move to next physical line; insert a newline into the value.
    idx += 1;
    if (idx >= lines.length) break;
    // If the file ended without a newline, we still treat the join as a newline inside the quoted value.
    valueOut += '\n';
    const next = lines[idx];
    if (!next) break;
    rhs = next.line;
    cursor = 0;
    escaped = false;
  }

  return null;
};

const parseKeyPrefix = (
  line: string,
): { prefix: string; key: string; rest: string } | null => {
  // Allow: indentation + optional "export " + KEY
  // KEY must be a shell-ish identifier.
  const m = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(.*)$/.exec(line);
  if (!m) return null;
  const prefix = m[1] ?? '';
  const key = m[2] ?? '';
  const rest = m[3] ?? '';
  if (!key) return null;
  return { prefix, key, rest };
};

/**
 * Parse dotenv text into a document model that preserves formatting.
 *
 * @param text - Dotenv file contents as UTF-8 text.
 * @returns A parsed {@link DotenvDocument}.
 *
 * @public
 */
export function parseDotenvDocument(text: string): DotenvDocument {
  const fileEol = detectFileEol(text);
  const trailingNewline = endsWithNewline(text);
  const lines = splitLinesWithEol(text);

  const segments: DotenvSegment[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    if (!cur) continue;
    const line = cur.line;
    const eol = cur.eol;

    const parsed = parseKeyPrefix(line);
    if (!parsed) {
      const rawSeg: DotenvRawSegment = { kind: 'raw', raw: line + eol };
      segments.push(rawSeg);
      continue;
    }

    const { prefix, key, rest } = parsed;
    const mAssign = /^(\s*=\s*)(.*)$/.exec(rest);
    if (mAssign) {
      const separator = mAssign[1] ?? '=';
      const rhs = mAssign[2] ?? '';

      // Preserve whitespace between separator and first token.
      const nonWs = findFirstNonWhitespace(rhs);
      const valuePadding = nonWs >= 0 ? rhs.slice(0, nonWs) : rhs;
      const tokenStart = nonWs >= 0 ? rhs.charAt(nonWs) : '';

      // Try quoted parsing first (single-line or multiline).
      if (tokenStart === '"' || tokenStart === "'") {
        const quote: '"' | "'" = tokenStart === '"' ? '"' : "'";
        const parsedQuoted = tryParseQuotedValueAcrossLines(
          lines,
          i,
          rhs,
          quote,
        );
        if (parsedQuoted) {
          const endIndex = parsedQuoted.endIndex;
          const raw = lines
            .slice(i, endIndex + 1)
            .map((l) => l.line + l.eol)
            .join('');
          const endEol = lines[endIndex]?.eol ?? '';

          const seg: DotenvAssignmentSegment = {
            kind: 'assignment',
            raw,
            key,
            prefix,
            separator,
            valuePadding,
            quote,
            value: parsedQuoted.value,
            suffix: parsedQuoted.suffix,
            eol: endEol,
          };
          segments.push(seg);
          i = endIndex;
          continue;
        }
        // If quote is unclosed, preserve the line verbatim as raw.
        // This avoids accidentally “parsing” malformed lines and losing formatting.
        const rawSeg: DotenvRawSegment = { kind: 'raw', raw: line + eol };
        segments.push(rawSeg);
        continue;
      }

      // Unquoted single-line value: split inline comments.
      const { value, suffix } = splitInlineCommentUnquoted(rhs);
      const seg: DotenvAssignmentSegment = {
        kind: 'assignment',
        raw: line + eol,
        key,
        prefix,
        separator,
        valuePadding,
        quote: null,
        value,
        suffix,
        eol,
      };
      segments.push(seg);
      continue;
    }

    // Bare-key placeholder (KEY or KEY # comment). Only accept whitespace/comment in rest.
    const mBare = /^(\s*)(#.*)?$/.exec(rest);
    if (mBare) {
      const suffix = (mBare[1] ?? '') + (mBare[2] ?? '');
      const seg: DotenvBareKeySegment = {
        kind: 'bare',
        raw: line + eol,
        key,
        prefix,
        suffix,
        eol,
      };
      segments.push(seg);
      continue;
    }

    // Unknown/unsupported syntax for this line: preserve verbatim.
    const rawSeg: DotenvRawSegment = { kind: 'raw', raw: line + eol };
    segments.push(rawSeg);
  }

  return { fileEol, trailingNewline, segments };
}
