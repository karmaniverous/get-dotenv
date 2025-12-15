import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost';

import type { AwsPlugin } from '.';
import { applyAwsContext } from './common';
import { awsConfigOverridesFromCommandOpts } from './configOverrides';
import { resolveAwsContext } from './service';
import type { AwsPluginConfig } from './types';

/**
 * Attach the AWS plugin `preSubcommand` hook.
 *
 * Ensures `aws --profile/--region <child>` applies the AWS session setup before
 * child subcommand execution.
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

    const ctx = cli.getCtx();
    const cfgBase = plugin.readConfig(cli);
    const cfg: AwsPluginConfig = {
      ...cfgBase,
      ...awsConfigOverridesFromCommandOpts(thisCommand.opts()),
    };

    const out = await resolveAwsContext({
      dotenv: ctx.dotenv,
      cfg,
    });

    applyAwsContext(out, ctx, true);
  });
}
