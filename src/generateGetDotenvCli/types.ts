import type { Command } from '@commander-js/extra-typings';

import type { GetDotenvCliOptions } from '../GetDotenvCliOptions';
import type { GetDotenvOptions, Logger, ProcessEnv } from '../GetDotenvOptions';

/**
 * GetDotenv CLI Pre-hook Callback function type. Mutates inbound options &
 * executes side effects within the `getDotenv` context.
 */
export type GetDotenvCliPreHookCallback = (
  options: GetDotenvCliOptions,
) => Promise<void>;

/**
 * GetDotenv CLI Post-hook Callback function type. Executes side effects within
 * the `getDotenv` context.
 */
export type GetDotenvCliPostHookCallback = (
  dotenv: ProcessEnv,
) => Promise<void>;

/**
 * `generateGetDotenvCli` options. Defines local instance of the GetDotenv CLI and
 * sets defaults that can be overridden by local `getdotenv.config.json` in
 * projects that import the CLI.
 */
export interface GetDotenvCliGenerateOptions
  extends Omit<GetDotenvCliOptions, 'env'> {
  /**
   * Logger object (defaults to console)
   */
  logger?: Logger;

  /**
   * Mutates inbound options & executes side effects within the `getDotenv`
   * context before executing CLI commands.
   */
  preHook?: GetDotenvCliPreHookCallback;

  /**
   * Executes side effects within the `getDotenv` context after executing CLI
   * commands.
   */
  postHook?: GetDotenvCliPostHookCallback;
}

/**
 * Commander Commmand extended with GetDotEnvOptions.
 */
export interface GetDotenvCliCommand extends Command {
  getDotenvOptions: GetDotenvOptions;
}
