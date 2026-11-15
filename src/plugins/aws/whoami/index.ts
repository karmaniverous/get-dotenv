import { definePlugin } from '@/src/cliHost';

import { attachWhoamiDefaultAction } from './defaultAction';
import { attachWhoamiOptions } from './options';

/**
 * AWS Whoami plugin factory: `aws whoami` prints the caller identity.
 *
 * Its behaviour lives in separate modules as `attach*` helpers (options,
 * default action): internal wiring for one plugin instance, not individually
 * composable plugins.
 *
 * @returns A plugin instance mounted at `aws whoami`.
 */
export const awsWhoamiPlugin = () =>
  definePlugin({
    ns: 'whoami',
    setup(cli) {
      cli.description('Print AWS caller identity (uses parent aws session)');

      // Options/args (none today, but keep layout consistent with other plugins).
      const whoami = attachWhoamiOptions(cli);

      // Default behavior: `getdotenv aws whoami`
      attachWhoamiDefaultAction(whoami);

      return undefined;
    },
  });
