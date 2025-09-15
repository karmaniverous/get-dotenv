/**
 * Plain-object deep merge with "later overrides earlier" semantics.
 * - Only merges plain objects (prototype === Object.prototype).
 * - Arrays and non-objects are replaced, not concatenated or merged.
 * - Undefined values are ignored (do not overwrite).
 *
 * Merge order: defaultsDeep(base, override1, override2) → override2 wins.
 */
/** @internal */
type AnyRecord = Record<string, unknown>;

/** @internal */
const isPlainObject = (value: unknown): value is AnyRecord =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype;
const mergeInto = (target: AnyRecord, source: AnyRecord): AnyRecord => {
  for (const [key, sVal] of Object.entries(source)) {
    if (sVal === undefined) continue; // do not overwrite with undefined
    const tVal = target[key];
    if (isPlainObject(tVal) && isPlainObject(sVal)) {
      target[key] = mergeInto({ ...tVal }, sVal);
    } else if (isPlainObject(sVal)) {
      target[key] = mergeInto({}, sVal);
    } else {
      target[key] = sVal;
    }
  }
  return target;
};

/**
 * Perform a deep defaults-style merge across plain objects. *
 * - Only merges plain objects (prototype === Object.prototype).
 * - Arrays and non-objects are replaced, not merged.
 * - `undefined` values are ignored and do not overwrite prior values.
 *
 * @typeParam T - The resulting shape after merging all layers.
 * @param layers - Zero or more partial layers in ascending precedence order.
 * @returns The merged object typed as {@link T}.
 *
 * @example
 * defaultsDeep({ a: 1, nested: { b: 2 } }, { nested: { b: 3, c: 4 } })
 * // => { a: 1, nested: { b: 3, c: 4 } }
 */
export const defaultsDeep = <T extends Record<string, unknown>>(
  ...layers: Array<Partial<T> | undefined>
): T => {
  const result = layers
    .filter(Boolean)
    .reduce<AnyRecord>((acc, layer) => mergeInto(acc, layer as AnyRecord), {});
  return result as T;
};
