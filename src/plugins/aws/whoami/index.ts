import { definePlugin } from '@/src/cliHost';

import { attachWhoamiDefaultAction } from './defaultAction';
import { attachWhoamiReallySubcommand } from './really';

/**
 * AWS Whoami plugin factory.
 *
 * This plugin demonstrates a “bucket of subcommands” pattern:
 * - Subcommand behavior is articulated in separate modules as `attach*` helpers.
 * - Those helpers are not individually composable plugins; they are internal wiring for one plugin instance.
 *
 * @returns A plugin instance mounted at `aws whoami`.
 */
export const awsWhoamiPlugin = () =>
  definePlugin({
    ns: 'whoami',
    setup(cli) {
      cli.description('Print AWS caller identity (uses parent aws session)');

      // Default behavior: `getdotenv aws whoami`
      attachWhoamiDefaultAction(cli);

      // Subcommand behavior: `getdotenv aws whoami really`
      attachWhoamiReallySubcommand(cli);

      return undefined;
    },
  });
