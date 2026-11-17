/**
 * @packageDocumentation
 * AWS plugin subpath. Establishes an AWS session (profile/region/credentials)
 * and optionally forwards to the AWS CLI; includes a nested `whoami` child.
 */

export type { ResolveAwsContextOptions } from './types';
import { definePlugin } from '@/src/cliHost';

import { attachAwsAfterResolveHook } from './afterResolveHook';
import { attachAwsDefaultAction } from './defaultAction';
import { attachAwsOptions, type AwsCommand } from './options';
import { attachAwsPreSubcommandHook } from './preSubcommandHook';
import { awsPluginConfigSchema } from './types';

/**
 * AWS plugin: establishes an AWS session (credentials/region) based on dotenv configuration.
 * Supports SSO login-on-demand and credential exporting.
 * Can be used as a parent command to wrap `aws` CLI invocations.
 */
export const awsPlugin = () => {
  // The `aws` mount, for its parsed flags in afterResolve (#56).
  let awsCmd: AwsCommand | undefined;
  const plugin = definePlugin({
    ns: 'aws',
    configSchema: awsPluginConfigSchema,
    setup(cli) {
      cli.description(
        'Establish an AWS session and optionally forward to the AWS CLI',
      );
      awsCmd = attachAwsOptions(cli, plugin);
      attachAwsPreSubcommandHook(cli, plugin);
      attachAwsDefaultAction(cli, plugin, awsCmd);
      return undefined;
    },
  });

  plugin.afterResolve = attachAwsAfterResolveHook(
    plugin,
    // Undefined before setup mounts aws: no flags (the overrides read {}).
    () => awsCmd?.opts(),
  );
  return plugin;
};

/**
 * AWS plugin instance type returned by {@link awsPlugin}.
 *
 * @public
 */
export type AwsPlugin = ReturnType<typeof awsPlugin>;

export { getAwsRegion } from './utils';
