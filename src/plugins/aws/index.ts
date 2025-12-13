export type { ResolveAwsContextOptions } from './types';
import {
  buildSpawnEnv,
  definePlugin,
  readMergedOptions,
  resolveShell,
  runCommand,
} from '@/src/cliHost';
import { shouldCapture } from '@/src/cliHost/exec';

import { applyAwsContext } from './common';
import { resolveAwsContext } from './service';
import { type AwsPluginConfig, AwsPluginConfigSchema } from './types';

/**
 * AWS plugin: establishes an AWS session (credentials/region) based on dotenv configuration.
 * Supports SSO login-on-demand and credential exporting.
 * Can be used as a parent command to wrap `aws` CLI invocations.
 */
export const awsPlugin = () => {
  const plugin = definePlugin({
    ns: 'aws',
    configSchema: AwsPluginConfigSchema,
    setup: (cli) => {
      // Mount: aws (provided)
      cli
        .description(
          'Establish an AWS session and optionally forward to the AWS CLI',
        )
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
        .action(async (args, opts, thisCommand) => {
          const pluginInst = plugin;
          // Access merged root CLI options (installed by passOptions())
          const bag = readMergedOptions(thisCommand);
          const capture = shouldCapture(bag.capture);
          const underTests =
            process.env.GETDOTENV_TEST === '1' ||
            typeof process.env.VITEST_WORKER_ID === 'string';

          // Build overlay cfg from subcommand flags layered over discovered config.
          const ctx = cli.getCtx();
          const cfgBase = pluginInst.readConfig(cli);
          type AwsCliFlags = Partial<AwsPluginConfig>;
          const o = opts as AwsCliFlags;
          const overlay: Partial<AwsPluginConfig> = {};
          // Map boolean toggles (respect explicit --no-*)
          if (Object.prototype.hasOwnProperty.call(o, 'loginOnDemand'))
            overlay.loginOnDemand = Boolean(o.loginOnDemand);
          // Strings/enums
          if (typeof o.profile === 'string') overlay.profile = o.profile;
          if (typeof o.region === 'string') overlay.region = o.region;
          if (typeof o.defaultRegion === 'string')
            overlay.defaultRegion = o.defaultRegion;
          if (typeof o.strategy === 'string')
            overlay.strategy = o.strategy as AwsPluginConfig['strategy'];
          // Advanced key overrides
          if (typeof o.profileKey === 'string')
            overlay.profileKey = o.profileKey;
          if (typeof o.profileFallbackKey === 'string')
            overlay.profileFallbackKey = o.profileFallbackKey;
          if (typeof o.regionKey === 'string') overlay.regionKey = o.regionKey;

          const cfg: AwsPluginConfig = {
            ...cfgBase,
            ...overlay,
          };

          // Resolve current context with overrides
          const out = await resolveAwsContext({
            dotenv: ctx.dotenv,
            cfg,
          });

          // Publish env/context
          applyAwsContext(out, ctx, true);

          // Forward when positional args are present; otherwise session-only.
          if (Array.isArray(args) && args.length > 0) {
            const argv = ['aws', ...args];
            const shellSetting = resolveShell(bag.scripts, 'aws', bag.shell);
            const exit = await runCommand(argv, shellSetting, {
              env: buildSpawnEnv(process.env, ctx.dotenv),
              stdio: capture ? 'pipe' : 'inherit',
            });
            // Deterministic termination (suppressed under tests)
            if (!underTests) {
              process.exit(typeof exit === 'number' ? exit : 0);
            }
            return;
          } else {
            // Session only: low-noise breadcrumb under debug
            if (process.env.GETDOTENV_DEBUG) {
              try {
                const msg = JSON.stringify({
                  profile: out.profile,
                  region: out.region,
                  hasCreds: Boolean(out.credentials),
                });
                process.stderr.write(`[aws] session established ${msg}\n`);
              } catch {
                /* ignore */
              }
            }
            if (!underTests) process.exit(0);
            return;
          }
        });
      return undefined;
    },
    afterResolve: async (_cli, ctx) => {
      const cfg = plugin.readConfig(_cli);

      const out = await resolveAwsContext({
        dotenv: ctx.dotenv,
        cfg,
      });
      applyAwsContext(out, ctx, true);
      // Optional: low-noise breadcrumb for diagnostics
      if (process.env.GETDOTENV_DEBUG) {
        try {
          const msg = JSON.stringify({
            profile: out.profile,
            region: out.region,
            hasCreds: Boolean(out.credentials),
          });
          process.stderr.write(`[aws] afterResolve ${msg}\n`);
        } catch {
          /* ignore */
        }
      }
    },
  });

  return plugin;
};
