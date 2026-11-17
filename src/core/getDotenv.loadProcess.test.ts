/**
 * Regression tests for #48: library `getDotenv()` does not write to
 * `process.env` unless the caller opts in with `loadProcess: true`.
 */
import { describe, expect, it } from 'vitest';

import { inFixture, withEnv } from '@/test/support/fixtureCli';

import { getDotenv } from './getDotenv';
import { resolveGetDotenvOptions } from './GetDotenvOptions';

const files = { '.env': 'FOO=bar\n' };

describe('#48 getDotenv() leaves process.env alone by default', () => {
  it('the issue repro: getDotenv() returns FOO without loading it', async () => {
    await inFixture(files, () =>
      withEnv({ FOO: undefined }, async () => {
        const vars = await getDotenv();
        expect(vars.FOO).toBe('bar');
        expect(process.env.FOO).toBeUndefined();
      }),
    );
  });

  it('loadProcess: true opts in', async () => {
    await inFixture(files, () =>
      withEnv({ FOO: undefined }, async () => {
        await getDotenv({ loadProcess: true });
        expect(process.env.FOO).toBe('bar');
      }),
    );
  });

  it('the programmatic resolver does not inherit the CLI loadProcess default', async () => {
    const resolved = await resolveGetDotenvOptions({});
    expect(resolved.loadProcess).toBeUndefined();
  });
});
