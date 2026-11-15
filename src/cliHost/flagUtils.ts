/**
 * Resolve one ON/OFF flag family from the raw CLI toggles of this invocation
 * and the stacked default (defaults \< parent bag).
 *
 * - An explicit ON flag gives `true`.
 * - An explicit OFF flag gives `false`.
 * - Neither gives the stacked default (`undefined` when no layer sets it).
 *
 * The toggles are the raw Commander values, never values merged with the
 * defaults, so an OFF flag can override a default that is already `true`.
 *
 * @param on - The raw "on" toggle (for example `log` from `-l`).
 * @param off - The raw "off" toggle (for example `logOff` from `-L`).
 * @param stacked - The value from the defaults stack and the parent bag.
 * @returns The resolved value; `undefined` means unset.
 *
 * @example
 * ```ts
 * resolveToggle(undefined, true, true); // => false
 * ```
 */
export const resolveToggle = (
  on: unknown,
  off: unknown,
  stacked: boolean | undefined,
): boolean | undefined => (on === true ? true : off === true ? false : stacked);

/**
 * Resolve one exclusion flag (for example `excludePrivate`) from the raw CLI
 * toggles of this invocation, with `-a/--exclude-all` and
 * `-A/--exclude-all-off` between the individual flags and the defaults:
 *
 * 1. an individual ON flag gives `true`;
 * 2. an individual OFF flag gives `false`;
 * 3. `-a` gives `true`;
 * 4. `-A` gives `false`;
 * 5. otherwise the stacked default.
 *
 * @param on - The raw individual "on" toggle.
 * @param off - The raw individual "off" toggle.
 * @param all - The raw `excludeAll` toggle (`-a`).
 * @param allOff - The raw `excludeAllOff` toggle (`-A`).
 * @param stacked - The value from the defaults stack and the parent bag.
 * @returns The resolved value; `undefined` means unset.
 *
 * @example
 * ```ts
 * resolveExclusion(undefined, undefined, true, undefined, undefined); // => true
 * ```
 */
export const resolveExclusion = (
  on: unknown,
  off: unknown,
  all: unknown,
  allOff: unknown,
  stacked: boolean | undefined,
): boolean | undefined =>
  resolveToggle(on, off, resolveToggle(all, allOff, stacked));

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
  const k = key;

  if (value === undefined) Reflect.deleteProperty(target, k);
  else target[k] = value;
};
