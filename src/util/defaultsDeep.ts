/**
 * Plain-object deep merge with "later overrides earlier" semantics.
 * - Only merges plain objects (prototype === Object.prototype).
 * - Arrays and non-objects are replaced, not concatenated or merged.
 * - Undefined values are ignored (do not overwrite).
 *
 * Merge order: defaultsDeep(base, override1, override2) → override2 wins.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  );
};

const mergeInto = <T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T => {
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sVal = source[key];
    if (sVal === undefined) continue; // do not overwrite with undefined

    const tVal = target[key];

    if (isPlainObject(tVal) && isPlainObject(sVal)) {
      // both sides plain objects → recurse
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      target[key] = mergeInto({ ...(tVal as object) } as T[keyof T], sVal as T[keyof T]);
    } else if (isPlainObject(sVal)) {
      // target not an object, source is object → clone source
      target[key] = mergeInto({} as T[keyof T], sVal as T[keyof T]);
    } else {
      // primitives, arrays, dates, functions, etc. → replace
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      target[key] = sVal as T[keyof T];
    }
  }
  return target;
};

export const defaultsDeep = <T extends Record<string, unknown>>(
  ...layers: Array<Partial<T> | undefined>
): T => {
  // Start with empty object; apply layers left-to-right so later overrides win.
  return layers.filter(Boolean).reduce<T>((acc, layer) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return mergeInto(acc, layer as Partial<T>);
  }, {} as T);
};
