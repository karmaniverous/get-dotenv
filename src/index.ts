import './cliCore/enhanceGetDotenvCli';

import { GetDotenvCli } from './cliHost/GetDotenvCli';
import { awsPlugin } from './plugins/aws';
import { batchPlugin } from './plugins/batch';
import { cmdPlugin } from './plugins/cmd';
import { demoPlugin } from './plugins/demo';
import { initPlugin } from './plugins/init';

export {
  dotenvExpand,
  dotenvExpandAll,
  dotenvExpandFromProcessEnv,
} from './dotenvExpand';
export { generateGetDotenvCli } from './generateGetDotenvCli';
export { getDotenv } from './getDotenv';
export {
  defineDynamic,
  getDotenvCliOptions2Options,
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type ProcessEnv,
} from './GetDotenvOptions';
export { interpolateDeep } from './util/interpolateDeep';

/**
 * Create a get-dotenv CLI host with included plugins.
 *
 * Options:
 * - alias: command name used for help/argv scaffolding (default: "getdotenv")
 * - branding: optional help header; when omitted, brand() uses "<alias> v<version>"
 *
 * Usage:
 *   import \{ createCli \} from '\@karmaniverous/get-dotenv';
 *   await createCli(\{ alias: 'getdotenv', branding: 'getdotenv vX.Y.Z' \})
 *     .run(process.argv.slice(2));
 */
export type CreateCliOptions = {
  alias?: string;
  branding?: string;
};

export function createCli(opts: CreateCliOptions = {}): {
  run: (argv: string[]) => Promise<void>;
} {
  const alias =
    typeof opts.alias === 'string' && opts.alias.length > 0
      ? opts.alias
      : 'getdotenv';

  const program: GetDotenvCli = new GetDotenvCli(alias);
  // Install base root flags and included plugins; resolve context once per run.
  program
    .attachRootOptions({ loadProcess: false })
    .use(cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }))
    .use(batchPlugin())
    .use(awsPlugin())
    .use(demoPlugin())
    .use(initPlugin())
    .passOptions({ loadProcess: false });

  // Tests-only: avoid process.exit during help/version flows under Vitest.
  const underTests =
    process.env.GETDOTENV_TEST === '1' ||
    typeof process.env.VITEST_WORKER_ID === 'string';
  if (underTests) {
    program.exitOverride((err: unknown) => {
      const code = (err as { code?: string } | undefined)?.code;
      if (code === 'commander.helpDisplayed' || code === 'commander.version')
        return;
      throw err;
    });
  }

  return {
    async run(argv: string[]) {
      await program.brand({
        name: alias,
        importMetaUrl: import.meta.url,
        description: 'Base CLI.',
        ...(typeof opts.branding === 'string' && opts.branding.length > 0
          ? { helpHeader: opts.branding }
          : {}),
      });
      // Tests-only: avoid Commander-triggered process.exit for help/version.
      if (underTests && argv.some((a) => a === '-h' || a === '--help')) {
        // Print help similar to parse path without exiting.
        program.outputHelp();
        return;
      }
      await program.parseAsync(['node', alias, ...argv]);
    },
  };
}
