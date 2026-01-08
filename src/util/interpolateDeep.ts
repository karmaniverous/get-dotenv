/**
 * Deep interpolation utility for string leaves.
 * - Expands string values using dotenv-style expansion against the provided envRef.
 * - Preserves non-strings as-is.
 * - Does not recurse into arrays (arrays are returned unchanged).
 *
 * Intended for:
 * - Phase C option/config interpolation after composing ctx.dotenv.
 * - Per-plugin config slice interpolation before afterResolve.
 */
import { isObject } from 'radash';

import type { ProcessEnv } from '@/src/core';
import { dotenvExpand } from '@/src/dotenv';

/** @internal */
const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  return isObject(v) && !Array.isArray(v);
};

/**
 * Deeply interpolate string leaves against envRef.
 * Arrays are not recursed into; they are returned unchanged.
 *
 * @typeParam T - Shape of the input value.
 * @param value - Input value (object/array/primitive).
 * @param envRef - Reference environment for interpolation.
 * @returns A new value with string leaves interpolated.
 */
export const interpolateDeep = <T>(value: T, envRef: ProcessEnv): T => {
  // Strings: expand and return
  if (typeof value === 'string') {
    const out = dotenvExpand(value, envRef);
    // dotenvExpand returns string | undefined; preserve original on undefined
    return (out ?? value) as unknown as T;
  }
  // Arrays: return as-is (no recursion)
  if (Array.isArray(value)) {
    return value;
  }
  // Plain objects: shallow clone and recurse into values
  if (isPlainObject(value)) {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      // Recurse for strings/objects; keep arrays as-is; preserve other scalars
      if (typeof v === 'string') out[k] = dotenvExpand(v, envRef) ?? v;
      else if (Array.isArray(v)) out[k] = v;
      else if (isPlainObject(v)) out[k] = interpolateDeep(v, envRef);
      else out[k] = v;
    }
    return out as unknown as T;
  }
  // Other primitives/types: return as-is
  return value;
};
