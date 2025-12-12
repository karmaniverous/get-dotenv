/** src/cliHost/visibility.ts
 * Helpers to merge and apply root option visibility.
 *
 * Requirements addressed:
 * - rootOptionVisibility precedence: createCli \< packaged/public \< project/public \< project/local.
 * - Apply visibility by hiding flags (hideHelp) for root options (families and singles).
 * - Keep help-time application centralized and reusable.
 */
import type { GetDotenvCli } from './GetDotenvCli';
import type { RootOptionsShape } from './types';

export type VisibilityMap = Partial<Record<keyof RootOptionsShape, boolean>>;

/** Merge visibility maps left-to-right; later maps override earlier keys. */
export function mergeRootVisibility(
  ...layers: Array<VisibilityMap | undefined>
): VisibilityMap {
  const out: VisibilityMap = {};
  for (const m of layers) {
    if (!m) continue;
    for (const [k, v] of Object.entries(m)) {
      (out as Record<string, boolean>)[k] = Boolean(v);
    }
  }
  return out;
}

/** Hide a set of long flags (if present) on the provided root program. */
function hideByLong(program: GetDotenvCli, names: string[]): void {
  for (const opt of program.options) {
    const long = (opt as { long?: string }).long ?? '';
    if (names.includes(long)) opt.hideHelp(true);
  }
}

/**
 * Apply root option visibility to the provided program instance.
 * Flags set to false in the visibility map are hidden via hideHelp(true).
 */
export function applyRootVisibility(
  program: GetDotenvCli,
  visibility?: VisibilityMap,
): void {
  if (!visibility) return;
  if (Object.keys(visibility).length === 0) return;

  const fam = (key: keyof RootOptionsShape, longs: string[]) => {
    if (visibility[key] === false) hideByLong(program, longs);
  };

  // Families: hide both members when false
  fam('shell', ['--shell', '--shell-off']);
  fam('loadProcess', ['--load-process', '--load-process-off']);
  fam('log', ['--log', '--log-off']);
  fam('excludeDynamic', ['--exclude-dynamic', '--exclude-dynamic-off']);
  fam('excludeEnv', ['--exclude-env', '--exclude-env-off']);
  fam('excludeGlobal', ['--exclude-global', '--exclude-global-off']);
  fam('excludePrivate', ['--exclude-private', '--exclude-private-off']);
  fam('excludePublic', ['--exclude-public', '--exclude-public-off']);
  fam('warnEntropy', ['--entropy-warn', '--entropy-warn-off']);
  // Redact pair (new)
  fam('redact', ['--redact', '--redact-off']);

  // Singles: hide individual long flags
  const singles = [
    ['capture', '--capture'],
    ['strict', '--strict'],
    ['trace', '--trace'],
    ['defaultEnv', '--default-env'],
    ['dotenvToken', '--dotenv-token'],
    ['privateToken', '--private-token'],
    ['dynamicPath', '--dynamic-path'],
    ['paths', '--paths'],
    ['pathsDelimiter', '--paths-delimiter'],
    ['pathsDelimiterPattern', '--paths-delimiter-pattern'],
    ['vars', '--vars'],
    ['varsDelimiter', '--vars-delimiter'],
    ['varsDelimiterPattern', '--vars-delimiter-pattern'],
    ['varsAssignor', '--vars-assignor'],
    ['varsAssignorPattern', '--vars-assignor-pattern'],
    // diagnostics thresholds and whitelist/patterns
    ['entropyThreshold', '--entropy-threshold'],
    ['entropyMinLength', '--entropy-min-length'],
    ['entropyWhitelist', '--entropy-whitelist'],
    ['redactPatterns', '--redact-pattern'],
  ] as Array<[keyof RootOptionsShape, string]>;

  for (const [key, long] of singles) {
    if (visibility[key] === false) hideByLong(program, [long]);
  }
}
