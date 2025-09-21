import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock runCommand to capture forwarding without spawning.
const runCommandMock =
  vi.fn<
    (
      cmd: string | string[],
      shell: string | boolean | URL,
      opts: { env?: Record<string, string>; stdio?: 'inherit' | 'pipe' },
    ) => Promise<number>
  >();
vi.mock('../../cliCore/exec', () => ({
  runCommand: (
    cmd: string | string[],
    shell: string | boolean | URL,
    opts: { env?: Record<string, string>; stdio?: 'inherit' | 'pipe' },
  ) => runCommandMock(cmd, shell, opts),
}));

import '../../cliCore/enhanceGetDotenvCli';

import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { awsPlugin } from './index';

describe('plugins/aws subcommand', () => {
  beforeEach(() => {
    runCommandMock.mockReset().mockResolvedValue(0);
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
  });

  it('session-only establishes region via flag without forwarding', async () => {
    const cli = new GetDotenvCli('test')
      .attachRootOptions()
      .use(awsPlugin())
      .passOptions();
    await cli.parseAsync(['node', 'test', 'aws', '--region', 'us-east-1']);
    // No forwarding
    expect(runCommandMock).not.toHaveBeenCalled();
    // Region set
    expect(process.env.AWS_REGION).toBe('us-east-1');
    // DEFAULT_REGION is also set when previously unset
    expect(process.env.AWS_DEFAULT_REGION).toBe('us-east-1');
  }, 15000);

  it('forwards args after "--" to AWS CLI with env injection and capture honored', async () => {
    process.env.GETDOTENV_STDIO = 'pipe'; // force capture
    const cli = new GetDotenvCli('test')
      .attachRootOptions()
      .use(awsPlugin())
      .passOptions();
    await cli.parseAsync([
      'node',
      'test',
      'aws',
      '--',
      'sts',
      'get-caller-identity',
    ]);

    expect(runCommandMock).toHaveBeenCalledTimes(1);
    const [cmd, _shell, opts] = runCommandMock.mock.calls[0] as [
      string | string[],
      string | boolean | URL,
      { env?: Record<string, string>; stdio?: 'inherit' | 'pipe' },
    ];
    expect(Array.isArray(cmd) ? cmd.slice(0, 2) : []).toEqual(['aws', 'sts']);
    expect(opts.stdio).toBe('pipe');
    expect(typeof opts.env).toBe('object');
  });
});
