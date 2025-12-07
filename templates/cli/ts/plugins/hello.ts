import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';
import { z } from 'zod';

const HelloConfigSchema = z.object({
  loud: z.boolean().optional().default(false),
  color: z.string().optional(),
});

export const helloPlugin = () => {
  const plugin = definePlugin({
    id: 'hello',
    configSchema: HelloConfigSchema,
    setup(cli) {
      cli
        .ns('hello')
        .description('Say hello with current dotenv context')
        .addOption(
          plugin.createPluginDynamicOption(
            cli,
            '--loud',
            (_bag, cfg) =>
              `print greeting in ALL CAPS${cfg.loud ? ' (default)' : ''}`,
          ),
        )
        .action(() => {
          const ctx = cli.getCtx();
          const name = '__CLI_NAME__';
          const cfg = plugin.readConfig(cli);
          const keys = Object.keys(ctx.dotenv);
          const label = cfg.loud
            ? `[${name}] DOTENV KEYS (${String(keys.length)}):`
            : `[${name}] dotenv keys (${String(keys.length)}):`;
          console.log(label, keys.join(', '));
        });
    },
  });
  return plugin;
};
