/**
 * @packageDocumentation
 * Batch plugin subpath. Provides the `batch` command for executing a command
 * across multiple working directories using glob discovery, with optional list
 * mode and script‑aware shell resolution.
 */

export type {
  BatchCmdSubcommandOptions,
  BatchGlobPathsOptions,
  BatchParentInvokerFlags,
  ExecShellCommandBatchOptions,
} from './types';

import { definePlugin } from '@/src/cliHost';

import { attachBatchCmdSubcommand } from './cmdSubcommand';
import { attachBatchDefaultAction } from './defaultAction';
import { attachBatchOptions } from './options';
import { batchPluginConfigSchema, type BatchPluginOptions } from './types';

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
    configSchema: batchPluginConfigSchema,
    setup(cli) {
      const batchCmd = cli; // mount provided by host
      batchCmd.description(
        'Batch command execution across multiple working directories.',
      );
      attachBatchOptions(plugin, batchCmd);

      // Default subcommand `cmd` (mounted as batch default subcommand)
      attachBatchCmdSubcommand(plugin, cli, batchCmd, opts);

      // Default action for the batch command mount (parent flags and positional form)
      attachBatchDefaultAction(plugin, cli, opts, batchCmd);

      return undefined;
    },
  });

  return plugin;
};

export type BatchPlugin = ReturnType<typeof batchPlugin>;
