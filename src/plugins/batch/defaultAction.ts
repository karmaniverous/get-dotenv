import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost';

import type { BatchPlugin } from '.';
import { runBatch } from './run';
import type { BatchParentInvokerFlags, BatchPluginOptions } from './types';

/**
 * Attach `batch`'s own action: `batch [command...]`, `batch -c <command>` and
 * `batch -l [globs...]` (see {@link runBatch}).
 */
export const attachBatchDefaultAction = (
  plugin: BatchPlugin,
  cli: GetDotenvCliPublic,
  pluginOpts: BatchPluginOptions,
  parent: CommandUnknownOpts,
) => {
  parent.action(async (...args: unknown[]) => {
    // The mount declares one argument, `[command...]` (attachBatchOptions),
    // so Commander passes [positionals, options, thisCommand]; an absent
    // variadic argument is [].
    const [positionals, flags, thisCommand] = args as [
      string[],
      BatchParentInvokerFlags,
      CommandUnknownOpts,
    ];
    await runBatch(plugin, cli, pluginOpts, thisCommand, {
      positionals,
      flags,
      form: 'batch',
    });
  });
};
