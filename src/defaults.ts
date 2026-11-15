/**
 * Base root CLI defaults (shared; kept untyped here to avoid cross-layer deps).
 * Used as the bottom layer for CLI option resolution.
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
  /**
   * When true, load composed values into `process.env`. This default applies
   * to the CLI only; library `getDotenv()` defaults to false.
   */
  loadProcess: boolean;
  /** Logger used by the host and plugins (console-compatible). */
  logger: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
  /** Enable entropy warnings (presentation-only). */
  warnEntropy: boolean;
  /** Entropy threshold (bits/char) used for warnings. */
  entropyThreshold: number;
  /** Minimum value length to check for entropy warnings. */
  entropyMinLength: number;
  /** Regex patterns (as strings) to suppress entropy warnings by key. */
  entropyWhitelist: string[];
  /** Env var name in global dotenv files that specifies the default environment. */
  defaultEnvKey: string;
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

/**
 * Built-in scripts. Each runs under every default shell (`shell: true` is
 * powershell.exe on Windows, /bin/bash elsewhere), so a command uses no shell
 * operators: PowerShell 5.1 has no `&&`.
 */
const baseScripts: Record<string, BaseRootOptionDefaultsScript> = {
  // `-b` prints the `## <branch>` line, so one command does the job.
  'git-status': {
    cmd: 'git status -s -u -b',
    shell: true,
  },
};

/**
 * Default values for root CLI options used by the host and helpers as the baseline layer during option resolution.
 *
 * These defaults correspond to the “stringly” root surface (see `RootOptionsShape`) and are merged by precedence with:
 * - create-time overrides
 * - any discovered configuration `rootOptionDefaults`
 * - and finally CLI flags at runtime
 *
 * @public
 */
export const baseRootOptionDefaults: BaseRootOptionDefaults = {
  defaultEnvKey: 'DEFAULT_ENV',
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
