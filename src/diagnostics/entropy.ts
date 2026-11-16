/** src/diagnostics/entropy.ts
 * Entropy diagnostics (presentation-only).
 * - Gated by min length and printable ASCII.
 * - Warn once per key per run when bits/char \>= threshold.
 * - Supports whitelist patterns to suppress known-noise keys.
 */
import { compileKeyPatterns } from './keyPatterns';

const warned = new Set<string>();

/**
 * Configuration options for entropy analysis.
 *
 * @public
 */
export interface EntropyOptions {
  /** Enable entropy warnings (on unless `false`). */
  warnEntropy?: boolean | undefined;
  /** Entropy threshold (bits/char; default 3.8). */
  entropyThreshold?: number | undefined;
  /** Minimum string length to check (default 16). */
  entropyMinLength?: number | undefined;
  /**
   * Key patterns (strings match case-insensitively, or RegExps) whose
   * values are never checked. A RegExp is used without its `g` and `y`
   * flags. Used as given here; the CLI host and `getDotenv` pass the
   * built-in whitelist plus the user's patterns.
   */
  entropyWhitelist?: Array<string | RegExp> | undefined;
}

const isPrintableAscii = (s: string) => /^[\x20-\x7E]+$/.test(s);

const compile = (patterns?: Array<string | RegExp>) =>
  compileKeyPatterns(patterns ?? []);

const whitelisted = (key: string, regs: RegExp[]) =>
  regs.some((re) => re.test(key));

const shannonBitsPerChar = (s: string): number => {
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const n = s.length;
  let h = 0;
  for (const c of freq.values()) {
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
};

/**
 * Maybe emit a one-line entropy warning for a key.
 * Caller supplies an `emit(line)` function; the helper ensures once-per-key.
 */
export const maybeWarnEntropy = (
  key: string,
  value: string | undefined,
  origin: 'dotenv' | 'parent' | 'unset',
  opts: EntropyOptions | undefined,
  emit: (line: string) => void,
) => {
  if (!opts || opts.warnEntropy === false) return;
  if (warned.has(key)) return;
  const v = value ?? '';
  const minLen = Math.max(0, opts.entropyMinLength ?? 16);
  const threshold = opts.entropyThreshold ?? 3.8;
  if (v.length < minLen) return;
  if (!isPrintableAscii(v)) return;
  const wl = compile(opts.entropyWhitelist);
  if (whitelisted(key, wl)) return;
  const bpc = shannonBitsPerChar(v);
  if (bpc >= threshold) {
    warned.add(key);
    emit(
      `[entropy] key=${key} score=${bpc.toFixed(2)} len=${String(v.length)} origin=${origin}`,
    );
  }
};
