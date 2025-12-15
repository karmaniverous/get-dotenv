import {
  type definePlugin,
  type GetDotenvCliPublic,
  getRootCommand,
} from '@/src/cliHost';

export function attachHelloDefaultAction(
  cli: GetDotenvCliPublic,
  plugin: ReturnType<typeof definePlugin>,
) {
  cli.action(() => {
    const ctx = cli.getCtx();
    // Derive CLI name from the true root command using a typed helper.
    const rootName = getRootCommand(cli).name();

    const cfg = plugin.readConfig<{ loud: boolean }>(cli);
    const keys = Object.keys(ctx.dotenv);
    const label = cfg.loud
      ? `[${rootName}] DOTENV KEYS (${String(keys.length)}):`
      : `[${rootName}] dotenv keys (${String(keys.length)}):`;
    console.log(label, keys.join(', '));
  });
}
