import fs from 'fs-extra';
import { dirname, resolve } from 'path';
import { packageDirectorySync } from 'pkg-dir';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import type { GetDotenvOptions } from './GetDotenvOptions';

/**
 * Options passed programmatically to `getDotenvCli`.
 */
export interface GetDotenvCliOptions
  extends Omit<GetDotenvOptions, 'paths' | 'vars'> {
  /**
   * Cli alias. Should align with the `bin` property in `package.json`.
   */
  alias?: string;

  /**
   * Cli description (appears in CLI help).
   */
  description?: string;

  /**
   * Logs CLI internals when true.
   */
  debug?: boolean;

  /**
   * A delimited string of paths to dotenv files.
   */
  paths?: string;

  /**
   * A delimiter string with which to split `paths`. Only used if
   * `pathsDelimiterPattern` is not provided.
   */
  pathsDelimiter?: string;

  /**
   * A regular expression pattern with which to split `paths`. Supersedes
   * `pathsDelimiter`.
   */
  pathsDelimiterPattern?: string;

  /**
   * A delimited string of key-value pairs declaratively specifying variables &
   * values to be loaded in addition to any dotenv files.
   */
  vars?: string;

  /**
   * A string with which to split keys from values in `vars`. Only used if
   * `varsDelimiterPattern` is not provided.
   */
  varsAssignor?: string;

  /**
   * A regular expression pattern with which to split variable names from values
   * in `vars`. Supersedes `varsAssignor`.
   */
  varsAssignorPattern?: string;

  /**
   * A string with which to split `vars` into key-value pairs. Only used if
   * `varsDelimiterPattern` is not provided.
   */
  varsDelimiter?: string;

  /**
   * A regular expression pattern with which to split `vars` into key-value
   * pairs. Supersedes `varsDelimiter`.
   */
  varsDelimiterPattern?: string;
}

/**
 * Absolute path to the global default CLI options file `getdotenv.config.json`.
 *
 * If `get-dotenv` is imported directly, this is the `getdotenv.config.json`
 * file at the root of the `get-dotenv` package.
 *
 * If `get-dotenv` has been used to generate a CLI which is in turn being
 * imported, this is the `getdotenv.config.json` file at the root of the
 * imported package.
 */
const defaultGetDotenvCliOptionsGlobalPath = resolve(
  __dirname,
  '../getdotenv.config.json',
);

/**
 * Global default CLI options.
 *
 * If `get-dotenv` is imported directly, these are derived from the
 * `getdotenv.config.json` file at the root of the `get-dotenv` package.
 *
 * If `get-dotenv` has been used to generate a CLI which is in turn being
 * imported, they are derived from the `getdotenv.config.json` file at the root
 * of the imported package.
 *
 * @defaultValue `{}`
 */
export const defaultGetDotenvCliOptionsGlobal = {
  dotenvToken: '.env',
  loadProcess: true,
  paths: './',
  pathsDelimiter: ' ',
  privateToken: 'local',
  vars: '',
  varsAssignor: '=',
  varsDelimiter: ' ',
  ...(fs.existsSync(defaultGetDotenvCliOptionsGlobalPath)
    ? JSON.parse(
        fs.readFileSync(defaultGetDotenvCliOptionsGlobalPath).toString(),
      )
    : {}),
} as GetDotenvCliOptions;

/**
 * Path to the nearest package directory.
 */
const pkgDir = packageDirectorySync();
if (!pkgDir) throw new Error('Package directory not found.');

/**
 * Absolute path to the local default CLI options file `getdotenv.config.json`.
 */
const defaultGetDotenvCliOptionsLocalPath = resolve(
  pkgDir,
  'getdotenv.config.json',
);

/**
 * Local default CLI options.
 *
 * @defaultValue `{}`
 */
export const defaultGetDotenvCliOptionsLocal = (
  fs.existsSync(defaultGetDotenvCliOptionsLocalPath)
    ? JSON.parse(
        fs.readFileSync(defaultGetDotenvCliOptionsLocalPath).toString(),
      )
    : {}
) as GetDotenvCliOptions;
