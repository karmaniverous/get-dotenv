// tools/getdotenv-interop-repro.mjs
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { createCli } from '@karmaniverous/get-dotenv/cli';
import { GetDotenvCli, definePlugin } from '@karmaniverous/get-dotenv/cliHost';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';

const runCase = async (title, fn) => {
  process.stdout.write(`\n=== ${title} ===\n`);
  try {
    await fn();
    process.stdout.write('OK\n');
  } catch (e) {
    process.stdout.write('FAIL\n');
    process.stdout.write(String(e?.stack ?? e) + '\n');
  }
};

const withTempCwd = async (fn) => {
  const prev = process.cwd();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'getdotenv-interop-'));
  process.chdir(dir);
  try {
    await fn(dir);
  } finally {
    process.chdir(prev);
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
};

const withCleanEnv = async (fn) => {
  const saved = { ...process.env };

  // Avoid any accidental nesting + reduce noise.
  delete process.env.getDotenvCliOptions;
  process.env.GETDOTENV_STDIO = 'pipe';
  process.env.GETDOTENV_TEST = '1';

  // Avoid AWS plugin accidentally seeing profile keys.
  for (const k of Object.keys(process.env)) {
    if (k.startsWith('AWS_')) delete process.env[k];
  }

  try {
    await fn();
  } finally {
    // Restore env as best-effort (including deletions).
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, saved);
  }
};

const makeAfterResolveReadConfigPlugin = () => {
  const plugin = definePlugin({
    ns: 'repro',
    setup(cli) {
      cli.description('interop repro plugin');
      // If we ever get past resolve, this action is a no-op.
      cli.action(() => {});
      return undefined;
    },
  });

  plugin.afterResolve = (cli) => {
    // The call that should be safe after resolveAndLoad().
    plugin.readConfig(cli);
  };

  return plugin;
};

await withCleanEnv(async () => {
  process.stdout.write(
    `node=${process.version} platform=${process.platform} cwd=${process.cwd()}\n`,
  );

  await withTempCwd(async (tmp) => {
    process.stdout.write(`temp project root: ${tmp}\n`);

    await runCase(
      'Case A: createCli(/cli) + custom plugin from /cliHost',
      async () => {
        const reproPlugin = makeAfterResolveReadConfigPlugin();
        const run = createCli({
          alias: 'gdrepro',
          compose: (program) => program.use(reproPlugin),
        });

        // Full argv; createCli runner slices argv[2..]
        await run(['node', 'gdrepro', 'repro']);
      },
    );

    await runCase(
      'Case B: createCli(/cli) + awsPlugin from /plugins',
      async () => {
        const run = createCli({
          alias: 'gdrepro',
          compose: (program) => program.use(awsPlugin()),
        });

        await run(['node', 'gdrepro', 'aws']);
      },
    );

    await runCase(
      'Case C (control): GetDotenvCli(/cliHost) + custom plugin from /cliHost',
      async () => {
        const program = new GetDotenvCli('gdrepro');
        // Attach root options for completeness (not strictly required for resolveAndLoad()).
        program.attachRootOptions();

        const reproPlugin = makeAfterResolveReadConfigPlugin();
        program.use(reproPlugin);

        await program.resolveAndLoad(
          { loadProcess: false, log: false },
          { runAfterResolve: true },
        );
      },
    );
  });
});
