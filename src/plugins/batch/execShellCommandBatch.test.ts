/**
 * `execShellCommandBatch` in-process, sequential mode: a command that can't
 * be run in a directory (here an argv cmd.exe can't carry, which throws
 * before anything is spawned) stops the batch with that error, unless
 * `ignoreErrors` is set, which moves on to the next directory.
 */
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { inFixture } from '@/test/support/fixtureCli';

import { execShellCommandBatch } from './execShellCommandBatch';
import type { ExecShellCommandBatchOptions } from './types';

const files = { 'a/.keep': '', 'b/.keep': '' };

const logger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

/** Run `node -e` with a line break in its code under cmd.exe in a and b. */
const runUnquotable = (ignoreErrors: boolean, log = logger()) =>
  execShellCommandBatch({
    command: ['node', '-e', 'console.log(1)\nconsole.log(2)'],
    globs: 'a b',
    rootPath: './',
    shell: 'cmd.exe',
    ignoreErrors,
    logger: log,
  });

describe('execShellCommandBatch: a command that throws (sequential)', () => {
  it('stops the batch with the error', async () => {
    await inFixture(files, async () => {
      await expect(runUnquotable(false)).rejects.toThrow(
        "cmd.exe can't pass this argv safely",
      );
    });
  });

  it('with ignoreErrors, every directory is tried and the batch succeeds', async () => {
    const log = logger();
    await inFixture(files, async () => {
      await expect(runUnquotable(true, log)).resolves.toBe(0);
    });
    const cwdLines = log.info.mock.calls
      .map(([line]) => String(line))
      .filter((line) => line.startsWith('CWD:'));
    expect(cwdLines).toHaveLength(2);
  });
});

describe('ExecShellCommandBatchOptions', () => {
  it('takes every executor shell form: a name, true/false or a file URL', () => {
    expectTypeOf<ExecShellCommandBatchOptions['shell']>().toEqualTypeOf<
      string | boolean | URL
    >();
  });
});
