/**
 * Describe a default value for help text.
 * Handles arrays (joins with space) and strings; returns 'none' if empty/undefined.
 */
export const describeDefault = (v: unknown): string => {
  if (Array.isArray(v)) return v.length ? v.join(' ') : 'none';
  if (typeof v === 'string' && v.trim()) return v;
  return 'none';
};

/**
 * Describe default values for a pair of include/exclude list options.
 * Returns an object with `includeDefault` and `excludeDefault` strings.
 *
 * If both lists are populated, returns an invalid marker for both.
 */
export const describeConfigKeyListDefaults = ({
  cfgInclude,
  cfgExclude,
}: {
  cfgInclude?: string[];
  cfgExclude?: string[];
}): { includeDefault: string; excludeDefault: string } => {
  // Avoid throwing in help rendering: show an explicit invalid marker.
  if (cfgInclude?.length && cfgExclude?.length) {
    const msg = '(invalid: both set in config)';
    return { includeDefault: msg, excludeDefault: msg };
  }

  return {
    includeDefault: describeDefault(
      cfgExclude?.length ? undefined : cfgInclude,
    ),
    excludeDefault: describeDefault(
      cfgInclude?.length ? undefined : cfgExclude,
    ),
  };
};
