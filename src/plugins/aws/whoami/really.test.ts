import { describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn(() => Promise.resolve({}));
vi.mock('@aws-sdk/client-sts', () => ({
  STSClient: class {
    send = sendMock;
  },
  GetCallerIdentityCommand: function GetCallerIdentityCommand() {},
}));

import { createCli } from '@/src/cli';
import { definePlugin } from '@/src/cliHost';

import { awsWhoamiPlugin } from './index';

describe('plugins/aws/whoami really', () => {
  it('prints SECRET_IDENTITY and does not run default whoami action', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const awsBucket = () => {
      const aws = definePlugin({
        ns: 'aws',
        setup(cli) {
          cli.description('Test bucket parent (no AWS session side effects)');
          return undefined;
        },
      });
      aws.use(awsWhoamiPlugin());
      return aws;
    };

    const run = createCli({
      alias: 'test',
      compose: (program) => program.use(awsBucket()),
    });

    await run([
      'node',
      'test',
      '-v',
      'SECRET_IDENTITY=Batman',
      'aws',
      'whoami',
      'really',
    ]);

    expect(logSpy).toHaveBeenCalledWith('My secret identity is Batman.');
    expect(sendMock).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
