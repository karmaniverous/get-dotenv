import type { Command } from 'commander';

/**
 * Minimal root options shape shared by CLI and generator layers.
 * Keep keys optional to respect exactOptionalPropertyTypes semantics.
 */
export type RootOptionsShape = {
  env?: string | undefined;
  vars?: string | undefined;
  command?: string | undefined;
  outputPath?: string | undefined;

  shell?: string | boolean | undefined;
  loadProcess?: boolean | undefined;
  excludeAll?: boolean | undefined;
  excludeDynamic?: boolean | undefined;
  excludeEnv?: boolean | undefined;
  excludeGlobal?: boolean | undefined;
  excludePrivate?: boolean | undefined;
  excludePublic?: boolean | undefined;
  log?: boolean | undefined;
  debug?: boolean | undefined;
  capture?: boolean | undefined;
  strict?: boolean | undefined;
  // Diagnostics
  redact?: boolean | undefined;
  warnEntropy?: boolean | undefined;
  entropyThreshold?: number | undefined;
  entropyMinLength?: number | undefined;
  entropyWhitelist?: string[] | undefined;
  redactPatterns?: string[] | undefined;

  defaultEnv?: string | undefined;
  dotenvToken?: string | undefined;
  dynamicPath?: string | undefined;

  // Diagnostics: --trace [keys...]; true = all keys, string[] = selected keys
  trace?: boolean | string[] | undefined;

  paths?: string | undefined;
  pathsDelimiter?: string | undefined;
  pathsDelimiterPattern?: string | undefined;
  privateToken?: string | undefined;
  varsDelimiter?: string | undefined;
  varsDelimiterPattern?: string | undefined;
  varsAssignor?: string | undefined;
  varsAssignorPattern?: string | undefined;
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
