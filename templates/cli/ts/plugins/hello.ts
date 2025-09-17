import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

export const helloPlugin = () =>
  definePlugin({
    id: 'hello',
    setup(cli) {
      cli
        .ns('hello')
        .description('Say hello with current dotenv context')
        .action(async () => {
          const ctx = cli.getCtx?.();
          const name = '__CLI_NAME__';

          console.log(`[${name}] dotenv keys:`, Object.keys(ctx?.dotenv ?? {}));
        });
    },
  });
