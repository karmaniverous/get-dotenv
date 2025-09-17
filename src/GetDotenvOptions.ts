// src/GetDotenvOptions.ts
import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import { join } from 'path';

import type { RootOptionsShape } from './cliCore/types';
import {
  baseGetDotenvCliOptions,
  type GetDotenvCliOptions,
} from './generateGetDotenvCli/GetDotenvCliOptions';
import { defaultsDeep } from './util/defaultsDeep';

export const getDotenvOptionsFilename = 'getdotenv.config.json'; /**
 * A minimal representation of an environment key/value mapping.
 * Values may be `undefined` to represent "unset".
 */
export type ProcessEnv = Record<string, string | undefined>;

/**
 * Dynamic variable function signature. Receives the current expanded variables
 * and the selected environment (if any), and returns either a string to set
 * or `undefined` to unset/skip the variable.
 */
export type GetDotenvDynamicFunction = (
  vars: ProcessEnv,
  env: string | undefined,
) => string | undefined;
export type GetDotenvDynamic = Record<
  string,
  GetDotenvDynamicFunction | ReturnType<GetDotenvDynamicFunction>
>;
export type Logger =
  | Record<string, (...args: unknown[]) => void>
  | typeof console;

/**
 * Helper to define a dynamic map with strong inference.
 *
 * @example
 * const dynamic = defineDynamic(\{ KEY: (\{ FOO = '' \}) =\> FOO + '-x' \});
 */
export const defineDynamic = <T extends GetDotenvDynamic>(d: T): T => d;

/**
 * Options passed programmatically to `getDotenv`.
 */
export interface GetDotenvOptions {
  /**
   * default target environment (used if `env` is not provided)
   */
  defaultEnv?: string;

  /**
   * token indicating a dotenv file
   */
  dotenvToken: string;

  /**
   * path to JS/TS module default-exporting an object keyed to dynamic variable functions
   */
  dynamicPath?: string;

  /**
   * Programmatic dynamic variables map. When provided, this takes precedence
   * over {@link GetDotenvOptions.dynamicPath}.
   */
  dynamic?: GetDotenvDynamic;

  /**
   * target environment
   */
  env?: string;

  /**
   * exclude dynamic variables from loading
   */
  excludeDynamic?: boolean;

  /**
   * exclude environment-specific variables from loading
   */
  excludeEnv?: boolean;

  /**
   * exclude global variables from loading
   */
  excludeGlobal?: boolean;

  /**
   * exclude private variables from loading
   */
  excludePrivate?: boolean;

  /**
   * exclude public variables from loading
   */
  excludePublic?: boolean;

  /**
   * load dotenv variables to `process.env`
   */
  loadProcess?: boolean;

  /**
   * log loaded dotenv variables to `logger`
   */
  log?: boolean;

  /**
   * logger object (defaults to console)
   */
  logger?: Logger;

  /**
   * if populated, writes consolidated dotenv file to this path (follows dotenvExpand rules)
   */
  outputPath?: string;

  /**
   * array of input directory paths
   */
  paths?: string[];

  /**
   * filename token indicating private variables
   */
  privateToken?: string;

  /**
   * explicit variables to include
   */
  vars?: ProcessEnv;

  /**
   * Host-only feature flag: guarded integration of the new config
   * loader/overlay path in the plugin-first CLI host. Ignored by the
   * legacy getDotenv() path; accepted here to allow callers like the
   * demo host to opt in without type errors.
   */
  useConfigLoader?: boolean;
}

/**
 * Converts programmatic CLI options to `getDotenv` options. *
 * @param cliOptions - CLI options. Defaults to `{}`.
 *
 * @returns `getDotenv` options.
 */
export const getDotenvCliOptions2Options = ({
  paths,
  pathsDelimiter,
  pathsDelimiterPattern,
  vars,
  varsAssignor,
  varsAssignorPattern,
  varsDelimiter,
  varsDelimiterPattern,
  ...rest
}: RootOptionsShape): GetDotenvOptions => {
  /**
   * Convert CLI-facing string options into {@link GetDotenvOptions}.
   *
   * - Splits {@link GetDotenvCliOptions.paths} using either a delimiter
   *   or a regular expression pattern into a string array.   * - Parses {@link GetDotenvCliOptions.vars} as space-separated `KEY=VALUE`
   *   pairs (configurable delimiters) into a {@link ProcessEnv}.
   * - Drops CLI-only keys that have no programmatic equivalent.
   *
   * @remarks
   * Follows exact-optional semantics by not emitting undefined-valued entries.
   */
  // Drop CLI-only keys (debug/scripts) without relying on Record casts.
  // Create a shallow copy then delete optional CLI-only keys if present.
  const restObj = { ...(rest as unknown as Record<string, unknown>) };
  delete restObj.debug;
  delete restObj.scripts;

  const splitBy = (
    value: string | undefined,
    delim?: string,
    pattern?: string,
  ) => (value ? value.split(pattern ? RegExp(pattern) : (delim ?? ' ')) : []);

  const kvPairs = (
    vars
      ? splitBy(vars, varsDelimiter, varsDelimiterPattern).map((v) =>
          v.split(
            varsAssignorPattern
              ? RegExp(varsAssignorPattern)
              : (varsAssignor ?? '='),
          ),
        )
      : []
  ) as [string, string][];

  const parsedVars = Object.fromEntries(kvPairs);

  // Preserve exactOptionalPropertyTypes: only include keys when defined.
  return {
    ...(restObj as Partial<GetDotenvOptions>),
    ...(paths !== undefined
      ? {
          paths: splitBy(paths, pathsDelimiter, pathsDelimiterPattern),
        }
      : {}),
    ...(vars !== undefined ? { vars: parsedVars } : {}),
  } as GetDotenvOptions;
};

export const resolveGetDotenvOptions = async (
  customOptions: Partial<GetDotenvOptions>,
) => {
  /**
   * Resolve {@link GetDotenvOptions} by layering defaults in ascending precedence:
   *
   * 1. Base defaults derived from the CLI generator defaults
   *    ({@link baseGetDotenvCliOptions}).
   * 2. Local project overrides from a `getdotenv.config.json` in the nearest
   *    package root (if present).
   * 3. The provided {@link customOptions}.
   *
   * The result preserves explicit empty values and drops only `undefined`.
   *
   * @returns Fully-resolved {@link GetDotenvOptions}.
   *
   * @example
   * ```ts
   * const options = await resolveGetDotenvOptions({ env: 'dev' });
   * ```
   */
  const localPkgDir = await packageDirectory();

  const localOptionsPath = localPkgDir
    ? join(localPkgDir, getDotenvOptionsFilename)
    : undefined;

  const localOptions = (
    localOptionsPath && (await fs.exists(localOptionsPath))
      ? JSON.parse((await fs.readFile(localOptionsPath)).toString())
      : {}
  ) as Partial<GetDotenvCliOptions>;

  // Merge order: base < local < custom (custom has highest precedence)
  const mergedCli = defaultsDeep(
    baseGetDotenvCliOptions,
    localOptions,
  ) as unknown as GetDotenvCliOptions;

  const defaultsFromCli = getDotenvCliOptions2Options(mergedCli);

  const result = defaultsDeep(
    defaultsFromCli as Partial<GetDotenvOptions>,
    customOptions,
  ) as unknown as GetDotenvOptions;

  return {
    ...result, // Keep explicit empty strings/zeros; drop only undefined
    vars: Object.fromEntries(
      Object.entries(result.vars ?? {}).filter(([, v]) => v !== undefined),
    ),
  };
};
