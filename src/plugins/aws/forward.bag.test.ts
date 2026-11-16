/**
 * #69: the aws forward passes `getDotenvCliOptions` (the merged options bag
 * without the logger) to the forwarded command, like every other spawn path,
 * alongside the dotenv values. The AWS CLI is stubbed: nothing reaches AWS.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runFixtureCli } from '../../../test/support/fixtureCli';
import { awsPlugin } from '.';

type Env = Record<string, string | undefined>;

const forwards: Array<{ argv: string[]; env: Env }> = [];

vi.mock('../../cliHost/exec', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    runCommandResult: () =>
      Promise.resolve({ exitCode: 1, stdout: '', stderr: 'stub' }),
    runCommand: (argv: string[], _shell: unknown, opts: { env?: Env }) => {
      forwards.push({ argv: [...argv], env: { ...(opts.env ?? {}) } });
      return Promise.resolve(0);
    },
  };
});

describe('aws forward (#69)', () => {
  beforeEach(() => {
    forwards.length = 0;
  });

  it('passes getDotenvCliOptions and the dotenv values to the AWS CLI', async () => {
    const run = await runFixtureCli(
      // -P: the dotenv values reach the child only through the overlay.
      ['-P', '--capture', '-e', 'dev', 'aws', 'sts', 'get-caller-identity'],
      { '.env': 'APP=base\n', '.env.dev': 'STAGE=dev\n' },
      { compose: (p) => p.use(awsPlugin()) },
    );
    expect(run.error).toBeUndefined();
    expect(forwards).toHaveLength(1);
    const env = forwards[0]?.env ?? {};
    expect(env.APP).toBe('base');
    expect(env.STAGE).toBe('dev');
    const bag = JSON.parse(env.getDotenvCliOptions ?? 'null') as Record<
      string,
      unknown
    > | null;
    expect(bag).toMatchObject({ capture: true, env: 'dev' });
    expect(bag && 'logger' in bag).toBe(false);
  });
});
