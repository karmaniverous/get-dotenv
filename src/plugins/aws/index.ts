import { definePlugin } from '../../cliHost/definePlugin';
import type { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import type { Logger } from '../../GetDotenvOptions';
import { resolveAwsContext } from './service';
import { type AwsPluginConfigResolved, AwsPluginConfigSchema } from './types';

export const awsPlugin = () =>
  definePlugin({
    id: 'aws',
    // Host validates this slice when the loader path is active.
    configSchema: AwsPluginConfigSchema,
    setup(_cli: GetDotenvCli) {
      // No commands; base plugin runs in afterResolve.
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
