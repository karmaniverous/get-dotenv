import type { GetDotenvOptions } from '../GetDotenvOptions';
import { baseRootOptionDefaults } from './defaults';

export type Scripts = Record<
  string,
  string | { cmd: string; shell?: string | boolean }
>;
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
   * Strict mode: fail the run when env validation issues are detected
   * (schema or requiredKeys). Warns by default when false or unset.
   */
  strict?: boolean;
  /**
   * When true, capture child stdout/stderr and re-emit after completion.
   * Useful for tests/CI. Default behavior is streaming via stdio: 'inherit'.
   */
  capture?: boolean;

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
   * Scripts that can be executed from the CLI, either individually or via the batch subcommand.
   */
  scripts?: Scripts;

  /**
   * Determines how commands and scripts are executed. If `false` or
   * `undefined`, commands are executed as plain Javascript using the default
   * execa parser. If `true`, commands are executed using the default OS shell
   * parser. Otherwise the user may provide a specific shell string (e.g.
   * `/bin/bash`)
   */
  shell?: string | boolean;

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

export const baseGetDotenvCliOptions: Partial<GetDotenvCliOptions> =
  baseRootOptionDefaults as unknown as Partial<GetDotenvCliOptions>;
