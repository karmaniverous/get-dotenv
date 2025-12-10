import {
  definePlugin,
  getRootCommand,
} from '@karmaniverous/get-dotenv/cliHost';
import { z } from 'zod';

const HelloConfigSchema = z.object({
  loud: z.boolean().optional().default(false),
  color: z.string().optional(),
});

export const helloPlugin = () => {
  const plugin = definePlugin({
    ns: 'hello',
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
          // Derive CLI name from the true root command using a typed helper.
          const rootName = getRootCommand(cli).name();

          const cfg = plugin.readConfig(cli);
          const keys = Object.keys(ctx.dotenv);
          const label = cfg.loud
            ? `[${rootName}] DOTENV KEYS (${String(keys.length)}):`
            : `[${rootName}] dotenv keys (${String(keys.length)}):`;
          console.log(label, keys.join(', '));
        });
    },
  });
  return plugin;
};
