import type { GetDotenvCliPublic } from '@karmaniverous/get-dotenv/cliHost';

import { runCommand } from '../../cliCore/exec';
import { buildSpawnEnv } from '../../cliCore/spawnEnv';
import { definePlugin } from '../../cliHost/definePlugin';
import type { Logger } from '../../GetDotenvOptions';
import { resolveShell } from '../../services/batch/resolve';
import { resolveAwsContext } from './service';
import { type AwsPluginConfigResolved, AwsPluginConfigSchema } from './types';

export const awsPlugin = () =>
  definePlugin({
    id: 'aws',
    // Host validates this slice when the loader path is active.
    configSchema: AwsPluginConfigSchema,
    setup(cli: GetDotenvCliPublic) {
      // Subcommand: aws
      const cmd = cli
        .ns('aws')
        .description(
          'Establish an AWS session and optionally forward to the AWS CLI',
        )
        .configureHelp({ showGlobalOptions: true })
        .enablePositionalOptions()
        .passThroughOptions()
        .allowUnknownOption(true)
        // Boolean toggles
        .option('--login-on-demand', 'attempt aws sso login on-demand')
        .option('--no-login-on-demand', 'disable sso login on-demand')
        .option('--set-env', 'write resolved values into process.env')
        .option('--no-set-env', 'do not write resolved values into process.env')
        .option('--add-ctx', 'mirror results under ctx.plugins.aws')
        .option('--no-add-ctx', 'do not mirror results under ctx.plugins.aws')
        // Strings / enums
        .option('--profile <string>', 'AWS profile name')
        .option('--region <string>', 'AWS region')
        .option('--default-region <string>', 'fallback region')
        .option(
          '--strategy <string>',
          'credential acquisition strategy: cli-export|none',
        )
        // Advanced key overrides
        .option('--profile-key <string>', 'dotenv/config key for local profile')
        .option(
          '--profile-fallback-key <string>',
          'fallback dotenv/config key for profile',
        )
        .option('--region-key <string>', 'dotenv/config key for region')
        // Accept any extra operands so Commander does not error when tokens appear after "--".
        .argument('[args...]')
        .action(
          async (
            args: string[] | undefined,
            opts: Record<string, unknown>,
            thisCommand: unknown,
          ) => {
            const self = thisCommand as { parent?: unknown };
            const parent = (self.parent ?? null) as
              | (GetDotenvCliPublic & {
                  getDotenvCliOptions?: {
                    scripts?: Record<
                      string,
                      string | { cmd: string; shell?: string | boolean }
                    >;
                    shell?: string | boolean;
                    capture?: boolean;
                  };
                })
              | null;

            // Access merged root CLI options (installed by passOptions())
            const rootOpts = (parent?.getDotenvCliOptions ?? {}) as NonNullable<
              typeof parent
            >['getDotenvCliOptions'];
            const capture =
              process.env.GETDOTENV_STDIO === 'pipe' ||
              Boolean(rootOpts?.capture);
            const underTests =
              process.env.GETDOTENV_TEST === '1' ||
              typeof process.env.VITEST_WORKER_ID === 'string';

            // Build overlay cfg from subcommand flags layered over discovered config.
            const ctx = cli.getCtx();
            const cfgBase = (ctx?.pluginConfigs?.['aws'] ??
              {}) as AwsPluginConfigResolved;
            const overlay: Partial<AwsPluginConfigResolved> = {};
            // Map boolean toggles (respect explicit --no-*)
            if (Object.prototype.hasOwnProperty.call(opts, 'loginOnDemand'))
              overlay.loginOnDemand = Boolean(opts.loginOnDemand);
            if (Object.prototype.hasOwnProperty.call(opts, 'setEnv'))
              overlay.setEnv = Boolean(opts.setEnv);
            if (Object.prototype.hasOwnProperty.call(opts, 'addCtx'))
              overlay.addCtx = Boolean(opts.addCtx);
            // Strings/enums
            if (typeof opts.profile === 'string')
              overlay.profile = opts.profile;
            if (typeof opts.region === 'string') overlay.region = opts.region;
            if (typeof opts.defaultRegion === 'string')
              overlay.defaultRegion = opts.defaultRegion;
            if (typeof opts.strategy === 'string')
              overlay.strategy =
                opts.strategy as AwsPluginConfigResolved['strategy'];
            // Advanced key overrides
            if (typeof opts.profileKey === 'string')
              overlay.profileKey = opts.profileKey;
            if (typeof opts.profileFallbackKey === 'string')
              overlay.profileFallbackKey = opts.profileFallbackKey;
            if (typeof opts.regionKey === 'string')
              overlay.regionKey = opts.regionKey;

            const cfg: AwsPluginConfigResolved = {
              ...cfgBase,
              ...overlay,
            };

            // Resolve current context with overrides
            const out = await resolveAwsContext({
              dotenv: ctx?.dotenv ?? {},
              cfg,
            });

            // Apply env/ctx mirrors per toggles
            if (cfg.setEnv !== false) {
              if (out.region) {
                process.env.AWS_REGION = out.region;
                if (!process.env.AWS_DEFAULT_REGION)
                  process.env.AWS_DEFAULT_REGION = out.region;
              }
              if (out.credentials) {
                process.env.AWS_ACCESS_KEY_ID = out.credentials.accessKeyId;
                process.env.AWS_SECRET_ACCESS_KEY =
                  out.credentials.secretAccessKey;
                if (out.credentials.sessionToken !== undefined) {
                  process.env.AWS_SESSION_TOKEN = out.credentials.sessionToken;
                }
              }
            }
            if (cfg.addCtx !== false) {
              if (ctx) {
                ctx.plugins ??= {};
                ctx.plugins['aws'] = {
                  ...(out.profile ? { profile: out.profile } : {}),
                  ...(out.region ? { region: out.region } : {}),
                  ...(out.credentials ? { credentials: out.credentials } : {}),
                };
              }
            }

            // Forward when positional args are present; otherwise session-only.
            if (Array.isArray(args) && args.length > 0) {
              const argv = ['aws', ...args];
              const shellSetting = resolveShell(
                rootOpts?.scripts,
                'aws',
                rootOpts?.shell,
              ) as unknown as string | boolean | URL;
              const ctxDotenv = (ctx?.dotenv ?? {}) as Record<
                string,
                string | undefined
              >;
              const exit = await runCommand(argv, shellSetting, {
                env: buildSpawnEnv(
                  process.env,
                  ctxDotenv,
                ) as unknown as NodeJS.ProcessEnv,
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
                const log: Logger = console;
                log.log('[aws] session established', {
                  profile: out.profile,
                  region: out.region,
                  hasCreds: Boolean(out.credentials),
                });
              }
              if (!underTests) process.exit(0);
              return;
            }
          },
        );
      void cmd;
    },
    async afterResolve(_cli, ctx) {
      const log: Logger = console;
      const cfgRaw = (ctx.pluginConfigs?.['aws'] ?? {}) as unknown;
      const cfg = (cfgRaw || {}) as AwsPluginConfigResolved;

      const out = await resolveAwsContext({
        dotenv: ctx.dotenv,
        cfg,
      });
      const { profile, region, credentials } = out;

      if (cfg.setEnv !== false) {
        if (region) {
          process.env.AWS_REGION = region;
          if (!process.env.AWS_DEFAULT_REGION)
            process.env.AWS_DEFAULT_REGION = region;
        }
        if (credentials) {
          process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
          process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
          if (credentials.sessionToken !== undefined) {
            process.env.AWS_SESSION_TOKEN = credentials.sessionToken;
          }
        }
      }

      if (cfg.addCtx !== false) {
        ctx.plugins ??= {};
        ctx.plugins['aws'] = {
          ...(profile ? { profile } : {}),
          ...(region ? { region } : {}),
          ...(credentials ? { credentials } : {}),
        };
      }
      // Optional: low-noise breadcrumb for diagnostics
      if (process.env.GETDOTENV_DEBUG) {
        log.log('[aws] afterResolve', {
          profile,
          region,
          hasCreds: Boolean(credentials),
        });
      }
    },
  });
