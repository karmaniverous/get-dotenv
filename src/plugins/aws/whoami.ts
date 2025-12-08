import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

import { definePlugin } from '@/src/cliHost';

export const awsWhoamiPlugin = () =>
  definePlugin({
    id: 'aws-whoami',
    setup(cli) {
      cli
        .ns('whoami')
        .description('Print AWS caller identity (uses parent aws session)')
        .action(async () => {
          // The AWS SDK default providers will read credentials from process.env,
          // which the aws parent has already populated.
          const client = new STSClient();
          const result = await client.send(new GetCallerIdentityCommand());
          console.log(JSON.stringify(result, null, 2));
        });
    },
  });
