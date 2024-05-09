import type { GetDotenvOptions } from '../GetDotenvOptions';

/**
 * Options passed programmatically to `getDotenvCli`.
 */
export interface GetDotenvCliOptions
  extends Omit<GetDotenvOptions, 'paths' | 'vars'> {
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
   * Shell scripts that can be executed from the CLI, either individually or via the batch subcommand.
   */
  shellScripts?: Record<string, string>;

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

export const baseGetDotenvCliOptions: Partial<GetDotenvCliOptions> = {
  dotenvToken: '.env',
  loadProcess: true,
  logger: console,
  paths: './',
  pathsDelimiter: ' ',
  privateToken: 'local',
  shellScripts: {
    'git-status': 'git branch --show-current && git status -s -u',
  },
  vars: '',
  varsAssignor: '=',
  varsDelimiter: ' ',
};
