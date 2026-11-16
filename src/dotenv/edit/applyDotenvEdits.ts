/**
 * Apply edits to a parsed dotenv document while preserving formatting.
 *
 * Requirements addressed:
 * - Mode: merge vs sync.
 * - Duplicate key strategy: all/first/last.
 * - undefined behavior: skip (default).
 * - null behavior: delete (default).
 * - Values are written so dotenv reads them back exactly (formatDotenvValue): the line's quote
 *   style is kept when it can hold the value; otherwise another quote style, or bare.
 *
 * @packageDocumentation
 */

import { formatDotenvValue } from '../formatDotenvValue';
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

/** Give a segment whose last line has no EOL the file EOL; other segments are returned as is. */
const withEndEol = (
  seg: DotenvSegment,
  fileEol: '\n' | '\r\n',
): DotenvSegment => {
  if (segmentEndEol(seg) !== '') return seg;
  const raw = seg.raw + fileEol;
  return seg.kind === 'raw' ? { ...seg, raw } : { ...seg, raw, eol: fileEol };
};

const rebuildAssignmentRaw = (args: {
  seg: DotenvAssignmentSegment;
  valueLf: string;
  fileEol: '\n' | '\r\n';
}): DotenvAssignmentSegment => {
  const { seg, valueLf, fileEol } = args;
  const { token, quote } = formatDotenvValue({
    key: seg.key,
    value: valueLf,
    preferQuote: seg.quote,
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
  const { token, quote } = formatDotenvValue({
    key: seg.key,
    value: valueLf,
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
  const { token, quote } = formatDotenvValue({
    key,
    value: valueLf,
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
 * Append an assignment for each update key that has a concrete value and no
 * line in `segs`, in update-map order.
 */
const appendMissingKeys = (
  segs: DotenvSegment[],
  updates: DotenvUpdateMap,
  fileEol: '\n' | '\r\n',
  defaultSeparator: string,
): DotenvSegment[] => {
  const existingKeys = new Set<string>();
  for (const s of segs) {
    if (s.kind === 'assignment' || s.kind === 'bare') existingKeys.add(s.key);
  }

  // Use the document EOL when inserting new lines; final newline presence is handled by render().
  const appended: DotenvSegment[] = [];
  for (const key of Object.keys(updates)) {
    if (existingKeys.has(key)) continue;
    const v = updates[key];
    if (v === undefined) continue;
    if (v === null) continue;
    appended.push(
      buildNewAssignmentAtEnd({
        key,
        valueLf: coerceToString(v),
        fileEol,
        defaultSeparator,
        endEol: fileEol,
      }),
    );
  }
  if (appended.length === 0) return segs;

  // A last line with no EOL (no final newline) gets one, so the first new
  // line starts on its own line (#66). render() still drops the final newline.
  const out = segs.slice();
  const last = out.at(-1);
  if (last && last.raw !== '') out[out.length - 1] = withEndEol(last, fileEol);
  return [...out, ...appended];
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

    if (v === null) {
      for (const i of pickIndexes(idxsAll, duplicateKeys)) deleteIdx.add(i);
      continue;
    }

    if (v === undefined) {
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

  // Both modes append missing keys: sync upserts, so the file ends up with
  // exactly the given keys (#67, Decision 22).
  return {
    ...doc,
    segments: appendMissingKeys(out, updates, doc.fileEol, defaultSeparator),
  };
}
