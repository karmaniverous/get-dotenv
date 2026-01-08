/**
 * Plain-object deep merge with "later overrides earlier" semantics.
 * - Only merges plain objects (prototype === Object.prototype).
 * - Arrays and non-objects are replaced, not concatenated or merged.
 * - Undefined values are ignored (do not overwrite).
 *
 * Merge order: defaultsDeep(base, override1, override2) → override2 wins.
 */
import { isObject } from 'radash';

/** @internal */
type AnyRecord = Record<string, unknown>;

/** @internal */
const isPlainObject = (value: unknown): value is AnyRecord => {
  return isObject(value) && !Array.isArray(value);
};

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
 * Perform a deep defaults‑style merge across plain objects.
 * - Only merges plain objects (prototype === Object.prototype).
 * - Arrays and non‑objects are replaced, not merged.
 * - `undefined` values are ignored and do not overwrite prior values.
 *
 * @typeParam T - Resulting shape after merging all layers.
 * @returns The merged object typed as T.
 *
 * @example
 * defaultsDeep(\{ a: 1, nested: \{ b: 2 \} \}, \{ nested: \{ b: 3, c: 4 \} \})
 * =\> \{ a: 1, nested: \{ b: 3, c: 4 \} \}
 */
// Typed heads (overloads) to improve inference without changing runtime behavior.
export function defaultsDeep<A extends object>(a?: Partial<A>): A;
export function defaultsDeep<A extends object, B extends object>(
  a?: Partial<A>,
  b?: Partial<B>,
): A & B;
export function defaultsDeep<
  A extends object,
  B extends object,
  C extends object,
>(a?: Partial<A>, b?: Partial<B>, c?: Partial<C>): A & B & C;
export function defaultsDeep<
  A extends object,
  B extends object,
  C extends object,
  D extends object,
>(
  a?: Partial<A>,
  b?: Partial<B>,
  c?: Partial<C>,
  d?: Partial<D>,
): A & B & C & D;
export function defaultsDeep<
  A extends object,
  B extends object,
  C extends object,
  D extends object,
  E extends object,
>(
  a?: Partial<A>,
  b?: Partial<B>,
  c?: Partial<C>,
  d?: Partial<D>,
  e?: Partial<E>,
): A & B & C & D & E;
// Implementation: variadic, unchanged semantics.
export function defaultsDeep<T extends object>(
  ...layers: Array<Partial<T> | undefined>
): T;
export function defaultsDeep<T extends object>(
  ...layers: Array<Partial<T> | undefined>
): T {
  const result = layers
    .filter(Boolean)
    .reduce<AnyRecord>((acc, layer) => mergeInto(acc, layer as AnyRecord), {});
  return result as T;
}
