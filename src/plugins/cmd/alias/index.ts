import type { Command } from 'commander';

import type { GetDotenvCliPublic } from '../../../cliHost';
import type { CmdPluginOptions } from '../index';
import { maybeRunAlias } from './maybeRunAlias';

export const attachParentAlias = (
  cli: GetDotenvCliPublic,
  options: CmdPluginOptions,
  _cmd: Command,
) => {
  const aliasSpec =
    typeof options.optionAlias === 'string'
      ? { flags: options.optionAlias, description: undefined, expand: true }
      : options.optionAlias;
  if (!aliasSpec) return;

  const deriveKey = (flags: string) => {
    if (process.env.GETDOTENV_DEBUG) {
      console.error('[getdotenv:alias] install alias option', flags);
    }
    const long =
      flags.split(/[ ,|]+/).find((f) => f.startsWith('--')) ?? '--cmd';
    const name = long.replace(/^--/, '');
    return name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
  };
  const aliasKey = deriveKey(aliasSpec.flags);

  // Expose the option on the parent.
  const desc =
    aliasSpec.description ??
    'alias of cmd subcommand; provide command tokens (variadic)';
  cli.option(aliasSpec.flags, desc);
  // Tag the just-added parent option for grouped help rendering at the root.
  const optsArr = cli.options;
  if (optsArr.length > 0) {
    const last = optsArr[optsArr.length - 1];
    if (last) cli.setOptionGroup(last, 'plugin:cmd');
  }

  // Shared alias executor for either preAction or preSubcommand hooks.
  // Ensure we only execute once even if both hooks fire in a single parse.
  const aliasState = { handled: false };
  const maybeRun = async (thisCommand: Command) => {
    await maybeRunAlias(
      cli as unknown as GetDotenvCliPublic,
      thisCommand,
      aliasKey,
      aliasState,
    );
  };

  cli.hook(
    'preAction',
    async (thisCommand: Command, _actionCommand: Command) => {
      await maybeRun(thisCommand);
    },
  );
  cli.hook('preSubcommand', async (thisCommand: Command) => {
    await maybeRun(thisCommand);
  });
};
