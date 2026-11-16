import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost';
import { helpTargetOf } from '@/src/cliHost/qualified/walk';

import type { AwsPlugin } from '.';
import { awsConfigWithFlags } from './configOverrides';
import { establishAwsSession } from './session';

/**
 * Whether the parse in progress renders help for `command` or a descendant.
 *
 * @param command - The command whose hook runs.
 * @returns Whether it does.
 */
const helpTargetIsWithin = (command: CommandUnknownOpts): boolean => {
  let root = command;
  while (root.parent) root = root.parent;
  const rawArgs = (root as unknown as { rawArgs?: string[] }).rawArgs ?? [];
  let c: CommandUnknownOpts | null | undefined = helpTargetOf(root, rawArgs);
  for (; c; c = c.parent) if (c === command) return true;
  return false;
};

/**
 * Attach the AWS plugin `preSubcommand` hook.
 *
 * For `aws <flags> <child>` it establishes the invocation's AWS session with
 * the `aws` flags applied, before the child runs; the `afterResolve` hook
 * and the child then keep that session (#56).
 *
 * @param cli - The `aws` command mount.
 * @param plugin - The AWS plugin instance.
 *
 * @internal
 */
export function attachAwsPreSubcommandHook(
  cli: GetDotenvCliPublic,
  plugin: AwsPlugin,
): void {
  cli.hook('preSubcommand', async (thisCommand: CommandUnknownOpts) => {
    // No session for a help request on aws or an aws child (#84): read the
    // argv being parsed (the root's normalized rawArgs), not process.argv,
    // so a -h that belongs to a forwarded command or follows -- is not one.
    if (helpTargetIsWithin(thisCommand)) return;

    await establishAwsSession(
      cli.getCtx(),
      awsConfigWithFlags(plugin, cli, thisCommand.opts()),
    );
  });
}
