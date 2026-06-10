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
    // Dynamic import: @aws-sdk/client-sts is an optional peer dependency.
    // A static import would cause Node to fail at startup (even for -h)
    // when the SDK is not installed in the consumer's project.
    const { GetCallerIdentityCommand, STSClient } = await import(
      '@aws-sdk/client-sts'
    );

    // The AWS SDK default providers will read credentials from process.env,
    // which the aws parent has already populated.
    const client = new STSClient();
    const result = await client.send(new GetCallerIdentityCommand());
    console.log(JSON.stringify(result, null, 2));
  });
}
