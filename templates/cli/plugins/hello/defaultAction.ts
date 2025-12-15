import { getRootCommand } from '@karmaniverous/get-dotenv/cliHost';

import type { HelloPlugin } from '.';
import type { HelloCommand } from './options';

export function attachHelloDefaultAction(
  cli: HelloCommand,
  plugin: HelloPlugin,
) {
  cli.action(() => {
    const ctx = cli.getCtx();
    // Derive CLI name from the true root command using a typed helper.
    const rootName = getRootCommand(cli).name();

    const cfg = plugin.readConfig(cli);
    const opts = cli.opts();
    const loud =
      opts.loud === true ? true : opts.loudOff === true ? false : cfg.loud;

    const keys = Object.keys(ctx.dotenv);
    const label = `Hello, stranger!\n\n[${rootName}] dotenv keys (${String(keys.length)}):`;
    console.log(loud ? label.toUpperCase() : label, keys.join(', '));
  });
}
