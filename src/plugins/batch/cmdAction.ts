import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost';

import type { BatchPlugin } from '.';
import { runBatch } from './run';
import type { BatchCmdSubcommandOptions, BatchPluginOptions } from './types';

/**
 * Attach the `batch cmd [command...]` action: it runs its positionals with
 * `batch`'s flags (see {@link runBatch}).
 */
export const attachBatchCmdAction = (
  plugin: BatchPlugin,
  cli: GetDotenvCliPublic,
  batchCmd: CommandUnknownOpts,
  pluginOpts: BatchPluginOptions,
  cmd: Command<[string[]]>,
) => {
  cmd.action(
    async (
      commandParts: string[],
      _subOpts: BatchCmdSubcommandOptions,
      thisCommand: CommandUnknownOpts,
    ) => {
      await runBatch(plugin, cli, pluginOpts, thisCommand, {
        positionals: commandParts.map(String),
        flags: batchCmd.opts(),
        form: 'cmd',
      });
    },
  );
};
