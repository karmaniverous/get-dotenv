/** src/plugins/batch/index.ts */
import type { GetDotenvCliPublic } from '@karmaniverous/get-dotenv/cliHost';
import type { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { Command } from 'commander';

import { definePlugin } from '../../cliHost/definePlugin';
import type { GetDotenvOptions } from '../../GetDotenvOptions';
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
 * Mirrors the legacy batch subcommand behavior without altering the shipped CLI.
 * Options:
 * - scripts/shell: used to resolve command and shell behavior per script or global default.
 * - logger: defaults to console.
 */
export const batchPlugin = (opts: BatchPluginOptions = {}) => {
  const plugin = definePlugin<GetDotenvOptions, BatchConfig>({
    id: 'batch',
    // Host validates this when config-loader is enabled; plugins may also
    // re-validate at action time as a safety belt.
    configSchema: BatchConfigSchema,
    setup(cli: GetDotenvCliPublic) {
      const ns = cli.ns('batch');
      const batchCmd = ns; // capture the parent "batch" command for default-subcommand context
      const host = cli as unknown as GetDotenvCli;
      const pluginId = 'batch';
      const GROUP = `plugin:${pluginId}`;

      ns.description(
        'Batch command execution across multiple working directories.',
      )
        .enablePositionalOptions()
        .passThroughOptions()
        // Dynamic help: show effective defaults from the merged/interpolated plugin config slice.
        .addOption(
          (() => {
            const opt = plugin.createPluginDynamicOption<BatchConfig>(
              '-p, --pkg-cwd',
              (_bag, cfg) =>
                `use nearest package directory as current working directory${cfg?.pkgCwd ? ' (default)' : ''}`,
            );
            cli.setOptionGroup(opt, GROUP);
            return opt;
          })(),
        )
        .addOption(
          (() => {
            const opt = plugin.createPluginDynamicOption<BatchConfig>(
              '-r, --root-path <string>',
              (_bag, cfg) =>
                `path to batch root directory from current working directory (default: ${JSON.stringify(
                  cfg?.rootPath || './',
                )})`,
            );
            cli.setOptionGroup(opt, GROUP);
            return opt;
          })(),
        )
        .addOption(
          (() => {
            const opt = plugin.createPluginDynamicOption<BatchConfig>(
              '-g, --globs <string>',
              (_bag, cfg) =>
                `space-delimited globs from root path (default: ${JSON.stringify(
                  cfg?.globs || '*',
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
        .addCommand(
          new Command()
            .name('cmd')
            .description(
              'execute command, conflicts with --command option (default subcommand)',
            )
            .enablePositionalOptions()
            .passThroughOptions()
            .argument('[command...]')
            .action(buildDefaultCmdAction(plugin, cli, batchCmd, opts)),
          { isDefault: true },
        )
        .action(buildParentAction(plugin, cli, opts));
    },
  });
  return plugin;
};
