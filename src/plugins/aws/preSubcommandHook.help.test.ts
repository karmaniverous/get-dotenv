/**
 * #84: the aws help guard reads the argv being parsed (the root's normalized
 * rawArgs), not `process.argv`, and ignores a `-h` that belongs to a
 * forwarded command or follows `--`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCli } from '@/src/cli/createCli';
import { definePlugin } from '@/src/cliHost';
import { captureOutput, inFixture } from '@/test/support/fixtureCli';

import { awsPlugin } from '.';
import type * as sessionModule from './session';
import { establishAwsSession } from './session';

type SessionModule = typeof sessionModule;

vi.mock('./session', async (importOriginal) => ({
  ...(await importOriginal<SessionModule>()),
  establishAwsSession: vi.fn(() => Promise.resolve(undefined)),
}));

const probe = () =>
  definePlugin({
    ns: 'probe',
    setup(cli) {
      cli.argument('[args...]').action(() => undefined);
    },
  });

/** Run the host; return whether aws established a session. */
const sessionFor = (args: string[]) =>
  inFixture({}, async () => {
    vi.mocked(establishAwsSession).mockClear();
    await captureOutput(() =>
      createCli({
        importMetaUrl: import.meta.url,
        alias: 'fixture',
        compose: (p) => p.use(awsPlugin().use(probe())),
      })(args),
    );
    return vi.mocked(establishAwsSession).mock.calls.length > 0;
  });

const savedArgv = process.argv;
beforeEach(() => {
  process.argv = ['node', 'vitest'];
});
afterEach(() => {
  process.argv = savedArgv;
});

describe('aws help guard (#84)', () => {
  it('an explicit argv asking for child help resolves no session (the issue repro)', async () => {
    expect(await sessionFor(['aws', 'probe', '-h'])).toBe(false);
    expect(await sessionFor(['aws', 'probe', '--help'])).toBe(false);
  });

  it('a stray -h in process.argv does not suppress a real run', async () => {
    process.argv = ['node', 'vitest', '-h'];
    expect(await sessionFor(['aws', 'probe', 'x'])).toBe(true);
  });

  it('a -h after -- belongs to the child: the session resolves', async () => {
    expect(await sessionFor(['aws', 'probe', '--', '-h'])).toBe(true);
  });

  it('a -h after the -- at aws is an operand: the session resolves', async () => {
    expect(await sessionFor(['aws', '--', 'probe', '-h'])).toBe(true);
  });
});
