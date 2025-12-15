import type { GetDotenvCliPublic } from '@karmaniverous/get-dotenv/cliHost';

import type { HelloPlugin } from '.';
import type { HelloPluginConfig } from './types';

export function attachHelloOptions(
  cli: GetDotenvCliPublic,
  plugin: HelloPlugin,
) {
  const loudOn = plugin
    .createPluginDynamicOption(
      cli,
      '-l, --loud',
      (_bag, pluginCfg: Readonly<HelloPluginConfig>) =>
        `print greeting in ALL CAPS${pluginCfg.loud ? ' (default)' : ''}`,
    )
    .conflicts('loudOff');

  const loudOff = plugin
    .createPluginDynamicOption(
      cli,
      '-L, --loud-off',
      (_bag, pluginCfg: Readonly<HelloPluginConfig>) =>
        `print greeting in normal case${pluginCfg.loud ? '' : ' (default)'}`,
    )
    .conflicts('loud');

  return cli.addOption(loudOn).addOption(loudOff);
}

export type HelloCommand = ReturnType<typeof attachHelloOptions>;
