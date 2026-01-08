import type { ProcessEnv } from '@/src/core';

const dropUndefined = (bag: ProcessEnv): Record<string, string> =>
  Object.fromEntries(
    Object.entries(bag).filter(
      (e): e is [string, string] => typeof e[1] === 'string',
    ),
  );

/**
 * Build a sanitized environment object for spawning child processes.
 * Merges `base` and `overlay`, drops undefined values, and handles platform-specific
 * normalization (e.g. case-insensitivity on Windows).
 *
 * @param base - Base environment (usually `process.env`).
 * @param overlay - Environment variables to overlay.
 */
export const buildSpawnEnv = (
  base?: NodeJS.ProcessEnv,
  overlay?: ProcessEnv,
): NodeJS.ProcessEnv => {
  const raw: ProcessEnv = {
    ...(base ?? {}),
    ...(overlay ?? {}),
  };
  // Drop undefined first
  const entries = Object.entries(dropUndefined(raw));

  if (process.platform === 'win32') {
    // Windows: keys are case-insensitive; collapse duplicates
    const byLower = new Map<string, [string, string]>();
    for (const [k, v] of entries) {
      byLower.set(k.toLowerCase(), [k, v]); // last wins; preserve latest casing
    }
    const out: Record<string, string> = {};
    for (const [, [k, v]] of byLower) out[k] = v;

    // HOME fallback from USERPROFILE (common expectation)
    if (!Object.prototype.hasOwnProperty.call(out, 'HOME')) {
      const up = out['USERPROFILE'];
      if (typeof up === 'string' && up.length > 0) out['HOME'] = up;
    }
    // Normalize TMP/TEMP coherence (pick any present; reflect to both)
    const tmp = out['TMP'] ?? out['TEMP'];
    if (typeof tmp === 'string' && tmp.length > 0) {
      out['TMP'] = tmp;
      out['TEMP'] = tmp;
    }
    return out;
  }

  // POSIX: keep keys as-is
  const out = Object.fromEntries(entries);
  // Ensure TMPDIR exists when any temp key is present (best-effort)
  const tmpdir = out['TMPDIR'] ?? out['TMP'] ?? out['TEMP'];
  if (typeof tmpdir === 'string' && tmpdir.length > 0) {
    out['TMPDIR'] = tmpdir;
  }
  return out;
};

export default buildSpawnEnv;
