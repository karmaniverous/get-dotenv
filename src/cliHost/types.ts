import type { Command } from '@commander-js/extra-typings';

/**
 * Minimal root options shape shared by CLI and generator layers.
 * Keep keys optional to respect exactOptionalPropertyTypes semantics.
 */
export type RootOptionsShape = {
  env?: string;
  vars?: string;
  command?: string;
  outputPath?: string;

  shell?: string | boolean;
  loadProcess?: boolean;
  excludeAll?: boolean;
  excludeDynamic?: boolean;
  excludeEnv?: boolean;
  excludeGlobal?: boolean;
  excludePrivate?: boolean;
  excludePublic?: boolean;
  log?: boolean;
  debug?: boolean;
  capture?: boolean;
  strict?: boolean;
  // Diagnostics
  redact?: boolean;
  warnEntropy?: boolean;
  entropyThreshold?: number;
  entropyMinLength?: number;
  entropyWhitelist?: ReadonlyArray<string>;
  redactPatterns?: string[];

  defaultEnv?: string;
  dotenvToken?: string;
  dynamicPath?: string;

  // Diagnostics: --trace [keys...]; true = all keys, string[] = selected keys
  trace?: boolean | string[];

  paths?: string;
  pathsDelimiter?: string;
  pathsDelimiterPattern?: string;
  privateToken?: string;
  varsDelimiter?: string;
  varsDelimiterPattern?: string;
  varsAssignor?: string;
  varsAssignorPattern?: string;

  // Scripts table (string or { cmd, shell })
  scripts?: ScriptsTable;
  // Logger is intentionally omitted here; it is not round-tripped into env.
};

/**
 * Scripts table shape (configurable shell type).
 */
export type ScriptsTable<TShell extends string | boolean = string | boolean> =
  Record<string, string | { cmd: string; shell?: TShell | undefined }>;

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
