import path from 'node:path';

import type { CommandUnknownOpts } from '@commander-js/extra-typings';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCli } from '@/src/cli';
import { definePlugin } from '@/src/cliHost/definePlugin';

import type { GetDotenvCliOptions } from './GetDotenvCliOptions';
import { readMergedOptions } from './readMergedOptions';

const ROOT = path.posix.join('.tsbuild', 'preActionPropagateEnv.tests');

describe('preAction propagates resolved env for subcommand flows', () => {
  beforeEach(() => {
    delete process.env.DEFAULT_ENV;
    delete process.env.APP_SETTING;
    delete process.env.ENV_SETTING;
  });

  afterEach(async () => {
    await fs.remove(ROOT);
  });

  it('readMergedOptions returns bag with env populated via defaultEnv in subcommand flow', async () => {
    const base = path.posix.join(ROOT, 'subcommand-env');
    await fs.remove(base);
    await fs.ensureDir(base);

    // Global public: DEFAULT_ENV=dev
    await fs.writeFile(path.posix.join(base, '.testenv'), 'DEFAULT_ENV=dev\n', {
      encoding: 'utf-8',
    });
    // Env-scoped public for dev
    await fs.writeFile(
      path.posix.join(base, '.testenv.dev'),
      'ENV_SETTING=from_dev\n',
      { encoding: 'utf-8' },
    );

    let capturedBag: GetDotenvCliOptions | undefined;

    // A minimal plugin whose action captures the merged options bag.
    const capturePlugin = definePlugin({
      ns: 'capture',
      setup(cli) {
        cli.action(function (this: CommandUnknownOpts) {
          capturedBag = readMergedOptions(this);
        });
      },
    });

    const run = createCli({
      alias: 'test',
      rootOptionDefaults: {
        dotenvToken: '.testenv',
        privateToken: 'secret',
        paths: [base],
        loadProcess: false,
      },
      compose: (prog) => prog.use(capturePlugin),
    });

    // Invoke without explicit -e flag — env should resolve from DEFAULT_ENV=dev
    await run(['node', 'test', 'capture']);

    // The critical assertion: bag.env must be populated from the resolved context,
    // not undefined due to preAction overwriting the bag without propagation.
    expect(capturedBag).toBeDefined();
    expect((capturedBag as GetDotenvCliOptions).env).toBe('dev');
  });
});
