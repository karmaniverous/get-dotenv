/**
 * Test support: render help through a host's runner, as a user sees it.
 *
 * The run happens in a throwaway project (`inFixture`) whose
 * `getdotenv.config.json` pins the root `shell` default, so the dynamic
 * `--shell` label is the same on every OS. stdout is captured with
 * `GETDOTENV_STDIO=pipe` (top-level help prints under Vitest), the version
 * in the help header is replaced with `<VERSION>`, and batch's
 * `--concurrency` default (the machine's CPU count) with `<CPUS>`.
 */
import { vi } from 'vitest';

import type { Runner } from '@/test/baseline/hosts';

import { type FixtureFiles, inFixture, withEnv } from './fixtureCli';

/** The project config every help fixture starts from. */
export const HELP_CONFIG = { rootOptionDefaults: { shell: '/bin/sh' } };

/**
 * Render help with `runner`.
 *
 * @param make - Builds the `createCli` runner (called inside the fixture
 *   project).
 * @param args - Arguments, e.g. `['aws', '-h']`.
 * @param files - Extra fixture files; `getdotenv.config.json` replaces the
 *   default config.
 * @returns The help text, header version normalized.
 */
export const helpText = (
  make: () => Runner,
  args: string[],
  files: FixtureFiles = {},
): Promise<string> =>
  inFixture(
    { 'getdotenv.config.json': JSON.stringify(HELP_CONFIG), ...files },
    () =>
      withEnv({ GETDOTENV_STDIO: 'pipe' }, async () => {
        const writes: string[] = [];
        const spy = vi
          .spyOn(process.stdout, 'write')
          .mockImplementation((chunk: unknown) => {
            writes.push(String(chunk));
            return true;
          });
        try {
          await make()(args);
        } finally {
          spy.mockRestore();
        }
        return writes
          .join('')
          .replace(/\r\n/g, '\n')
          .replace(/^(\S+) v\d+\.\d+\.\d+\S*$/m, '$1 v<VERSION>')
          .replace(
            /(max concurrent executions in parallel mode \(default: )\d+\)/g,
            '$1<CPUS>)',
          );
      }),
  );
