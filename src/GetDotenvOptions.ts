// src/GetDotenvOptions.ts
import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import { join } from 'path';

import {
  baseGetDotenvCliOptions,
  type GetDotenvCliOptions,
} from './cliCore/GetDotenvCliOptions';
import type { RootOptionsShape } from './cliCore/types';
import { defaultsDeep } from './util/defaultsDeep';
export const getDotenvOptionsFilename = 'getdotenv.config.json';

// Compat: widen CLI-facing shapes at the converter boundary so projects that
// provide data-style config can pass vars as a map and paths as string[].
export type RootOptionsShapeCompat = Omit<
  RootOptionsShape,
  'vars' | 'paths'
> & {
  vars?: string | Record<string, string | undefined>;
  paths?: string | string[];
};
/**
 * A minimal representation of an environment key/value mapping.
 * Values may be `undefined` to represent "unset". */ export type ProcessEnv =
  Record<string, string | undefined>;

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
   * Reserved: config loader flag (no-op).
   * The plugin-first host and generator paths already use the config
   * loader/overlay pipeline unconditionally (no-op when no config files
   * are present). This flag is accepted for forward compatibility but
   * currently has no effect.
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
}: RootOptionsShapeCompat): GetDotenvOptions => {
  /**
   * Convert CLI-facing string options into {@link GetDotenvOptions}.
   *
   * - Splits {@link GetDotenvCliOptions.paths} using either a delimiter   *   or a regular expression pattern into a string array.   * - Parses {@link GetDotenvCliOptions.vars} as space-separated `KEY=VALUE`
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

  // Tolerate vars as either a CLI string ("A=1 B=2") or an object map.
  let parsedVars: ProcessEnv | undefined;
  if (typeof vars === 'string') {
    const kvPairs = splitBy(vars, varsDelimiter, varsDelimiterPattern).map(
      (v) =>
        v.split(
          varsAssignorPattern
            ? RegExp(varsAssignorPattern)
            : (varsAssignor ?? '='),
        ),
    ) as [string, string][];
    parsedVars = Object.fromEntries(kvPairs);
  } else if (vars && typeof vars === 'object' && !Array.isArray(vars)) {
    // Keep only string or undefined values to match ProcessEnv.
    const entries = Object.entries(vars as Record<string, unknown>).filter(
      ([k, v]) =>
        typeof k === 'string' && (typeof v === 'string' || v === undefined),
    ) as [string, string | undefined][];
    parsedVars = Object.fromEntries(entries);
  }

  // Drop undefined-valued entries at the converter stage to match ProcessEnv
  // expectations and the compat test assertions.
  if (parsedVars) {
    parsedVars = Object.fromEntries(
      Object.entries(parsedVars).filter(([, v]) => v !== undefined),
    );
  }

  // Tolerate paths as either a delimited string or string[]
  // Use a locally cast union type to avoid lint warnings about always-falsy conditions
  // under the RootOptionsShape (which declares paths as string | undefined).
  const pathsAny = paths as unknown as string[] | string | undefined;
  const pathsOut = Array.isArray(pathsAny)
    ? pathsAny.filter((p): p is string => typeof p === 'string')
    : splitBy(pathsAny, pathsDelimiter, pathsDelimiterPattern);

  // Preserve exactOptionalPropertyTypes: only include keys when defined.
  return {
    ...(restObj as Partial<GetDotenvOptions>),
    ...(pathsOut.length > 0 ? { paths: pathsOut } : {}),
    ...(parsedVars !== undefined ? { vars: parsedVars } : {}),
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

  // Safely read local CLI-facing defaults (defensive typing to satisfy strict linting).
  let localOptions: Partial<GetDotenvCliOptions> = {};
  if (localOptionsPath && (await fs.exists(localOptionsPath))) {
    try {
      const txt = await fs.readFile(localOptionsPath, 'utf-8');
      const parsed = JSON.parse(txt) as unknown;
      if (parsed && typeof parsed === 'object') {
        localOptions = parsed as Partial<GetDotenvCliOptions>;
      }
    } catch {
      // Malformed or unreadable local options are treated as absent.
      localOptions = {};
    }
  }

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
