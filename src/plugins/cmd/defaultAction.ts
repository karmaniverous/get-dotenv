import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import { type GetDotenvCliPublic, readMergedOptions } from '@/src/cliHost';
import { propagateExitCode } from '@/src/cliHost/exitCode';
import { dotenvExpandFromProcessEnv } from '@/src/dotenv';

import type { CmdPlugin } from '.';
import type { CmdAlias } from './alias';
import { runCmdWithContext } from './runner';
import type { CmdPluginConfig } from './types';

/**
 * Attach the cmd action: the one code path for `cmd <command...>`, the
 * default command and the parent alias (`-c <command...>`, routed here when
 * no explicit subcommand follows it). All three use the merged options bag
 * (createCli defaults, config `scripts`), the root hooks' context and
 * `afterResolve` scoping, and exit with the child's code.
 *
 * @param cli - The cmd mount.
 * @param plugin - The cmd plugin (for its config).
 * @param alias - The parent alias, when configured.
 */
export const attachCmdDefaultAction = (
  cli: GetDotenvCliPublic,
  plugin: CmdPlugin,
  alias?: CmdAlias,
) => {
  cli.action(async (...allArgs: unknown[]) => {
    // Commander passes: [...positionals, options, thisCommand]
    const thisCommand = allArgs[allArgs.length - 1] as CommandUnknownOpts;
    const positional = Array.isArray(allArgs[0])
      ? (allArgs[0] as unknown[]).map(String)
      : [];
    const aliasValue =
      alias && thisCommand.parent
        ? alias.valueOn(thisCommand.parent)
        : undefined;
    // No-op when invoked as the default command with nothing to run.
    if (positional.length === 0 && aliasValue === undefined) return;

    const merged = readMergedOptions(thisCommand);
    if (alias && aliasValue !== undefined && positional.length > 0) {
      merged.logger.error(
        `${alias.flag} option conflicts with cmd subcommand.`,
      );
      process.exitCode = 1;
      return;
    }

    const input =
      aliasValue === undefined
        ? positional
        : expandAlias(
            aliasValue,
            plugin.readConfig<CmdPluginConfig>(cli).expand ?? alias?.expand,
          );
    propagateExitCode(
      await runCmdWithContext(cli, merged, input, {
        origin: aliasValue === undefined ? 'subcommand' : 'alias',
      }),
    );
  });
};

// The alias value is dotenv-expanded against process.env (the context is
// loaded by now) unless expansion is off.
const expandAlias = (value: string, expand: boolean | undefined): string =>
  expand === false ? value : (dotenvExpandFromProcessEnv(value) ?? value);
