import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost';
import type { GetDotenvOptions } from '@/src/core';

import type { BatchPlugin } from '.';
import type { BatchPluginConfig } from './types';

/**
 * Option values parsed for the `batch` command mount.
 *
 * @public
 */
export interface BatchCommandOptionValues {
  /**
   * When true, resolve the batch root from the nearest package directory instead of `process.cwd()`.
   */
  pkgCwd?: boolean;
  /**
   * Root path (relative to CWD or package directory) for resolving globs.
   */
  rootPath?: string;
  /**
   * Space-delimited glob patterns relative to {@link BatchCommandOptionValues.rootPath}.
   */
  globs?: string;
  /**
   * Command string executed according to the resolved shell preference.
   */
  command?: string;
  /**
   * When true, list matched working directories without executing a command.
   */
  list?: boolean;
  /**
   * When true, ignore errors and continue with the next matched directory.
   */
  ignoreErrors?: boolean;
}

/**
 * Command type returned by {@link attachBatchOptions}.
 *
 * @public
 */
export type BatchCommand = GetDotenvCliPublic<
  GetDotenvOptions,
  [string[]],
  BatchCommandOptionValues,
  OptionValues
>;

/**
 * Attach options/arguments for the batch plugin mount.
 *
 * Note: the plugin description is owned by `src/plugins/batch/index.ts` and
 * must not be set here.
 *
 * @param plugin - Batch plugin instance (for dynamic option descriptions).
 * @param cli - The `batch` command mount.
 * @returns The same `cli` instance for chaining.
 *
 * @internal
 */
export function attachBatchOptions(
  plugin: BatchPlugin,
  cli: GetDotenvCliPublic,
): BatchCommand {
  const GROUP = `plugin:${cli.name()}`;

  return (
    cli
      .enablePositionalOptions()
      .passThroughOptions()
      // Dynamic help: show effective defaults from the merged/interpolated plugin config slice.
      .addOption(
        (() => {
          const opt = plugin.createPluginDynamicOption(
            cli,
            '-p, --pkg-cwd',
            (_bag, cfg: Readonly<BatchPluginConfig>) =>
              `use nearest package directory as current working directory${cfg.pkgCwd ? ' (default)' : ''}`,
          );
          cli.setOptionGroup(opt, GROUP);
          return opt;
        })(),
      )
      .addOption(
        (() => {
          const opt = plugin.createPluginDynamicOption(
            cli,
            '-r, --root-path <string>',
            (_bag, cfg: Readonly<BatchPluginConfig>) =>
              `path to batch root directory from current working directory (default: ${JSON.stringify(
                cfg.rootPath || './',
              )})`,
          );
          cli.setOptionGroup(opt, GROUP);
          return opt;
        })(),
      )
      .addOption(
        (() => {
          const opt = plugin.createPluginDynamicOption(
            cli,
            '-g, --globs <string>',
            (_bag, cfg: Readonly<BatchPluginConfig>) =>
              `space-delimited globs from root path (default: ${JSON.stringify(
                cfg.globs || '*',
              )})`,
          );
          cli.setOptionGroup(opt, GROUP);
          return opt;
        })(),
      )
      .option(
        '-c, --command <string>',
        'command executed according to the base shell resolution',
      )
      .option(
        '-l, --list',
        'list working directories without executing command',
      )
      .option(
        '-e, --ignore-errors',
        'ignore errors and continue with next path',
      )
      .argument('[command...]')
  );
}
