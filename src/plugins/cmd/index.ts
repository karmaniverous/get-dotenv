import type { Command } from '@commander-js/extra-typings';
import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import { definePlugin } from '@/src/cliHost/definePlugin';

import { attachDefaultCmdAction } from './defaultCmdAction';
import { attachParentInvoker } from './parentInvoker';
import { CmdConfigSchema, type CmdPluginOptions } from './types';

/** Cmd plugin: executes a command using the current getdotenv CLI context. */
export const cmdPlugin = (options: CmdPluginOptions = {}) =>
  definePlugin({
    id: 'cmd',
    configSchema: CmdConfigSchema,
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

      // Create subcommand and attach default action (unified naming).
      const cmd = cli
        .createCommand('cmd')
        .description(
          'Execute command according to the --shell option, conflicts with --command option (default subcommand)',
        )
        .argument('[command...]') as unknown as Command<[string[]]>;
      attachDefaultCmdAction(cli, cmd, aliasKey);

      if (options.asDefault) cli.addCommand(cmd, { isDefault: true });
      else cli.addCommand(cmd);

      // Parent-attached option alias (optional, unified naming).
      if (aliasSpec !== undefined)
        attachParentInvoker(
          cli,
          options,
          cmd as unknown as CommandUnknownOpts,
          this as unknown as ReturnType<typeof definePlugin>,
        );
      return undefined;
    },
  });
