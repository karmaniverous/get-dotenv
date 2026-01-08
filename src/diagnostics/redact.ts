/** src/diagnostics/redact.ts
 * Presentation-only redaction utilities for logs/trace.
 * - Default secret-like key patterns: SECRET, TOKEN, PASSWORD, API_KEY, KEY
 * - Optional custom patterns (regex strings) may be provided.
 * - Never alters runtime env; only affects displayed values.
 */
import type { ProcessEnv } from '@/src/core';

/**
 * Configuration options for secret redaction.
 *
 * @public
 */
export interface RedactOptions {
  /** Enable redaction. */
  redact?: boolean;
  /** Regex patterns for keys to redact. */
  redactPatterns?: Array<string | RegExp>;
}

const DEFAULT_PATTERNS = [
  '\\bsecret\\b',
  '\\btoken\\b',
  '\\bpass(word)?\\b',
  '\\bapi[_-]?key\\b',
  '\\bkey\\b',
];

const compile = (patterns?: Array<string | RegExp>) =>
  (patterns && patterns.length > 0 ? patterns : DEFAULT_PATTERNS).map((p) =>
    typeof p === 'string' ? new RegExp(p, 'i') : p,
  );

const shouldRedactKey = (key: string, regs: RegExp[]) =>
  regs.some((re) => re.test(key));

const MASK = '[redacted]';

/**
 * Redact a single displayed value according to key/patterns.
 * Returns the original value when redaction is disabled or key is not matched.
 */
export const redactDisplay = (
  key: string,
  value: string | undefined,
  opts?: RedactOptions,
): string | undefined => {
  if (!value) return value;
  if (!opts?.redact) return value;
  const regs = compile(opts.redactPatterns);
  return shouldRedactKey(key, regs) ? MASK : value;
};

/**
 * Produce a shallow redacted copy of an env-like object for display.
 */
export const redactObject = (
  obj: ProcessEnv,
  opts?: RedactOptions,
): ProcessEnv => {
  if (!opts?.redact) return { ...obj };
  const regs = compile(opts.redactPatterns);
  const out: ProcessEnv = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v && shouldRedactKey(k, regs) ? MASK : v;
  }
  return out;
};

/**
 * Triple of related values used by trace diagnostics:
 * - `parent`: value from the parent process environment
 * - `dotenv`: value from the composed dotenv map
 * - `final`: effective value for the child process
 *
 * @public
 */
export interface RedactTripleValues {
  /**
   * Value from the parent process environment.
   */
  parent?: string;
  /**
   * Value from the composed dotenv map.
   */
  dotenv?: string;
  /**
   * Effective final value for the child process.
   */
  final?: string;
}

/**
 * Utility to redact three related displayed values (parent/dotenv/final)
 * consistently for trace lines.
 */
export const redactTriple = (
  key: string,
  triple: RedactTripleValues,
  opts?: RedactOptions,
): RedactTripleValues => {
  if (!opts?.redact) return triple;
  const regs = compile(opts.redactPatterns);
  const maskIf = (v?: string) => (v && shouldRedactKey(key, regs) ? MASK : v);
  const out: RedactTripleValues = {};
  const p = maskIf(triple.parent);
  const d = maskIf(triple.dotenv);
  const f = maskIf(triple.final);
  if (p !== undefined) out.parent = p;
  if (d !== undefined) out.dotenv = d;
  if (f !== undefined) out.final = f;
  return out;
};
