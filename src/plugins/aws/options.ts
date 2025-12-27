import type { GetDotenvCliPublic } from '@/src/cliHost';

import type { AwsPlugin } from '.';

/**
 * Attach options/arguments for the AWS plugin mount.
 *
 * @param cli - The `aws` command mount.
 * @param plugin - The AWS plugin instance (for dynamic option descriptions).
 *
 * @internal
 */
export function attachAwsOptions(cli: GetDotenvCliPublic, plugin: AwsPlugin) {
  return (
    cli
      // Description is owned by the plugin index (src/plugins/aws/index.ts).
      .enablePositionalOptions()
      .passThroughOptions()
      .allowUnknownOption(true)
      // Boolean toggles with dynamic help labels (effective defaults)
      .addOption(
        plugin.createPluginDynamicOption(
          cli,
          '--login-on-demand',
          (_bag, cfg) =>
            `attempt aws sso login on-demand${cfg.loginOnDemand ? ' (default)' : ''}`,
        ),
      )
      .addOption(
        plugin.createPluginDynamicOption(
          cli,
          '--no-login-on-demand',
          (_bag, cfg) =>
            `disable sso login on-demand${cfg.loginOnDemand === false ? ' (default)' : ''}`,
        ),
      )
      // Strings / enums
      .addOption(
        plugin.createPluginDynamicOption(
          cli,
          '--profile <string>',
          (_bag, cfg) =>
            `AWS profile name${cfg.profile ? ` (default: ${JSON.stringify(cfg.profile)})` : ''}`,
        ),
      )
      .addOption(
        plugin.createPluginDynamicOption(
          cli,
          '--region <string>',
          (_bag, cfg) =>
            `AWS region${cfg.region ? ` (default: ${JSON.stringify(cfg.region)})` : ''}`,
        ),
      )
      .addOption(
        plugin.createPluginDynamicOption(
          cli,
          '--default-region <string>',
          (_bag, cfg) =>
            `fallback region${cfg.defaultRegion ? ` (default: ${JSON.stringify(cfg.defaultRegion)})` : ''}`,
        ),
      )
      .addOption(
        plugin.createPluginDynamicOption(
          cli,
          '--strategy <string>',
          (_bag, cfg) =>
            `credential acquisition strategy: cli-export|none${cfg.strategy ? ` (default: ${JSON.stringify(cfg.strategy)})` : ''}`,
        ),
      )
      // Advanced key overrides
      .addOption(
        plugin.createPluginDynamicOption(
          cli,
          '--profile-key <string>',
          (_bag, cfg) =>
            `dotenv/config key for local profile${cfg.profileKey ? ` (default: ${JSON.stringify(cfg.profileKey)})` : ''}`,
        ),
      )
      .addOption(
        plugin.createPluginDynamicOption(
          cli,
          '--profile-fallback-key <string>',
          (_bag, cfg) =>
            `fallback dotenv/config key for profile${cfg.profileFallbackKey ? ` (default: ${JSON.stringify(cfg.profileFallbackKey)})` : ''}`,
        ),
      )
      .addOption(
        plugin.createPluginDynamicOption(
          cli,
          '--region-key <string>',
          (_bag, cfg) =>
            `dotenv/config key for region${cfg.regionKey ? ` (default: ${JSON.stringify(cfg.regionKey)})` : ''}`,
        ),
      )
      // Accept any extra operands so Commander does not error when tokens appear after "--".
      .argument('[args...]')
  );
}

/**
 * Command type returned by `attachAwsOptions`.
 *
 * @internal
 */
export type AwsCommand = ReturnType<typeof attachAwsOptions>;
