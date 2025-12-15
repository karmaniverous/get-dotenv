import type { definePlugin, GetDotenvCliPublic } from '@/src/cliHost';

export function attachHelloOptions(
  cli: GetDotenvCliPublic,
  plugin: ReturnType<typeof definePlugin>,
) {
  cli.addOption(
    plugin.createPluginDynamicOption(
      cli,
      '--loud',
      (_bag, pluginCfg: Readonly<{ loud: boolean }>) =>
        `print greeting in ALL CAPS${pluginCfg.loud ? ' (default)' : ''}`,
    ),
  );
  return cli;
}
