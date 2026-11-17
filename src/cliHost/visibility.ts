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
 * - applyRootVisibility(program, map) to hide (false) or show (true) root flags
 *   (families and singles) via Commander.Option.hideHelp on matching long names.
 *
 * Notes
 * - Families (e.g., shell, log, loadProcess, debug, exclude*, warnEntropy, redact) hide or show both ON/OFF flags together.
 * - Singles (e.g., --capture, --trace, --env) are hidden or shown individually.
 * - Host help (`hostHelp.ts`) skips hidden options in every section: root
 *   help, subcommand help and the inherited `<alias> options (anywhere)`
 *   sections. `applyHelpVisibility` (`topLevelHelp.ts`) applies the merged
 *   map before top-level help and in the root's `preSubcommand` hook.
 */
import type { GetDotenvCli } from './GetDotenvCli';
import type { RootOptionsShape } from './types';

/**
 * Map of root options to their visibility state (true=show, false=hide).
 */
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
 * Every root option key that has a flag, with the long flags it shows or
 * hides. ON/OFF families list both members.
 */
const ROOT_OPTION_FLAGS: Partial<
  Record<keyof RootOptionsShape, readonly string[]>
> = {
  // ON/OFF families
  shell: ['--shell', '--shell-off'],
  loadProcess: ['--load-process', '--load-process-off'],
  log: ['--log', '--log-off'],
  debug: ['--debug', '--debug-off'],
  excludeAll: ['--exclude-all', '--exclude-all-off'],
  excludeDynamic: ['--exclude-dynamic', '--exclude-dynamic-off'],
  excludeEnv: ['--exclude-env', '--exclude-env-off'],
  excludeGlobal: ['--exclude-global', '--exclude-global-off'],
  excludePrivate: ['--exclude-private', '--exclude-private-off'],
  excludePublic: ['--exclude-public', '--exclude-public-off'],
  warnEntropy: ['--entropy-warn', '--entropy-warn-off'],
  redact: ['--redact', '--redact-off'],
  // Singles
  env: ['--env'],
  defaultEnv: ['--default-env'],
  defaultEnvKey: ['--default-env-key'],
  outputPath: ['--output-path'],
  capture: ['--capture'],
  strict: ['--strict'],
  trace: ['--trace'],
  dotenvToken: ['--dotenv-token'],
  privateToken: ['--private-token'],
  dynamicPath: ['--dynamic-path'],
  paths: ['--paths'],
  pathsDelimiter: ['--paths-delimiter'],
  pathsDelimiterPattern: ['--paths-delimiter-pattern'],
  vars: ['--vars'],
  varsDelimiter: ['--vars-delimiter'],
  varsDelimiterPattern: ['--vars-delimiter-pattern'],
  varsAssignor: ['--vars-assignor'],
  varsAssignorPattern: ['--vars-assignor-pattern'],
  entropyThreshold: ['--entropy-threshold'],
  entropyMinLength: ['--entropy-min-length'],
  entropyWhitelist: ['--entropy-whitelist'],
  redactPatterns: ['--redact-pattern'],
};

/**
 * Apply root option visibility to the provided program instance.
 *
 * Every key the map sets decides its flags: `false` hides them and `true`
 * shows them again, so a later (higher) layer can undo an earlier hide.
 * Keys the map leaves unset keep their current state.
 *
 * Help-time only:
 * - This affects every help rendering (root and subcommand); it does not alter parsing or runtime semantics.
 *
 * Families vs singles:
 * - Families (e.g., "shell") show or hide both ON and OFF flags.
 * - Singles (e.g., "capture") show or hide the named long flag only.
 *
 * @param program - the GetDotenvCli root instance
 * @param visibility - effective visibility map (false hides; true shows; unset leaves as is)
 */
export function applyRootVisibility(
  program: GetDotenvCli,
  visibility?: VisibilityMap,
): void {
  if (!visibility) return;
  for (const [key, visible] of Object.entries(visibility) as Array<
    [keyof RootOptionsShape, boolean | undefined]
  >) {
    const longs = ROOT_OPTION_FLAGS[key];
    if (typeof visible !== 'boolean' || !longs) continue;
    for (const opt of program.options) {
      if (opt.long !== undefined && longs.includes(opt.long))
        opt.hideHelp(!visible);
    }
  }
}
