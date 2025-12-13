import type { ProcessEnv } from '@/src/core';

import { type EntropyOptions, maybeWarnEntropy } from './entropy';
import { type RedactOptions, redactTriple } from './redact';

/**
 * Options for tracing composed child environment variables.
 *
 * Presentation-only: values are never mutated; output is written to {@link write}.
 *
 * @public
 */
export interface TraceChildEnvOptions
  extends Pick<RedactOptions, 'redact' | 'redactPatterns'>,
    EntropyOptions {
  /**
   * Parent process environment (source).
   */
  parentEnv: ProcessEnv;
  /**
   * Composed dotenv map (target).
   */
  dotenv: ProcessEnv;
  /**
   * Optional subset of keys to trace. When omitted, all keys are traced.
   */
  keys?: string[];
  /**
   * Sink for trace lines (e.g., write to stderr).
   */
  write: (line: string) => void;
}

/**
 * Trace child env composition with redaction and entropy warnings.
 * Presentation-only: does not mutate env; writes lines via the provided sink.
 */
export function traceChildEnv(opts: TraceChildEnvOptions): void {
  const {
    parentEnv,
    dotenv,
    keys,
    redact,
    redactPatterns,
    warnEntropy,
    entropyThreshold,
    entropyMinLength,
    entropyWhitelist,
    write,
  } = opts;

  const parentKeys = Object.keys(parentEnv);
  const dotenvKeys = Object.keys(dotenv);
  const allKeys = Array.from(new Set([...parentKeys, ...dotenvKeys])).sort();
  const effectiveKeys = Array.isArray(keys) && keys.length > 0 ? keys : allKeys;

  // Redaction options for display
  const redOpts: RedactOptions = {};
  if (redact) {
    redOpts.redact = true;
    if (Array.isArray(redactPatterns)) redOpts.redactPatterns = redactPatterns;
  }
  // Entropy warning options
  const entOpts: EntropyOptions = {};
  if (typeof warnEntropy === 'boolean') entOpts.warnEntropy = warnEntropy;
  if (typeof entropyThreshold === 'number')
    entOpts.entropyThreshold = entropyThreshold;
  if (typeof entropyMinLength === 'number')
    entOpts.entropyMinLength = entropyMinLength;
  if (Array.isArray(entropyWhitelist))
    entOpts.entropyWhitelist = entropyWhitelist;

  for (const k of effectiveKeys) {
    const parentVal = parentEnv[k];
    const dot = dotenv[k];
    const final = dot !== undefined ? dot : parentVal;
    const origin =
      dot !== undefined
        ? 'dotenv'
        : parentVal !== undefined
          ? 'parent'
          : 'unset';
    const tripleIn: { parent?: string; dotenv?: string; final?: string } = {};
    if (parentVal !== undefined) tripleIn.parent = parentVal;
    if (dot !== undefined) tripleIn.dotenv = dot;
    if (final !== undefined) tripleIn.final = final;
    const triple = redactTriple(k, tripleIn, redOpts);
    write(
      `[trace] key=${k} origin=${origin} parent=${triple.parent ?? ''} dotenv=${triple.dotenv ?? ''} final=${triple.final ?? ''}`,
    );
    maybeWarnEntropy(k, final, origin, entOpts, (line) => {
      write(line);
    });
  }
}
