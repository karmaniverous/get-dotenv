import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

import { attachHelloDefaultAction } from './defaultAction';
import { attachHelloOptions } from './options';
import { helloConfigSchema } from './schema';

export const helloPlugin = () => {
  const plugin = definePlugin({
    ns: 'hello',
    configSchema: helloConfigSchema,
    setup(cli) {
      // Keep description in the plugin “index” (this file), not in an options helper.
      cli.description('Say hello with current dotenv context');

      attachHelloOptions(cli, plugin);
      attachHelloDefaultAction(cli, plugin);
    },
  });
  return plugin;
};
