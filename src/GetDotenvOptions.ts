import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import { join } from 'path';

import {
  baseGetDotenvCliOptions,
  type GetDotenvCliOptions,
} from './generateGetDotenvCli/GetDotenvCliOptions';
import { defaultsDeep } from './util/defaultsDeep';

export const getDotenvOptionsFilename = 'getdotenv.config.json';
export type ProcessEnv = Record<string, string | undefined>;

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
   * path to JS module default-exporting an object keyed to dynamic variable functions
   */
  dynamicPath?: string;

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
}

/**
 * Converts programmatic CLI options to `getDotenv` options.
 *
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
}: GetDotenvCliOptions): GetDotenvOptions => {
  // Drop CLI-only keys
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { debug, scripts, ...restFlags } = rest as Record<string, unknown>;

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

  return {
    ...(restFlags as Omit<GetDotenvOptions, 'paths' | 'vars'>),
    paths: splitBy(paths, pathsDelimiter, pathsDelimiterPattern),
    vars: parsedVars,
  };
};

export const resolveGetDotenvOptions = async (
  customOptions: Partial<GetDotenvOptions>,
) => {
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
    baseGetDotenvCliOptions as Partial<GetDotenvCliOptions>,
    localOptions as Partial<GetDotenvCliOptions>,
  ) as unknown as GetDotenvCliOptions;

  const defaultsFromCli = getDotenvCliOptions2Options(mergedCli);

  const result = defaultsDeep(
    defaultsFromCli as Partial<GetDotenvOptions>,
    customOptions as Partial<GetDotenvOptions>,
  ) as unknown as GetDotenvOptions;

  return {
    ...result, // Keep explicit empty strings/zeros; drop only undefined
    vars: Object.fromEntries(
      Object.entries(result.vars ?? {}).filter(([, v]) => v !== undefined),
    ),
  };
};
