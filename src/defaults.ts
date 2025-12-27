/**
 * Base root CLI defaults (shared; kept untyped here to avoid cross-layer deps).
 * Used as the bottom layer for CLI option resolution.
 */
/**
 * Default values for root CLI options used by the host and helpers as the
 * baseline layer during option resolution.
 *
 * These defaults correspond to the "stringly" root surface (see `RootOptionsShape`)
 * and are merged by precedence with create-time overrides and any discovered
 * configuration `rootOptionDefaults` before CLI flags are applied.
 */

/**
 * Script entry shape used by {@link baseRootOptionDefaults}.
 *
 * @public
 */
export interface BaseRootOptionDefaultsScript {
  /**
   * Command string to execute.
   */
  cmd: string;
  /**
   * Shell setting for the command.
   */
  shell: boolean;
}

/**
 * Root defaults object exported as {@link baseRootOptionDefaults}.
 *
 * @public
 */
export interface BaseRootOptionDefaults {
  /** Dotenv token indicating a dotenv file (default `.env`). */
  dotenvToken: string;
  /** When true, load composed values into `process.env`. */
  loadProcess: boolean;
  /** Logger used by the host and plugins (console-compatible). */
  logger: typeof console;
  /** Enable entropy warnings (presentation-only). */
  warnEntropy: boolean;
  /** Entropy threshold (bits/char) used for warnings. */
  entropyThreshold: number;
  /** Minimum value length to check for entropy warnings. */
  entropyMinLength: number;
  /** Regex patterns (as strings) to suppress entropy warnings by key. */
  entropyWhitelist: string[];
  /** Default dotenv search paths (stringly, CLI-compatible). */
  paths: string;
  /** Paths delimiter used for the `--paths` string. */
  pathsDelimiter: string;
  /** Token indicating private variables (default `local`). */
  privateToken: string;
  /** Default scripts table used by cmd/batch resolution. */
  scripts: Record<string, BaseRootOptionDefaultsScript>;
  /** Shell preference for commands (boolean true means “default shell”). */
  shell: boolean;
  /** Extra vars string (CLI-compatible). */
  vars: string;
  /** Vars assignment operator for `--vars` parsing. */
  varsAssignor: string;
  /** Vars delimiter for `--vars` parsing. */
  varsDelimiter: string;
}

const baseScripts: Record<string, BaseRootOptionDefaultsScript> = {
  'git-status': {
    cmd: 'git branch --show-current && git status -s -u',
    shell: true,
  },
};

export const baseRootOptionDefaults: BaseRootOptionDefaults = {
  dotenvToken: '.env',
  loadProcess: true,
  logger: console,
  // Diagnostics defaults
  warnEntropy: true,
  entropyThreshold: 3.8,
  entropyMinLength: 16,
  entropyWhitelist: ['^GIT_', '^npm_', '^CI$', 'SHLVL'],
  paths: './',
  pathsDelimiter: ' ',
  privateToken: 'local',
  scripts: baseScripts,
  shell: true,
  vars: '',
  varsAssignor: '=',
  varsDelimiter: ' ',
  // tri-state flags default to unset unless explicitly provided
  // (debug/log/exclude* resolved via flag utils)
};
