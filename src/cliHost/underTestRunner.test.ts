/**
 * `underTestRunner`: Vitest or `GETDOTENV_TEST=1` marks a test run, in which
 * the host and its plugins don't exit or print top-level help; any other
 * process is a real run.
 */
import { describe, expect, it } from 'vitest';

import { withEnv } from '@/test/support/fixtureCli';

import { underTestRunner } from './underTestRunner';

const under = (vars: Record<string, string | undefined>) =>
  withEnv(vars, () => Promise.resolve(underTestRunner()));

describe('underTestRunner', () => {
  it('a process with neither marker is a real run', async () => {
    expect(
      await under({ GETDOTENV_TEST: undefined, VITEST_WORKER_ID: undefined }),
    ).toBe(false);
  });

  it('GETDOTENV_TEST=1 marks a test run; another value does not', async () => {
    expect(
      await under({ GETDOTENV_TEST: '1', VITEST_WORKER_ID: undefined }),
    ).toBe(true);
    expect(
      await under({ GETDOTENV_TEST: '0', VITEST_WORKER_ID: undefined }),
    ).toBe(false);
  });

  it('a Vitest worker marks a test run', async () => {
    expect(
      await under({ GETDOTENV_TEST: undefined, VITEST_WORKER_ID: '1' }),
    ).toBe(true);
  });
});
