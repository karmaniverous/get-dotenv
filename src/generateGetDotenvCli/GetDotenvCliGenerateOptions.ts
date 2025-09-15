import type { Command } from '@commander-js/extra-typings';
import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import { join } from 'path';
import { fileURLToPath } from 'url';

import {
  getDotenvOptionsFilename,
  type Logger,
  type ProcessEnv,
} from '../GetDotenvOptions';
import { defaultsDeep } from '../util/defaultsDeep';
import {
  baseGetDotenvCliOptions,
  type GetDotenvCliOptions,
} from './GetDotenvCliOptions';

/**
 * GetDotenv CLI Pre-hook Callback function type. Mutates inbound options & * executes side effects within the `getDotenv` context.
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
export interface GetDotenvCliGenerateOptions extends GetDotenvCliOptions {
  /**
   * CLI alias. Should align with the `bin` property in `package.json`.
   */
  alias: string;

  /**
   * Cli description (appears in CLI help).
   */
  description: string;

  /**
   * The `import.meta.url` of the module generating the CLI.
   */
  importMetaUrl: string;

  /**
   * Logger object (defaults to console)
   */
  logger: Logger;

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
  getDotenvCliOptions: GetDotenvCliOptions;
}

/**
 * Resolve `GetDotenvCliGenerateOptions` from `import.meta.url` and custom options.
 */
export const resolveGetDotenvCliGenerateOptions = async ({
  importMetaUrl,
  ...customOptions
}: Partial<GetDotenvCliGenerateOptions>) => {
  const baseOptions: Partial<GetDotenvCliGenerateOptions> = {
    ...baseGetDotenvCliOptions,
    alias: 'getdotenv',
    description: 'Base CLI.',
  };

  const globalPkgDir = importMetaUrl
    ? await packageDirectory({
        cwd: fileURLToPath(importMetaUrl),
      })
    : undefined;

  const globalOptionsPath = globalPkgDir
    ? join(globalPkgDir, getDotenvOptionsFilename)
    : undefined;

  const globalOptions = (
    globalOptionsPath && (await fs.exists(globalOptionsPath))
      ? JSON.parse((await fs.readFile(globalOptionsPath)).toString())
      : {}
  ) as Partial<GetDotenvCliGenerateOptions>;

  const localPkgDir = await packageDirectory();

  const localOptionsPath = localPkgDir
    ? join(localPkgDir, getDotenvOptionsFilename)
    : undefined;

  const localOptions = (
    localOptionsPath &&
    localOptionsPath !== globalOptionsPath &&
    (await fs.exists(localOptionsPath))
      ? JSON.parse((await fs.readFile(localOptionsPath)).toString())
      : {}
  ) as Partial<GetDotenvCliGenerateOptions>;

  // Merge order: base < global < local < custom
  const merged = defaultsDeep(
    baseOptions,
    globalOptions,
    localOptions,
    customOptions as Partial<GetDotenvCliGenerateOptions>,
  ) as unknown as GetDotenvCliGenerateOptions;

  return merged;
};
