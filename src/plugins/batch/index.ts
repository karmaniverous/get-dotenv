/** src/plugins/batch/index.ts */
import { Command } from '@commander-js/extra-typings';

export type {
  BatchCmdSubcommandOptions,
  BatchGlobPathsOptions,
  BatchParentInvokerFlags,
  ExecShellCommandBatchOptions,
} from './types';

import { definePlugin } from '@/src/cliHost';

import { attachDefaultCmdAction } from './defaultCmdAction';
import { attachParentInvoker } from './parentInvoker';
import { BatchConfigSchema, type BatchPluginOptions } from './types';

/**
 * Batch plugin for the GetDotenv CLI host.
 *
 * Mirrors the legacy batch subcommand behavior without altering the shipped CLI.
 * Options:
 * - scripts/shell: used to resolve command and shell behavior per script or global default.
 */
export const batchPlugin = (opts: BatchPluginOptions = {}) => {
  const plugin = definePlugin({
    ns: 'batch',
    // Host validates this when config-loader is enabled; plugins may also
    // re-validate at action time as a safety belt.
    configSchema: BatchConfigSchema,
    setup(cli) {
      const batchCmd = cli; // mount provided by host
      const GROUP = `plugin:${cli.name()}`;

      batchCmd
        .description(
          'Batch command execution across multiple working directories.',
        )
        .enablePositionalOptions()
        .passThroughOptions()
        // Dynamic help: show effective defaults from the merged/interpolated plugin config slice.
        .addOption(
          (() => {
            const opt = plugin.createPluginDynamicOption(
              cli,
              '-p, --pkg-cwd',
              (_bag, cfg) =>
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
              (_bag, cfg) =>
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
              (_bag, cfg) =>
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
        .argument('[command...]');

      // Default subcommand "cmd" with contextual typing for args/opts
      const cmdSub = new Command()
        .name('cmd')
        .description(
          'execute command, conflicts with --command option (default subcommand)',
        )
        .enablePositionalOptions()
        .passThroughOptions()
        .argument('[command...]');
      attachDefaultCmdAction(plugin, cli, batchCmd, opts, cmdSub);
      batchCmd.addCommand(cmdSub, { isDefault: true });

      // Parent invoker (unified naming)
      attachParentInvoker(plugin, cli, opts, batchCmd);
      return undefined;
    },
  });

  return plugin;
};
