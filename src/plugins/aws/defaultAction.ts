import {
  buildSpawnEnv,
  composeNestedEnv,
  type GetDotenvCliPublic,
  readMergedOptions,
  resolveShell,
  runCommand,
} from '@/src/cliHost';
import { shouldCapture } from '@/src/cliHost/exec';
import { propagateExitCode } from '@/src/cliHost/exitCode';
import { underTestRunner } from '@/src/cliHost/underTestRunner';

import type { AwsPlugin } from '.';
import { awsSessionEnv } from './common';
import { awsConfigWithFlags } from './configOverrides';
import type { AwsCommand } from './options';
import { establishAwsSession } from './session';

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
  plugin: AwsPlugin,
  awsCmd: AwsCommand,
): void {
  awsCmd.action(async (args, opts, thisCommand) => {
    // Access merged root CLI options (installed by root hooks).
    const bag = readMergedOptions(thisCommand);
    const capture = shouldCapture(bag.capture);
    const underTests = underTestRunner();

    // The invocation's session (established once, with the aws flags; #56).
    const ctx = cli.getCtx();
    const out = await establishAwsSession(
      ctx,
      awsConfigWithFlags(plugin, cli, opts),
    );

    // Forward when positional args are present; otherwise session-only.
    if (args.length > 0) {
      const argv = ['aws', ...args];
      const shellSetting = resolveShell(bag.scripts, 'aws', bag.shell);
      const exit = await runCommand(argv, shellSetting, {
        // The session's AWS_* entries go over the dotenv overlay, so its
        // region and credentials win and the two credential sources stay
        // exclusive (#56).
        // Like every spawn path, the child gets the dotenv values and
        // getDotenvCliOptions (#69).
        env: buildSpawnEnv(process.env, {
          ...composeNestedEnv(bag, ctx.dotenv),
          ...awsSessionEnv(out, process.env),
        }),
        stdio: capture ? 'pipe' : 'inherit',
      });
      // Propagate the AWS CLI's exit code (a spawn failure is non-zero too,
      // #75); terminate deterministically outside tests.
      propagateExitCode(exit);
      if (!underTests) process.exit(exit);
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
  });
}
