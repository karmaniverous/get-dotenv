/**
 * #75 (aws half): when the AWS CLI is missing, the aws forward reports
 * `Error: <message>` and exits non-zero (127), never NaN.
 *
 * The stub makes execa fail to spawn any `aws` command the way a missing
 * executable does (an ENOENT error with no exit code); everything else runs.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('execa', async (importOriginal) => {
  const actual = await importOriginal<{
    execa: (...args: unknown[]) => unknown;
  }>();
  const isAws = (file: unknown) =>
    typeof file === 'string' && /^aws(\s|$)/.test(file);
  // The command as typed: a shell string, or file plus argv (shell off).
  const commandOf = (file: unknown, args: unknown) =>
    [String(file), ...(Array.isArray(args) ? args.map(String) : [])].join(' ');
  return {
    ...actual,
    execa: (file: unknown, ...rest: unknown[]) =>
      isAws(file)
        ? Promise.reject(
            Object.assign(new Error('spawn aws ENOENT'), {
              code: 'ENOENT',
              failed: true,
              shortMessage: `Command failed with ENOENT: ${commandOf(file, rest[0])}\nspawn aws ENOENT`,
            }),
          )
        : actual.execa(file, ...rest),
  };
});

import { runCase } from '@/test/baseline/harness';

describe('aws forward with no AWS CLI (#75)', () => {
  it.each([
    ['shell off', ['-S', 'aws', 'sts', 'get-caller-identity']],
    ['shell on', ['aws', 'sts', 'get-caller-identity']],
  ])('%s: prints Error: <message> and exits 127', async (_label, args) => {
    const r = await runCase({
      kind: 'cli',
      group: 'vc',
      host: 'vc',
      id: `#75 aws forward ${args.join(' ')}`,
      source: '#75',
      args,
    });
    expect(r.exitCode).toBe(127);
    // Under PowerShell (the Windows default shell) each argument is
    // single-quoted (review 5916926264 #1).
    expect(r.stderr).toMatch(
      /Error: Command failed with ENOENT: aws '?sts'? '?get-caller-identity'?/,
    );
  });
});
