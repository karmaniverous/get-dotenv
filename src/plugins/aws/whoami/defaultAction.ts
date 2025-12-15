import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

import type { GetDotenvCliPublic } from '@/src/cliHost';

/**
 * Attach the default action for the `aws whoami` command.
 *
 * This behavior executes only when `aws whoami` is invoked without a subcommand.
 *
 * @param cli - The `whoami` command mount.
 * @returns Nothing.
 */
export function attachWhoamiDefaultAction(cli: GetDotenvCliPublic): void {
  cli.action(async () => {
    // The AWS SDK default providers will read credentials from process.env,
    // which the aws parent has already populated.
    const client = new STSClient();
    const result = await client.send(new GetCallerIdentityCommand());
    console.log(JSON.stringify(result, null, 2));
  });
}
