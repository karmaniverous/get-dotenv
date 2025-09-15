/**
 * Resolve a tri-state optional boolean flag under exactOptionalPropertyTypes.
 * - If the user explicitly enabled the flag, return true.
 * - If the user explicitly disabled (the "...-off" variant), return undefined (unset).
 * - Otherwise, adopt the default (true → set; false/undefined → unset).
 */
export const resolveExclusion = (
  exclude: boolean | undefined,
  excludeOff: true | undefined,
  defaultValue: boolean | undefined,
) =>
  exclude ? true : excludeOff ? undefined : defaultValue ? true : undefined;

/**
 * Resolve an optional flag with "--exclude-all" overrides.
 * If excludeAll is set and the individual "...-off" is not, force true.
 * If excludeAllOff is set and the individual flag is not explicitly set, unset.
 * Otherwise, adopt the default (true → set; false/undefined → unset).
 */
export const resolveExclusionAll = (
  exclude: boolean | undefined,
  excludeOff: true | undefined,
  defaultValue: boolean | undefined,
  excludeAll: true | undefined,
  excludeAllOff: true | undefined,
) =>
  excludeAll && !excludeOff
    ? true
    : excludeAllOff && !exclude
      ? undefined
      : defaultValue
        ? true
        : undefined;

/**
 * exactOptionalPropertyTypes-safe setter for optional boolean flags:
 * delete when undefined; assign when defined — without requiring an index signature on T.
 */
export const setOptionalFlag = <T, K extends keyof T & string>(
  obj: T,
  key: K,
  value: boolean | undefined,
) => {
  const target = obj as unknown as Record<string, unknown>;
  const k = key as unknown as string;
  if (value === undefined) delete target[k];
  else target[k] = value;
};
