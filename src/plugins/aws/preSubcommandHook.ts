import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import type {
  GetDotenvCliPublic,
  PluginWithInstanceHelpers,
} from '@/src/cliHost';
import type { GetDotenvOptions } from '@/src/core';

import { applyAwsContext } from './common';
import { awsConfigOverridesFromCommandOpts } from './configOverrides';
import { resolveAwsContext } from './service';
import type { AwsPluginConfig } from './types';

/** @internal */
type AwsPluginInstance = PluginWithInstanceHelpers<
  GetDotenvOptions,
  AwsPluginConfig
>;

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
  plugin: AwsPluginInstance,
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
