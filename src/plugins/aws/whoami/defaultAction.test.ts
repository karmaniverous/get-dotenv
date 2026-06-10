import { describe, expect, it, vi } from 'vitest';

import { createCli } from '@/src/cli';
import { definePlugin } from '@/src/cliHost';

import { awsWhoamiPlugin } from './index';

describe('plugins/aws/whoami defaultAction', () => {
  it('prints a friendly error when @aws-sdk/client-sts is missing', async () => {
    // Mock the SDK to simulate it not being installed.
    vi.doMock('@aws-sdk/client-sts', () => {
      throw new Error(
        "Cannot find package '@aws-sdk/client-sts'",
      );
    });

    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const awsBucket = () => {
      const aws = definePlugin({
        ns: 'aws',
        setup(cli) {
          cli.description('Test bucket parent');
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

    await run(['node', 'test', 'aws', 'whoami']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('@aws-sdk/client-sts'),
    );
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
    process.exitCode = 0;
    vi.doUnmock('@aws-sdk/client-sts');
  });
});
