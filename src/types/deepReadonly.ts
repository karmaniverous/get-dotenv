/** src/types/deepReadonly.ts
 * Utility DeepReadonly type for downstream DX.
 * Compile-time only; no runtime footprint.
 */
export type DeepReadonly<T> =
  // Functions are left as-is
  T extends (...args: any[]) => any
    ? T
    : // Arrays (and readonly arrays) become readonly arrays of deeply readonly elements
      T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepReadonly<U>>
      : T extends Array<infer U>
        ? ReadonlyArray<DeepReadonly<U>>
        : // Objects: recursively mark properties readonly
          T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : // Primitives and others are left as-is
            T;

// Back-compat alias (optional). Uncomment if desired for ergonomics:
// export type ReadonlyDeep<T> = DeepReadonly<T>;
