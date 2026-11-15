import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost';

import type { AwsPlugin } from '.';
import { awsConfigWithFlags } from './configOverrides';
import { establishAwsSession } from './session';

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
    // Avoid side effects for help rendering.
    if (process.argv.includes('-h') || process.argv.includes('--help')) return;

    await establishAwsSession(
      cli.getCtx(),
      awsConfigWithFlags(plugin, cli, thisCommand.opts()),
    );
  });
}
