import type { Command } from '@commander-js/extra-typings';

import type { GetDotenvOptions, ProcessEnv } from '@/src/core';

/**
 * Minimal root options shape shared by CLI and generator layers.
 * Keep keys optional to respect exactOptionalPropertyTypes semantics.
 *
 * @public
 */
export interface RootOptionsShape {
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
}

/**
 * Definition for a single script entry.
 */
export interface ScriptDef<TShell extends string | boolean = string | boolean> {
  cmd: string;
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
  name?: string;
  description?: string;
  version?: string;
  importMetaUrl?: string;
  helpHeader?: string;
}
