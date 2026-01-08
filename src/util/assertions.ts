import { Buffer } from 'node:buffer';

/**
 * Assert that a value is a non-empty string.
 *
 * @param v - Value to check.
 * @param msg - Error message to throw if check fails.
 */
export const requireString = (v: unknown, msg: string): string => {
  if (typeof v !== 'string' || !v) throw new Error(msg);
  return v;
};

/**
 * Assert that the byte length of a value (stringified) does not exceed a limit.
 *
 * @param value - Value to measure (strings used as-is; others JSON-stringified).
 * @param limit - Maximum allowed byte length.
 * @param errorMsg - Error message string or generator function.
 */
export const assertByteLimit = (
  value: unknown,
  limit: number,
  errorMsg: string | ((v: unknown, l: number) => string),
): void => {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const bytes = Buffer.byteLength(s, 'utf8');
  if (bytes > limit) {
    const msg =
      typeof errorMsg === 'function' ? errorMsg(value, limit) : errorMsg;
    throw new Error(msg);
  }
};
