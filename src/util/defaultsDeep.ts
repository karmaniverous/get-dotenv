/**
 * Plain-object deep merge with "later overrides earlier" semantics.
 * - Only merges plain objects (prototype === Object.prototype).
 * - Arrays and non-objects are replaced, not concatenated or merged.
 * - Undefined values are ignored (do not overwrite).
 *
 * Merge order: defaultsDeep(base, override1, override2) → override2 wins.
 */
type AnyRecord = Record<string, unknown>;

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

export const defaultsDeep = <T extends AnyRecord>(
  ...layers: Array<Partial<T> | undefined>
): T => {
  const result = layers
    .filter(Boolean)
    .reduce<AnyRecord>((acc, layer) => mergeInto(acc, layer as AnyRecord), {});
  return result as T;
};
