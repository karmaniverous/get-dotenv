import { Command as Commander } from 'commander';

import { definePlugin } from '../../cliHost/definePlugin';
import type { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { buildDefaultCmdAction } from './actions/defaultCmdAction';
import { buildParentAction } from './actions/parentAction';
import { BatchConfigSchema, type BatchPluginOptions } from './types';

/**
 * Batch plugin for the GetDotenv CLI host.
 *
 * Mirrors the legacy batch subcommand behavior without altering the shipped CLI. * Options:
 * - scripts/shell: used to resolve command and shell behavior per script or global default.
 * - logger: defaults to console.
 */
export const batchPlugin = (opts: BatchPluginOptions = {}) =>
  definePlugin({
    id: 'batch',
    // Host validates this when config-loader is enabled; plugins may also
    // re-validate at action time as a safety belt.
    configSchema: BatchConfigSchema,
    setup(cli: GetDotenvCli) {
      const ns = cli.ns('batch');
      const batchCmd = ns; // capture the parent "batch" command for default-subcommand context

      ns.description(
        'Batch command execution across multiple working directories.',
      )
        .enablePositionalOptions()
        .passThroughOptions()
        .option(
          '-p, --pkg-cwd',
          'use nearest package directory as current working directory',
        )
        .option(
          '-r, --root-path <string>',
          'path to batch root directory from current working directory',
          './',
        )
        .option(
          '-g, --globs <string>',
          'space-delimited globs from root path',
          '*',
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
        .addCommand(
          new Commander()
            .name('cmd')
            .description(
              'execute command, conflicts with --command option (default subcommand)',
            )
            .enablePositionalOptions()
            .passThroughOptions()
            .argument('[command...]')
            .action(buildDefaultCmdAction(cli, batchCmd, opts)),
          { isDefault: true },
        )
        .action(buildParentAction(cli, opts));
    },
  });
