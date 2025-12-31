/**
 * Apply edits to a parsed dotenv document while preserving formatting.
 *
 * Requirements addressed:
 * - Mode: merge vs sync.
 * - Duplicate key strategy: all/first/last.
 * - undefined behavior: skip (default).
 * - null behavior: delete (default).
 * - Quote preservation where safe; upgrade quoting when required (multiline, whitespace safety, inline comment safety).
 *
 * @packageDocumentation
 */

import type {
  DotenvAssignmentSegment,
  DotenvBareKeySegment,
  DotenvDocument,
  DotenvDuplicateKeyStrategy,
  DotenvEditMode,
  DotenvNullBehavior,
  DotenvSegment,
  DotenvUndefinedBehavior,
  DotenvUpdateMap,
  DotenvUpdateValue,
} from './types';
import { hasOwn } from './types';

const coerceToString = (v: DotenvUpdateValue): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v === null || v === undefined) return '';
  return JSON.stringify(v);
};

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

const renderValueToken = (args: {
  value: string;
  preferQuote: '"' | "'" | null;
  hasInlineSuffix: boolean;
  fileEol: '\n' | '\r\n';
}): { token: string; quote: '"' | "'" | null } => {
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

const pickIndexes = (
  idxs: number[],
  strategy: DotenvDuplicateKeyStrategy,
): number[] => {
  if (idxs.length === 0) return [];
  if (strategy === 'first') {
    const first = idxs[0];
    return first === undefined ? [] : [first];
  }
  if (strategy === 'last') {
    const last = idxs[idxs.length - 1];
    return last === undefined ? [] : [last];
  }
  return idxs.slice();
};

const segmentEndEol = (seg: DotenvSegment): '' | '\n' | '\r\n' => {
  if ('eol' in seg) return seg.eol;
  // Raw segments store EOL inside raw; best-effort detect tail.
  const raw = seg.raw;
  if (raw.endsWith('\r\n')) return '\r\n';
  if (raw.endsWith('\n')) return '\n';
  return '';
};

const rebuildAssignmentRaw = (args: {
  seg: DotenvAssignmentSegment;
  valueLf: string;
  fileEol: '\n' | '\r\n';
}): DotenvAssignmentSegment => {
  const { seg, valueLf, fileEol } = args;
  const { token, quote } = renderValueToken({
    value: valueLf,
    preferQuote: seg.quote,
    hasInlineSuffix: seg.suffix.length > 0,
    fileEol,
  });
  const line = `${seg.prefix}${seg.key}${seg.separator}${seg.valuePadding}${token}${seg.suffix}`;
  const eol = segmentEndEol(seg);
  const raw = eol ? line + eol : line;
  return { ...seg, raw, value: valueLf, quote, eol };
};

const rebuildBareAsAssignment = (args: {
  seg: DotenvBareKeySegment;
  valueLf: string;
  fileEol: '\n' | '\r\n';
  defaultSeparator: string;
}): DotenvAssignmentSegment => {
  const { seg, valueLf, fileEol, defaultSeparator } = args;
  const { token, quote } = renderValueToken({
    value: valueLf,
    preferQuote: null,
    hasInlineSuffix: seg.suffix.length > 0,
    fileEol,
  });
  const separator = defaultSeparator;
  const line = `${seg.prefix}${seg.key}${separator}${token}${seg.suffix}`;
  const eol = segmentEndEol(seg);
  const raw = eol ? line + eol : line;
  return {
    kind: 'assignment',
    raw,
    key: seg.key,
    prefix: seg.prefix,
    separator,
    valuePadding: '',
    quote,
    value: valueLf,
    suffix: seg.suffix,
    eol,
  };
};

const buildNewAssignmentAtEnd = (args: {
  key: string;
  valueLf: string;
  fileEol: '\n' | '\r\n';
  defaultSeparator: string;
  endEol: '' | '\n' | '\r\n';
}): DotenvAssignmentSegment => {
  const { key, valueLf, fileEol, defaultSeparator, endEol } = args;
  const { token, quote } = renderValueToken({
    value: valueLf,
    preferQuote: null,
    hasInlineSuffix: false,
    fileEol,
  });
  const line = `${key}${defaultSeparator}${token}`;
  const raw = endEol ? line + endEol : line;
  return {
    kind: 'assignment',
    raw,
    key,
    prefix: '',
    separator: defaultSeparator,
    valuePadding: '',
    quote,
    value: valueLf,
    suffix: '',
    eol: endEol,
  };
};

/**
 * Apply a set of key/value updates to a parsed dotenv document.
 *
 * @param doc - Parsed dotenv document.
 * @param updates - Key/value update map.
 * @param opts - Editing options.
 * @returns A new {@link DotenvDocument} with edits applied.
 *
 * @public
 */
export function applyDotenvEdits(
  doc: DotenvDocument,
  updates: DotenvUpdateMap,
  opts?: {
    mode?: DotenvEditMode;
    duplicateKeys?: DotenvDuplicateKeyStrategy;
    undefinedBehavior?: DotenvUndefinedBehavior;
    nullBehavior?: DotenvNullBehavior;
    defaultSeparator?: string;
  },
): DotenvDocument {
  const mode: DotenvEditMode = opts?.mode ?? 'merge';
  const duplicateKeys: DotenvDuplicateKeyStrategy =
    opts?.duplicateKeys ?? 'all';
  const undefinedBehavior: DotenvUndefinedBehavior =
    opts?.undefinedBehavior ?? 'skip';
  const nullBehavior: DotenvNullBehavior = opts?.nullBehavior ?? 'delete';
  const defaultSeparator = opts?.defaultSeparator ?? '=';

  const segs = doc.segments.slice();

  // Index key-bearing segments.
  const byKey = new Map<string, number[]>();
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (!s) continue;
    if (s.kind === 'assignment' || s.kind === 'bare') {
      const list = byKey.get(s.key) ?? [];
      list.push(i);
      byKey.set(s.key, list);
    }
  }

  const deleteIdx = new Set<number>();
  const replace = new Map<number, DotenvSegment>();

  // Sync deletions: remove any existing key lines not present in update map (own props).
  if (mode === 'sync') {
    for (const [key, idxs] of byKey.entries()) {
      if (!hasOwn(updates, key)) {
        for (const i of idxs) deleteIdx.add(i);
      }
    }
  }

  // Apply update-driven deletes and replacements.
  for (const key of Object.keys(updates)) {
    const v = updates[key];
    const idxsAll = byKey.get(key) ?? [];

    if (v === null && nullBehavior === 'delete') {
      for (const i of pickIndexes(idxsAll, duplicateKeys)) deleteIdx.add(i);
      continue;
    }

    if (v === undefined && undefinedBehavior === 'skip') {
      // Note: in sync mode, this key counts as present (do not delete); replacements are skipped.
      continue;
    }

    const valueLf = coerceToString(v);
    for (const i of pickIndexes(idxsAll, duplicateKeys)) {
      const seg = segs[i];
      if (!seg) continue;
      if (seg.kind === 'assignment') {
        replace.set(
          i,
          rebuildAssignmentRaw({ seg, valueLf, fileEol: doc.fileEol }),
        );
      } else if (seg.kind === 'bare') {
        replace.set(
          i,
          rebuildBareAsAssignment({
            seg,
            valueLf,
            fileEol: doc.fileEol,
            defaultSeparator,
          }),
        );
      }
    }
  }

  // Rebuild the segment list, applying deletions and replacements.
  const out: DotenvSegment[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (deleteIdx.has(i)) continue;
    const repl = replace.get(i);
    const original = segs[i];
    if (repl) out.push(repl);
    else if (original) out.push(original);
  }

  // Merge mode: append missing keys (only when provided with a concrete value).
  if (mode === 'merge') {
    const existingKeys = new Set<string>();
    for (const s of out) {
      if (s.kind === 'assignment' || s.kind === 'bare') existingKeys.add(s.key);
    }

    // Use the document EOL when inserting new lines; final newline presence is handled by render().
    const endEol: '' | '\n' | '\r\n' = doc.fileEol;
    for (const key of Object.keys(updates)) {
      if (existingKeys.has(key)) continue;
      const v = updates[key];
      if (v === undefined) continue;
      if (v === null) continue;
      const valueLf = coerceToString(v);
      out.push(
        buildNewAssignmentAtEnd({
          key,
          valueLf,
          fileEol: doc.fileEol,
          defaultSeparator,
          endEol,
        }),
      );
    }
  }

  return { ...doc, segments: out };
}
