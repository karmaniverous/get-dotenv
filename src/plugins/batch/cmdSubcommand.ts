import { Command } from '@commander-js/extra-typings';

import type { definePlugin, GetDotenvCliPublic } from '@/src/cliHost';

import { attachBatchCmdAction } from './cmdAction';
import type { BatchPluginOptions } from './types';

/**
 * Attach the default `cmd` subcommand under the `batch` command.
 *
 * This encapsulates:
 * - Subcommand construction (`new Command().name('cmd')…`)
 * - Action wiring
 * - Mounting as the default subcommand for `batch`
 *
 * @param plugin - The batch plugin instance.
 * @param cli - The batch command mount.
 * @param batchCmd - The `batch` command (same as `cli` mount).
 * @param pluginOpts - Batch plugin factory options.
 *
 * @internal
 */
export const attachBatchCmdSubcommand = (
  plugin: ReturnType<typeof definePlugin>,
  cli: GetDotenvCliPublic,
  batchCmd: GetDotenvCliPublic,
  pluginOpts: BatchPluginOptions,
) => {
  const cmdSub = new Command()
    .name('cmd')
    .description(
      'execute command, conflicts with --command option (default subcommand)',
    )
    .enablePositionalOptions()
    .passThroughOptions()
    .argument('[command...]');

  attachBatchCmdAction(plugin, cli, batchCmd, pluginOpts, cmdSub);
  batchCmd.addCommand(cmdSub, { isDefault: true });
};
