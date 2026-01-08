/**
 * Parse a value into a number or undefined.
 *
 * @param v - Value to parse.
 * @returns The parsed number, or undefined if the input was undefined or empty string.
 */
export const toNumber = (v: unknown): number | undefined => {
  if (typeof v === 'undefined') return;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim()) return Number(v);
  return;
};
