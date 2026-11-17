/**
 * @packageDocumentation
 * Cmd plugin subpath. Provides the `cmd` subcommand and an optional parent‑level
 * alias to execute a command within the resolved dotenv context.
 */

import { definePlugin } from '@/src/cliHost';

import { attachCmdAlias, resolveAliasSpec } from './alias';
import { attachCmdDefaultAction } from './defaultAction';
import { attachCmdOptions } from './options';
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
    ...(options.asDefault ? { nsOptions: { isDefault: true } } : {}),
    configSchema: cmdPluginConfigSchema,
    setup(cli) {
      const aliasSpec = resolveAliasSpec(options.optionAlias);

      // Mount is the command ('cmd'); attach default action.
      cli.description(
        'Execute command according to the --shell option, conflicts with --command option (default subcommand)',
      );
      // Options/arguments (positional payload, argv routing) are attached separately.
      attachCmdOptions(cli);

      // The parent alias (optional) runs through the cmd action below.
      const alias = aliasSpec ? attachCmdAlias(cli, aliasSpec) : undefined;
      attachCmdDefaultAction(cli, plugin, alias);
      return undefined;
    },
  });
  return plugin;
};

/**
 * Cmd plugin instance type returned by {@link cmdPlugin}.
 *
 * @public
 */
export type CmdPlugin = ReturnType<typeof cmdPlugin>;
