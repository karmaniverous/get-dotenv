import { beforeEach, describe, expect, it, vi } from 'vitest';

// Track every call to resolveAwsContext and its cfg.loginOnDemand value.
const resolveAwsContextMock = vi.fn(
  ({
    cfg,
  }: {
    cfg: { loginOnDemand?: boolean; profile?: string; region?: string };
  }) =>
    Promise.resolve({
      profile: cfg.profile,
      region: cfg.region,
    }),
);
vi.mock('./service', () => ({
  resolveAwsContext: (arg: {
    cfg: { loginOnDemand?: boolean; profile?: string; region?: string };
  }) => resolveAwsContextMock(arg),
}));

// Mock STS client so awsWhoamiPlugin doesn't hit real AWS.
const sendMock = vi.fn(() => Promise.resolve({}));
vi.mock('@aws-sdk/client-sts', () => ({
  STSClient: class {
    send = sendMock;
  },
  GetCallerIdentityCommand: function GetCallerIdentityCommand() {},
}));

// Prevent actual process spawning.
const runCommandMock =
  vi.fn<
    (
      cmd: string | string[],
      shell: string | boolean | URL,
      opts: { env?: Record<string, string>; stdio?: 'inherit' | 'pipe' },
    ) => Promise<number>
  >();
vi.mock('../../cliHost/exec', () => ({
  shouldCapture: (bagCapture?: boolean) =>
    process.env.GETDOTENV_STDIO === 'pipe' || Boolean(bagCapture),
  runCommand: (
    cmd: string | string[],
    shell: string | boolean | URL,
    opts: { env?: Record<string, string>; stdio?: 'inherit' | 'pipe' },
  ) => runCommandMock(cmd, shell, opts),
}));

import { createCli } from '@/src/cli';
import { cmdPlugin } from '@/src/plugins/cmd';

import { awsPlugin } from '.';
import { awsWhoamiPlugin } from './whoami';

describe('loginOnDemand scoping (CLI integration)', () => {
  beforeEach(() => {
    resolveAwsContextMock.mockClear();
    runCommandMock.mockReset().mockResolvedValue(0);
    sendMock.mockClear();
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
  });

  it('non-aws command: afterResolve does not fire for aws plugin', async () => {
    const run = createCli({
      alias: 'test',
      compose: (program) =>
        program.use(awsPlugin()).use(
          cmdPlugin({
            asDefault: true,
            optionAlias: '-c, --cmd <command...>',
          }),
        ),
    });

    await run(['node', 'test', 'cmd', 'echo', 'hello']);

    // afterResolve is scoped: aws plugin should NOT be called for non-aws commands.
    expect(resolveAwsContextMock).not.toHaveBeenCalled();
  });

  it('aws command: afterResolve fires with full config including loginOnDemand', async () => {
    const run = createCli({
      alias: 'test',
      compose: (program) => program.use(awsPlugin()),
    });

    await run([
      'node',
      'test',
      'aws',
      '--login-on-demand',
      '--region',
      'us-east-1',
    ]);

    // resolveAwsContext should be called, and at least one call should have loginOnDemand: true
    expect(resolveAwsContextMock).toHaveBeenCalled();
    const lodValues = resolveAwsContextMock.mock.calls.map(
      ([arg]) => arg.cfg.loginOnDemand,
    );
    expect(lodValues).toContain(true);
  });

  it('aws child command: afterResolve fires with full config including loginOnDemand', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const run = createCli({
      alias: 'test',
      compose: (program) => program.use(awsPlugin().use(awsWhoamiPlugin())),
    });

    await run([
      'node',
      'test',
      'aws',
      '--login-on-demand',
      '--region',
      'us-east-1',
      'whoami',
    ]);

    expect(resolveAwsContextMock).toHaveBeenCalled();
    const lodValues = resolveAwsContextMock.mock.calls.map(
      ([arg]) => arg.cfg.loginOnDemand,
    );
    expect(lodValues).toContain(true);

    logSpy.mockRestore();
  });
});
