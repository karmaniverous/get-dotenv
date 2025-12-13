import type { Command } from '@commander-js/extra-typings';

import type { GetDotenvOptions, ProcessEnv } from '@/src/core';

/**
 * Minimal root options shape shared by CLI and generator layers.
 * Keep keys optional to respect exactOptionalPropertyTypes semantics.
 *
 * @public
 */
export interface RootOptionsShape {
  /** Target environment (dotenv-expanded). */
  env?: string;
  /** Explicit variable overrides (dotenv-expanded). */
  vars?: string;
  /** Command to execute (dotenv-expanded). */
  command?: string;
  /** Output path for the consolidated environment file (dotenv-expanded). */
  outputPath?: string;

  /**
   * Shell execution strategy.
   * - `true`: use default OS shell.
   * - `false`: use plain execution (no shell).
   * - string: use specific shell path.
   */
  shell?: string | boolean;
  /** Whether to load variables into `process.env`. */
  loadProcess?: boolean;
  /** Exclude all variables from loading. */
  excludeAll?: boolean;
  /** Exclude dynamic variables. */
  excludeDynamic?: boolean;
  /** Exclude environment-specific variables. */
  excludeEnv?: boolean;
  /** Exclude global variables. */
  excludeGlobal?: boolean;
  /** Exclude private variables. */
  excludePrivate?: boolean;
  /** Exclude public variables. */
  excludePublic?: boolean;
  /** Enable console logging of loaded variables. */
  log?: boolean;
  /** Enable debug logging to stderr. */
  debug?: boolean;
  /** Capture child process stdio (useful for tests/CI). */
  capture?: boolean;
  /** Fail on validation errors (schema/requiredKeys). */
  strict?: boolean;
  // Diagnostics
  /** Enable presentation-time redaction of secret-like keys. */
  redact?: boolean;
  /** Enable entropy warnings for high-entropy values. */
  warnEntropy?: boolean;
  /** Entropy threshold (bits/char) for warnings (default 3.8). */
  entropyThreshold?: number;
  /** Minimum string length to check for entropy (default 16). */
  entropyMinLength?: number;
  /** Regex patterns for keys to exclude from entropy checks. */
  entropyWhitelist?: ReadonlyArray<string>;
  /** Additional regex patterns for keys to redact. */
  redactPatterns?: string[];

  /** Default target environment when not specified. */
  defaultEnv?: string;
  /** Token indicating a dotenv file (default: ".env"). */
  dotenvToken?: string;
  /** Path to dynamic variables module (default: undefined). */
  dynamicPath?: string;

  // Diagnostics: --trace [keys...]; true = all keys, string[] = selected keys
  /**
   * Emit diagnostics for child env composition.
   * - `true`: trace all keys.
   * - `string[]`: trace selected keys.
   */
  trace?: boolean | string[];

  /** Paths to search for dotenv files (space-delimited string or array). */
  paths?: string;
  /** Delimiter for paths string (default: space). */
  pathsDelimiter?: string;
  /** Regex pattern for paths delimiter. */
  pathsDelimiterPattern?: string;
  /** Token indicating private variables (default: "local"). */
  privateToken?: string;
  /** Delimiter for vars string (default: space). */
  varsDelimiter?: string;
  /** Regex pattern for vars delimiter. */
  varsDelimiterPattern?: string;
  /** Assignment operator for vars (default: "="). */
  varsAssignor?: string;
  /** Regex pattern for vars assignment operator. */
  varsAssignorPattern?: string;

  // Scripts table (string or { cmd, shell })
  /** Table of named scripts for execution. */
  scripts?: ScriptsTable;
  // Logger is intentionally omitted here; it is not round-tripped into env.
}

/**
 * Definition for a single script entry.
 */
export interface ScriptDef<TShell extends string | boolean = string | boolean> {
  /** The command string to execute. */
  cmd: string;
  /** Shell override for this script. */
  shell?: TShell | undefined;
}

/**
 * Scripts table shape.
 */
export type ScriptsTable<TShell extends string | boolean = string | boolean> =
  Record<string, string | ScriptDef<TShell>>;

/**
 * Identity helper to define a scripts table while preserving a concrete TShell
 * type parameter in downstream inference.
 */
export const defineScripts =
  <TShell extends string | boolean>() =>
  <T extends ScriptsTable<TShell>>(t: T) =>
    t;
/**
 * Commander command augmented with a typed opts() and an options bag
 * for nested subcommands to inherit.
 */
export type CommandWithOptions<TOptions> = Command & {
  opts(): Partial<TOptions>;
  getDotenvCliOptions?: TOptions;
};

/**
 * Per-invocation context shared with plugins and actions.
 *
 * @public
 */
export interface GetDotenvCliCtx<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
> {
  optionsResolved: TOptions;
  dotenv: ProcessEnv;
  plugins?: Record<string, unknown>;
  pluginConfigs?: Record<string, unknown>;
}

/**
 * Options for branding the CLI.
 *
 * @public
 */
export interface BrandOptions {
  /** CLI name. */
  name?: string;
  /** CLI description. */
  description?: string;
  /** CLI version string. */
  version?: string;
  /** Import URL for resolving package version. */
  importMetaUrl?: string;
  /** Custom help header text. */
  helpHeader?: string;
}
