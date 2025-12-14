import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveAwsContextMock = vi.fn(
  ({ cfg }: { cfg: { profile?: string; region?: string } }) =>
    Promise.resolve({
      profile: cfg.profile,
      region: cfg.region,
    }),
);
vi.mock('./service', () => ({
  resolveAwsContext: (arg: { cfg: { profile?: string; region?: string } }) =>
    resolveAwsContextMock(arg),
}));

const sendMock = vi.fn(() => Promise.resolve({}));
vi.mock('@aws-sdk/client-sts', () => ({
  STSClient: class {
    constructor() {
      if (!process.env.AWS_REGION && !process.env.AWS_DEFAULT_REGION) {
        throw new Error('Region is missing');
      }
    }
    send = sendMock;
  },
  GetCallerIdentityCommand: function GetCallerIdentityCommand() {},
}));

import { createCli } from '@/src/cli';
import { awsPlugin, awsWhoamiPlugin } from '@/src/plugins';

describe('plugins/aws subcommand flags', () => {
  beforeEach(() => {
    resolveAwsContextMock.mockClear();
    sendMock.mockClear();
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;
  });

  it('applies --region for `aws whoami` via preSubcommand hook', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const run = createCli({
      alias: 'test',
      compose: (program) => program.use(awsPlugin().use(awsWhoamiPlugin())),
    });

    await run([
      'node',
      'test',
      'aws',
      '--profile',
      'JGS-SSO',
      '--region',
      'us-east-1',
      'whoami',
    ]);

    expect(resolveAwsContextMock).toHaveBeenCalled();
    expect(process.env.AWS_REGION).toBe('us-east-1');
    expect(sendMock).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
