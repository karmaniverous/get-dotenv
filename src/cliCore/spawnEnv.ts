/** src/cliCore/spawnEnv.ts
 * Build a sanitized environment bag for child processes.
 *
 * Requirements addressed:
 * - Provide a single helper (buildSpawnEnv) to normalize/dedupe child env.
 * - Drop undefined values (exactOptional semantics).
 * - On Windows, dedupe keys case-insensitively and prefer the last value,
 *   preserving the latest key's casing. Ensure HOME fallback from USERPROFILE.
 *   Normalize TMP/TEMP consistency when either is present.
 * - On POSIX, keep keys as-is; when a temp dir key is present (TMPDIR/TMP/TEMP),
 *   ensure TMPDIR exists for downstream consumers that expect it.
 *
 * Adapter responsibility: pure mapping; no business logic.
 */
export type SpawnEnv = Readonly<Partial<Record<string, string>>>;

const dropUndefined = (
  bag: Record<string, string | undefined>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(bag).filter(
      (e): e is [string, string] => typeof e[1] === 'string',
    ),
  );

/** Build a sanitized env for child processes from base + overlay. */
export const buildSpawnEnv = (
  base?: NodeJS.ProcessEnv,
  overlay?: Record<string, string | undefined>,
): SpawnEnv => {
  const raw: Record<string, string | undefined> = {
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
