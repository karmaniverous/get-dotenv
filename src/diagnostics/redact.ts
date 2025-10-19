/** src/diagnostics/redact.ts
 * Presentation-only redaction utilities for logs/trace.
 * - Default secret-like key patterns: SECRET, TOKEN, PASSWORD, API_KEY, KEY
 * - Optional custom patterns (regex strings) may be provided.
 * - Never alters runtime env; only affects displayed values.
 */
import type { ProcessEnv } from '../GetDotenvOptions';

export type RedactOptions = {
  redact?: boolean;
  redactPatterns?: string[];
};

const DEFAULT_PATTERNS = [
  '\\bsecret\\b',
  '\\btoken\\b',
  '\\bpass(word)?\\b',
  '\\bapi[_-]?key\\b',
  '\\bkey\\b',
];

const compile = (patterns?: string[]) =>
  (patterns && patterns.length > 0 ? patterns : DEFAULT_PATTERNS).map(
    (p) => new RegExp(p, 'i'),
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
): Record<string, string | undefined> => {
  if (!opts?.redact) return { ...obj };
  const regs = compile(opts.redactPatterns);
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v && shouldRedactKey(k, regs) ? MASK : v;
  }
  return out;
};

/**
 * Utility to redact three related displayed values (parent/dotenv/final)
 * consistently for trace lines.
 */
export const redactTriple = (
  key: string,
  triple: { parent?: string; dotenv?: string; final?: string },
  opts?: RedactOptions,
): { parent?: string; dotenv?: string; final?: string } => {
  if (!opts?.redact) return triple;
  const regs = compile(opts.redactPatterns);
  const maskIf = (v?: string) => (v && shouldRedactKey(key, regs) ? MASK : v);
  const out: { parent?: string; dotenv?: string; final?: string } = {};
  const p = maskIf(triple.parent);
  const d = maskIf(triple.dotenv);
  const f = maskIf(triple.final);
  if (p !== undefined) out.parent = p;
  if (d !== undefined) out.dotenv = d;
  if (f !== undefined) out.final = f;
  return out;
};
