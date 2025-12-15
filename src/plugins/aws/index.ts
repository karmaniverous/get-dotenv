/**
 * @packageDocumentation
 * AWS plugin subpath. Establishes an AWS session (profile/region/credentials)
 * and optionally forwards to the AWS CLI; includes a nested `whoami` child.
 */

export type { ResolveAwsContextOptions } from './types';
import { definePlugin } from '@/src/cliHost';

import { attachAwsAfterResolveHook } from './afterResolveHook';
import { attachAwsDefaultAction } from './defaultAction';
import { attachAwsOptions } from './options';
import { attachAwsPreSubcommandHook } from './preSubcommandHook';
import { AwsPluginConfigSchema } from './types';

/**
 * AWS plugin: establishes an AWS session (credentials/region) based on dotenv configuration.
 * Supports SSO login-on-demand and credential exporting.
 * Can be used as a parent command to wrap `aws` CLI invocations.
 */
export const awsPlugin = () => {
  const plugin = definePlugin({
    ns: 'aws',
    configSchema: AwsPluginConfigSchema,
    setup(cli) {
      cli.description(
        'Establish an AWS session and optionally forward to the AWS CLI',
      );
      const awsCmd = attachAwsOptions(cli, plugin);
      attachAwsPreSubcommandHook(cli, plugin);
      attachAwsDefaultAction(cli, plugin, awsCmd);
      return undefined;
    },
  });

  plugin.afterResolve = attachAwsAfterResolveHook(plugin);
  return plugin;
};
