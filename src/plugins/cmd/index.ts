/**
 * @packageDocumentation
 * Cmd plugin subpath. Provides the `cmd` subcommand and an optional parent‑level
 * alias to execute a command within the resolved dotenv context.
 */

import { definePlugin } from '@/src/cliHost';

import { attachCmdDefaultAction } from './defaultAction';
import { attachCmdOptions } from './options';
import { attachCmdParentInvoker } from './parentInvoker';
import { cmdPluginConfigSchema, type CmdPluginOptions } from './types';
export type { RunCmdWithContextOptions } from './types';

/**
 * Cmd plugin: executes a command using the current getdotenv CLI context.
 * Registers the `cmd` subcommand and optionally attaches a parent-level alias (e.g. `-c`).
 *
 * @param options - Plugin configuration options.
 */
export const cmdPlugin = (options: CmdPluginOptions = {}) => {
  const plugin = definePlugin({
    ns: 'cmd',
    configSchema: cmdPluginConfigSchema,
    setup(cli) {
      const aliasSpec =
        typeof options.optionAlias === 'string'
          ? { flags: options.optionAlias, description: undefined, expand: true }
          : options.optionAlias;
      const deriveKey = (flags: string) => {
        const long =
          flags.split(/[ ,|]+/).find((f) => f.startsWith('--')) ?? '--cmd';
        const name = long.replace(/^--/, '');
        return name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
      };
      const aliasKey = aliasSpec ? deriveKey(aliasSpec.flags) : undefined;

      // Mount is the command ('cmd'); attach default action.
      cli.description(
        'Execute command according to the --shell option, conflicts with --command option (default subcommand)',
      );
      // Options/arguments (positional payload, argv routing) are attached separately.
      attachCmdOptions(cli);

      attachCmdDefaultAction(cli, cli, aliasKey);

      // Parent-attached option alias (optional, unified naming).
      if (aliasSpec !== undefined) {
        attachCmdParentInvoker(cli, options, plugin);
      }
      return undefined;
    },
  });
  return plugin;
};

export type CmdPlugin = ReturnType<typeof cmdPlugin>;
