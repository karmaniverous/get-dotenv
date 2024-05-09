import fs from 'fs-extra';
import _ from 'lodash';
import { join } from 'path';
import { packageDirectory } from 'pkg-dir';

import {
  baseGetDotenvCliOptions,
  type GetDotenvCliOptions,
} from './generateGetDotenvCli/GetDotenvCliOptions';

export const getDotenvOptionsFilename = 'getdotenv.config.json';

export type ProcessEnv = Record<string, string | undefined>;

export type GetDotenvDynamicFunction = (vars: ProcessEnv) => string | undefined;

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
}: GetDotenvCliOptions): GetDotenvOptions => ({
  ..._.omit(rest, ['debug', 'shellScripts']),
  paths:
    paths?.split(
      pathsDelimiterPattern
        ? RegExp(pathsDelimiterPattern)
        : pathsDelimiter ?? ' ',
    ) ?? [],
  vars: _.fromPairs(
    vars
      ?.split(
        varsDelimiterPattern
          ? RegExp(varsDelimiterPattern)
          : varsDelimiter ?? ' ',
      )
      .map((v) =>
        v.split(
          varsAssignorPattern
            ? RegExp(varsAssignorPattern)
            : varsAssignor ?? '=',
        ),
      ),
  ),
});

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

  const result = _.defaultsDeep(
    customOptions,
    getDotenvCliOptions2Options(
      _.defaultsDeep(
        localOptions,
        baseGetDotenvCliOptions,
      ) as GetDotenvCliOptions,
    ),
  ) as GetDotenvOptions;

  return {
    ...result,
    vars: _.pickBy(result.vars ?? {}, (v) => !!v),
  };
};
