import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

import { attachHelloDefaultAction } from './defaultAction';
import { attachHelloOptions } from './options';
import { attachHelloStrangerAction } from './strangerAction';
import { helloPluginConfigSchema } from './types';

export const helloPlugin = () => {
  const plugin = definePlugin({
    ns: 'hello',
    configSchema: helloPluginConfigSchema,
    setup(cli) {
      // Keep description in the plugin “index” (this file), not in an options helper.
      cli.description('Say hello with current dotenv context');

      const helloCmd = attachHelloOptions(cli, plugin);
      attachHelloDefaultAction(cli, helloCmd, plugin);
      attachHelloStrangerAction(cli);

      return undefined;
    },
  });
  return plugin;
};

export type HelloPlugin = ReturnType<typeof helloPlugin>;
