import type { ProcessEnv } from '@/src/core';

/**
 * Copy a composed map into `process.env` (the `loadProcess` effect).
 *
 * A string sets the key. An `undefined` value, or a key in `deletedKeys`
 * (removed by a dynamic `null`), deletes the key from `process.env`.
 *
 * @param values - The composed map.
 * @param deletedKeys - Keys a dynamic map deleted from the composed map.
 *
 * @internal
 */
export const loadProcessEnv = (
  values: ProcessEnv,
  deletedKeys: Iterable<string> = [],
): void => {
  for (const key of deletedKeys) Reflect.deleteProperty(process.env, key);
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
};
