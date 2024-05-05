import _ from 'lodash';

import {
  defaultGetDotenvCliOptionsGlobal,
  defaultGetDotenvCliOptionsLocal,
  type GetDotenvCliOptions,
} from './GetDotenvCliOptions';

export type ProcessEnv = Record<string, string | undefined>;

export type GetDotenvDynamicFunction = (vars: ProcessEnv) => string | undefined;

export type GetDotenvDynamic = Record<
  string,
  GetDotenvDynamicFunction | ReturnType<GetDotenvDynamicFunction>
>;

export type Logger = Record<string, (...args: unknown[]) => void>;

/**
 * Options passed programmatically to `getDotenv` and `getDotEnvSync`.
 */
export interface GetDotenvOptions {
  /**
   * default target environment (used if `env` is not provided)
   */
  defaultEnv?: string;

  /**
   * token indicating a dotenv file
   */
  dotenvToken?: string;

  /**
   * path to file exporting an object keyed to dynamic variable functions
   */
  dynamicPath?: string;

  /**
   * target environment
   */
  env?: string;

  /**
   * exclude dynamic variables
   */
  excludeDynamic?: boolean;

  /**
   * exclude environment-specific variables
   */
  excludeEnv?: boolean;

  /**
   * exclude global variables
   */
  excludeGlobal?: boolean;

  /**
   * exclude private variables
   */
  excludePrivate?: boolean;

  /**
   * exclude public variables
   */
  excludePublic?: boolean;

  /**
   * load dotenv to process.env
   */
  loadProcess?: boolean;

  /**
   * log result to logger
   */
  log?: boolean;

  /**
   * logger object (defaults to console)
   */
  logger?: Logger;

  /**
   * if populated, writes consolidated .env file to this path (follows dotenvExpand rules)
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
 * Merges two sets of `getDotenv` options and eliminates any falsy `vars`. `target` takes precedence.
 *
 * @param target - Target options object (takes precedence).
 * @param source - Source options object (provides defaults).
 * @returns Merged options object.
 */
export const mergeGetDotenvOptions = (
  target: GetDotenvOptions = {},
  source: GetDotenvOptions = {},
): GetDotenvOptions => ({
  ...source,
  ...target,
  vars: _.pickBy(
    {
      ...(source.vars ?? {}),
      ...(target.vars ?? {}),
    },
    (v) => !!v,
  ),
});

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
}: GetDotenvCliOptions = {}): GetDotenvOptions => ({
  ...rest,
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

/**
 * Extracts default programmatic `getDotenv` options from the global & local
 * CLI options defined in the respective `getdotenv.config.json` files.
 */
export const getDotenvDefaultOptions = getDotenvCliOptions2Options({
  ...defaultGetDotenvCliOptionsGlobal,
  ...defaultGetDotenvCliOptionsLocal,
});
