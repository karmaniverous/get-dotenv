import type { GetDotenvCliPublic } from '@karmaniverous/get-dotenv/cliHost';
import type { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { Command as Commander } from 'commander';

import { definePlugin } from '../../cliHost/definePlugin';
import { buildDefaultCmdAction } from './actions/defaultCmdAction';
import { buildParentAction } from './actions/parentAction';
import {
  type BatchConfig,
  BatchConfigSchema,
  type BatchPluginOptions,
} from './types';

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
    setup(cli: GetDotenvCliPublic) {
      const ns = cli.ns('batch');
      const batchCmd = ns; // capture the parent "batch" command for default-subcommand context
      const host = cli as unknown as GetDotenvCli;
      const pluginId = 'batch';

      ns.description(
        'Batch command execution across multiple working directories.',
      )
        .enablePositionalOptions()
        .passThroughOptions()
        // Dynamic help: show effective defaults from the merged/interpolated plugin config slice.
        .addOption(
          host.createDynamicOption('-p, --pkg-cwd', (cfg) => {
            const slice = ((
              cfg as unknown as {
                plugins?: Record<string, unknown>;
              }
            ).plugins?.[pluginId] ?? {}) as BatchConfig;
            const on = !!slice.pkgCwd;
            return `use nearest package directory as current working directory${on ? ' (default)' : ''}`;
          }),
        )
        .addOption(
          host.createDynamicOption('-r, --root-path <string>', (cfg) => {
            const slice = ((
              cfg as unknown as {
                plugins?: Record<string, unknown>;
              }
            ).plugins?.[pluginId] ?? {}) as BatchConfig;
            const def =
              typeof slice.rootPath === 'string' && slice.rootPath.length > 0
                ? slice.rootPath
                : './';
            return `path to batch root directory from current working directory (default: ${JSON.stringify(
              def,
            )})`;
          }),
        )
        .addOption(
          host.createDynamicOption('-g, --globs <string>', (cfg) => {
            const slice = ((
              cfg as unknown as {
                plugins?: Record<string, unknown>;
              }
            ).plugins?.[pluginId] ?? {}) as BatchConfig;
            const def =
              typeof slice.globs === 'string' && slice.globs.length > 0
                ? slice.globs
                : '*';
            return `space-delimited globs from root path (default: ${JSON.stringify(
              def,
            )})`;
          }),
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
