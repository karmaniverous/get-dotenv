import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

import { definePlugin } from '@/src/cliHost';

/**
 * AWS Whoami plugin: prints the current AWS caller identity (account, arn, userid).
 * Intended to be mounted under the `aws` plugin.
 */
export const awsWhoamiPlugin = () =>
  definePlugin({
    ns: 'whoami',
    setup(cli) {
      cli
        .description('Print AWS caller identity (uses parent aws session)')
        .action(async () => {
          // The AWS SDK default providers will read credentials from process.env,
          // which the aws parent has already populated.
          const client = new STSClient();
          const result = await client.send(new GetCallerIdentityCommand());
          console.log(JSON.stringify(result, null, 2));
        });
      return undefined;
    },
  });
