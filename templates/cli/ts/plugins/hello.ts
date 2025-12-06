import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

type HelloConfig = {
  loud?: boolean;
  color?: string;
};

export const helloPlugin = () => {
  const plugin = definePlugin<unknown, HelloConfig>({
    id: 'hello',
    setup(cli) {
      cli
        .ns('hello')
        .description('Say hello with current dotenv context')
        .addOption(
          plugin.createPluginDynamicOption(
            cli,
            '--loud',
            (_bag, cfg) =>
              `print greeting in ALL CAPS${cfg?.loud ? ' (default)' : ''}`,
          ),
        )
        .action(() => {
          const ctx = cli.getCtx();
          const name = '__CLI_NAME__';
          const cfg = plugin.readConfig<HelloConfig>(cli) ?? {};
          const keys = Object.keys(ctx?.dotenv ?? []);
          const label =
            cfg.loud === true
              ? `[${name}] DOTENV KEYS (${keys.length}):`
              : `[${name}] dotenv keys (${keys.length}):`;
          console.log(label, keys.join(', '));
        });
    },
  });
  return plugin;
};
