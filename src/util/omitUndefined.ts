/** src/util/omitUndefined.ts
 * Helpers to drop undefined-valued properties in a typed-friendly way.
 */

/**
 * Omit keys whose runtime value is undefined from a shallow object.
 * Returns a Partial with non-undefined value types preserved.
 *
 * @typeParam T - Input object shape.
 * @param obj - Object to filter.
 * @returns A shallow copy of `obj` without keys whose value is `undefined`.
 */
export function omitUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<{ [K in keyof T]: Exclude<T[K], undefined> }> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<{ [K in keyof T]: Exclude<T[K], undefined> }>;
}

/**
 * Specialized helper for env-like maps: drop undefined and return string-only.
 *
 * @typeParam V - Value type for present entries (must extend `string`).
 * @param obj - Env-like record containing `string | undefined` values.
 * @returns A new record containing only the keys with defined values.
 */
export function omitUndefinedRecord<V extends string>(
  obj: Record<string, V | undefined>,
): Record<string, V> {
  const out: Record<string, V> = {} as Record<string, V>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
