/**
 * Resolve a tri-state optional boolean flag under exactOptionalPropertyTypes.
 * - If the user explicitly enabled the flag, return true.
 * - If the user explicitly disabled (the "...-off" variant), return undefined (unset).
 * - Otherwise, adopt the default (true → set; false/undefined → unset).
 *
 * @param exclude - The "on" flag value as parsed by Commander.
 * @param excludeOff - The "off" toggle (present when specified) as parsed by Commander.
 * @param defaultValue - The generator default to adopt when no explicit toggle is present.
 * @returns boolean | undefined — use `undefined` to indicate "unset" (do not emit).
 *
 * @example
 * ```ts
 * resolveExclusion(undefined, undefined, true); // => true
 * ```
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
 *
 * @param exclude - Individual include/exclude flag.
 * @param excludeOff - Individual "...-off" flag.
 * @param defaultValue - Default for the individual flag.
 * @param excludeAll - Global "exclude-all" flag.
 * @param excludeAllOff - Global "exclude-all-off" flag.
 *
 * @example
 * resolveExclusionAll(undefined, undefined, false, true, undefined) =\> true
 */
export const resolveExclusionAll = (
  exclude: boolean | undefined,
  excludeOff: true | undefined,
  defaultValue: boolean | undefined,
  excludeAll: true | undefined,
  excludeAllOff: true | undefined,
) =>
  // Order of precedence:
  // 1) Individual explicit "on" wins outright.
  // 2) Individual explicit "off" wins over any global.
  // 3) Global exclude-all forces true when not explicitly turned off.
  // 4) Global exclude-all-off unsets when the individual wasn't explicitly enabled.
  // 5) Fall back to the default (true => set; false/undefined => unset).
  ((): boolean | undefined => {
    // Individual "on"
    if (exclude === true) return true;
    // Individual "off"
    if (excludeOff === true) return undefined;
    // Global "exclude-all" ON (unless explicitly turned off)
    if (excludeAll === true) return true;
    // Global "exclude-all-off" (unless explicitly enabled)
    if (excludeAllOff === true) return undefined;
    // Default
    return defaultValue ? true : undefined;
  })();

/**
 * exactOptionalPropertyTypes-safe setter for optional boolean flags:
 * delete when undefined; assign when defined — without requiring an index signature on T.
 *
 * @typeParam T - Target object type.
 * @param obj - The object to write to.
 * @param key - The optional boolean property key of {@link T}.
 * @param value - The value to set or `undefined` to unset.
 *
 * @remarks
 * Writes through a local `Record<string, unknown>` view to avoid requiring an index signature on {@link T}.
 */
export const setOptionalFlag = <T>(
  obj: T,
  key: keyof T & string,
  value: boolean | undefined,
): void => {
  const target = obj as unknown as Record<string, unknown>;
  const k = key as unknown as string;

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  if (value === undefined) delete target[k];
  else target[k] = value;
};
