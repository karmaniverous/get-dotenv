import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import {
  buildSpawnEnv,
  type GetDotenvCliPublic,
  type PluginWithInstanceHelpers,
  readMergedOptions,
  resolveShell,
  runCommand,
} from '@/src/cliHost';
import { shouldCapture } from '@/src/cliHost/exec';
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
 * Attach the default action for the AWS plugin mount.
 *
 * Behavior:
 * - With args: forwards to AWS CLI (`aws <args...>`) under the established session.
 * - Without args: session-only establishment (no forward).
 *
 * @param cli - The `aws` command mount.
 * @param plugin - The AWS plugin instance.
 *
 * @internal
 */
export function attachAwsDefaultAction(
  cli: GetDotenvCliPublic,
  plugin: AwsPluginInstance,
): void {
  cli.action(
    async (args: unknown, opts: unknown, thisCommand: CommandUnknownOpts) => {
      // Access merged root CLI options (installed by root hooks).
      const bag = readMergedOptions(thisCommand);
      const capture = shouldCapture(bag.capture);
      const underTests =
        process.env.GETDOTENV_TEST === '1' ||
        typeof process.env.VITEST_WORKER_ID === 'string';

      // Build overlay cfg from subcommand flags layered over discovered config.
      const ctx = cli.getCtx();
      const cfgBase = plugin.readConfig(cli);
      const cfg: AwsPluginConfig = {
        ...cfgBase,
        ...awsConfigOverridesFromCommandOpts(opts),
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
        const argv = ['aws', ...args.map(String)];
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
      }

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
    },
  );
}
