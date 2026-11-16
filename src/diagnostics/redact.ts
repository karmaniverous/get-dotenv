/** src/diagnostics/redact.ts
 * Presentation-only redaction utilities for logs/trace.
 * - Built-in secret-like key patterns: secret, token, pass/password,
 *   api_key/api-key/apikey and key, each as a whole word or as an
 *   underscore- or dash-delimited segment of the key (`API_SECRET`,
 *   `DB_PASSWORD`, `GITHUB_TOKEN`), case-insensitive.
 * - Custom patterns (regex strings or RegExps) add to the built-in list. A
 *   RegExp's `g` and `y` flags are ignored, so every key is tested afresh.
 * - Never alters runtime env; only affects displayed values.
 */
import type { ProcessEnv } from '@/src/core';

import { compileKeyPatterns } from './keyPatterns';

/**
 * Configuration options for secret redaction.
 *
 * @public
 */
export interface RedactOptions {
  /** Enable redaction. */
  redact?: boolean | undefined;
  /**
   * Additional key patterns to redact: they add to the built-in patterns.
   * String patterns match case-insensitively. A RegExp is used without its
   * `g` and `y` flags, so it matches every key, not every other one.
   */
  redactPatterns?: Array<string | RegExp> | undefined;
}

/**
 * A built-in word matches as a whole word or as an underscore- or
 * dash-delimited segment: no letter or digit on either side (`_` and `-`
 * are word characters for `\b`, so `\bsecret\b` misses `API_SECRET`).
 */
const segment = (word: string) => `(?<![a-z0-9])(?:${word})(?![a-z0-9])`;

const DEFAULT_PATTERNS = [
  'secret',
  'token',
  'pass(?:word)?',
  'api[_-]?key',
  'key',
].map(segment);

const compile = (patterns?: Array<string | RegExp>) =>
  compileKeyPatterns([...DEFAULT_PATTERNS, ...(patterns ?? [])]);

const shouldRedactKey = (key: string, regs: RegExp[]) =>
  regs.some((re) => re.test(key));

/** What a redacted value is shown as. */
export const REDACTION_MASK = '[redacted]';
const MASK = REDACTION_MASK;

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
