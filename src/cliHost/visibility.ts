/**
 * src/cliHost/visibility.ts
 *
 * Help-time root option visibility for the host.
 *
 * Purpose
 * - Centralize merging and application of help-time visibility for root flags.
 * - Hiding a key affects only help rendering; runtime behavior is unchanged.
 *
 * Precedence (left \< right; later wins):
 * - createCli(rootOptionVisibility) \< packaged/public \< project/public \< project/local
 *
 * Usage
 * - mergeRootVisibility(...layers) to compute an effective map once.
 * - applyRootVisibility(program, map) to hide root flags (families and singles)
 *   by calling Commander.Option.hideHelp(true) on matching long names.
 *
 * Notes
 * - Families (e.g., shell, log, loadProcess, exclude*, warnEntropy, redact) hide both ON/OFF flags together.
 * - Singles (e.g., --capture, --trace) are hidden individually.
 */
import type { GetDotenvCli } from './GetDotenvCli';
import type { RootOptionsShape } from './types';

export type VisibilityMap = Partial<Record<keyof RootOptionsShape, boolean>>;

/**
 * Merge visibility maps left-to-right; later maps override earlier keys.
 * @param layers - zero or more partial visibility maps (undefined ignored)
 * @returns a new merged visibility map
 */
export function mergeRootVisibility(
  ...layers: Array<VisibilityMap | undefined>
): VisibilityMap {
  const out: VisibilityMap = {};
  for (const m of layers) {
    if (!m) continue;
    for (const [k, v] of Object.entries(m) as Array<
      [keyof RootOptionsShape, boolean]
    >) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Hide a set of long flags (if present) on the provided root program.
 * @param program - the GetDotenvCli root instance
 * @param names - array of long option names (e.g., "--capture")
 */
function hideByLong(program: GetDotenvCli, names: string[]): void {
  for (const opt of program.options) {
    const long = (opt as { long?: string }).long ?? '';
    if (names.includes(long)) opt.hideHelp(true);
  }
}

/**
 * Apply root option visibility to the provided program instance.
 * Flags set to false in the visibility map are hidden via hideHelp(true).
 *
 * Help-time only:
 * - This affects rendering of top-level help; it does not alter parsing or runtime semantics.
 *
 * Families vs singles:
 * - Families (e.g., "shell") hide both ON and OFF flags.
 * - Singles (e.g., "capture") hide the named long flag only.
 *
 * @param program - the GetDotenvCli root instance
 * @param visibility - effective visibility map (false hides; true/undefined shows)
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
