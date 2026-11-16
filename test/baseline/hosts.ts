/**
 * The two hosts of the 7.0.11 behaviour baseline.
 *
 * - `getdotenv`: the shipped CLI, built exactly as `src/cli/getdotenv/index.ts`
 *   builds it (`createCli({ importMetaUrl: import.meta.url,  alias: 'getdotenv' })`).
 * - `vc`: a fixture modelled on smoz-user's `cli/vc.ts` (origin/dev). It uses
 *   only get-dotenv's own plugins plus the local fixture plugins below, so no
 *   external package is needed. Tree:
 *
 * ```text
 * vc                    root (createCli), -c/--cmd alias
 * ├─ cmd                default subcommand
 * ├─ batch
 * │  └─ cmd             plain new Command(), batch's default
 * ├─ aws
 * │  ├─ cmd             with its own -c/--cmd alias on aws
 * │  └─ secrets         fixture plugin
 * │     └─ pull         cli.ns() leaf: -s/--secret-name, -e/--exclude (variadic)
 * └─ smoz               fixture plugin: --x/--no-x, --opt [value]
 *    ├─ openapi         cli.ns() leaf: --verbose
 *    └─ legacy          plain new Command() mount: --level (value)
 *       └─ run          plain new Command(): --fast
 * ```
 *
 * Fixture actions print one `[fixture:PATH] JSON` line to stdout with the
 * options Commander parsed for them and their operands.
 */
import { Command } from '@commander-js/extra-typings';

import { createCli } from '@/src/cli';
import { definePlugin } from '@/src/cliHost';
import { awsPlugin, batchPlugin, cmdPlugin } from '@/src/plugins';

/** A `createCli()` runner. */
export type Runner = (argv?: string[]) => Promise<void>;

const report = (name: string, payload: unknown) => {
  process.stdout.write(`[fixture:${name}] ${JSON.stringify(payload)}\n`);
};

/**
 * Fixture stand-in for aws-secrets-manager-tools' `secrets` plugin.
 *
 * @returns The plugin.
 */
export const secretsFixturePlugin = () =>
  definePlugin({
    ns: 'secrets',
    setup(cli) {
      cli.description('Fixture: AWS Secrets Manager commands');
      cli
        .ns('pull')
        .description('Fixture: pull a secret into a dotenv file')
        .option('-s, --secret-name <string>', 'secret name')
        .option('-e, --exclude <keys...>', 'keys to exclude')
        .action((opts, command) => {
          report('aws secrets pull', { opts, args: command.args });
        });
      return undefined;
    },
  });

/**
 * Fixture stand-in for smoz's plugin: a `--x`/`--no-x` pair, an optional
 * option, a `cli.ns()` leaf and a plain `new Command()` mount.
 *
 * @returns The plugin.
 */
export const smozFixturePlugin = () =>
  definePlugin({
    ns: 'smoz',
    setup(cli) {
      cli
        .description('Fixture: smoz-like commands')
        .option('--x', 'enable x')
        .option('--no-x', 'disable x')
        .option('--opt [value]', 'optional value')
        .action((opts, command) => {
          report('smoz', { opts, args: command.args });
        });
      cli
        .ns('openapi')
        .description('Fixture: generate an OpenAPI document')
        .option('--verbose', 'verbose output')
        .action((opts, command) => {
          report('smoz openapi', { opts, args: command.args });
        });
      const run = new Command('run')
        .description('Fixture: plain subcommand of a plain mount')
        .option('--fast', 'go fast')
        .action((opts, command) => {
          report('smoz legacy run', { opts, args: command.args });
        });
      const legacy = new Command('legacy')
        .description('Fixture: plain new Command() mount')
        .option('--level <n>', 'level')
        .addCommand(run);
      cli.addCommand(legacy);
      return undefined;
    },
  });

/**
 * Fixture aws child: `aws session show` reports the AWS session the child
 * sees (the profile and region in `process.env`, and `ctx.plugins.aws`).
 *
 * It replaces the demo `aws whoami really` (removed by #57) in the corpus
 * cases that drive an aws child command (`#56 profile flag on aws child`,
 * `#84 aws child help resolves session`): a plugin child of `aws` with a
 * `cli.ns()` leaf, the same shape as `whoami` with its `really` leaf.
 *
 * @returns The plugin.
 */
export const awsChildFixturePlugin = () =>
  definePlugin({
    ns: 'session',
    setup(cli) {
      cli.description('Fixture: an aws child command');
      const show = cli
        .ns('show')
        .description('Fixture: print the AWS session this child sees');
      show.action(() => {
        report('aws session show', {
          AWS_PROFILE: process.env.AWS_PROFILE ?? null,
          AWS_REGION: process.env.AWS_REGION ?? null,
          aws: show.getCtx().plugins?.aws ?? null,
        });
      });
      return undefined;
    },
  });

/**
 * A host with only the aws plugin and the {@link awsChildFixturePlugin}
 * child under it.
 *
 * @returns Its runner.
 */
export const createAwsChildHost = (): Runner =>
  createCli({
    importMetaUrl: import.meta.url,
    alias: 'getdotenv',
    compose: (program) => program.use(awsPlugin().use(awsChildFixturePlugin())),
  });

/**
 * The shipped `getdotenv` host.
 *
 * @returns Its runner.
 */
export const createGetdotenvHost = (): Runner =>
  createCli({ importMetaUrl: import.meta.url, alias: 'getdotenv' });

/**
 * The `vc` fixture host.
 *
 * @returns Its runner.
 */
export const createVcHost = (): Runner =>
  createCli({
    importMetaUrl: import.meta.url,
    alias: 'vc',
    compose: (program) =>
      program
        .use(
          cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
        )
        .use(batchPlugin())
        .use(
          awsPlugin()
            .use(cmdPlugin({ optionAlias: '-c, --cmd <command...>' }))
            .use(secretsFixturePlugin()),
        )
        .use(smozFixturePlugin()),
  });

/** Host factories by name. */
export const hosts = {
  getdotenv: createGetdotenvHost,
  vc: createVcHost,
} as const;

/** A named host. */
export type HostName = keyof typeof hosts;
