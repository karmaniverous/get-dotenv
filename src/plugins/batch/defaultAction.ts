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
    // Commander passes: [positionals, options, thisCommand]
    const thisCommand = args[args.length - 1] as CommandUnknownOpts;
    const flags =
      args.length >= 2
        ? (args[args.length - 2] as BatchParentInvokerFlags)
        : {};
    const positionals = (
      Array.isArray(args[0]) ? (args[0] as unknown[]) : []
    ).map(String);
    await runBatch(plugin, cli, pluginOpts, thisCommand, {
      positionals,
      flags,
      form: 'batch',
    });
  });
};
