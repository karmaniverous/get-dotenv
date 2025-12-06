---
title: Lifecycle & Wiring
---

# Authoring Plugins: Lifecycle & Wiring

Plugins are small modules that register commands and behavior against the plugin‑first host. The host resolves dotenv context once per invocation, overlays config, validates, and then runs your plugin’s setup and optional afterResolve hooks.

## Minimal plugin

```ts
import type { GetDotenvCliPublic } from '@karmaniverous/get-dotenv/cliHost';
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

export const helloPlugin = () =>
  definePlugin({
    id: 'hello',
    setup(cli: GetDotenvCliPublic) {
      cli
        .ns('hello')
        .description('Say hello')
        .action(() => {
          const ctx = cli.getCtx();
          console.log('hello', Object.keys(ctx?.dotenv ?? {}).length);
        });
    },
  });
```

## Wiring a host

```ts
#!/usr/bin/env node
import type { Command } from 'commander';
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import {
  cmdPlugin,
  batchPlugin,
  awsPlugin,
  initPlugin,
} from '@karmaniverous/get-dotenv/plugins';
import { helloPlugin } from './plugins/hello';

const program: Command = new GetDotenvCli('toolbox');
await (program as unknown as GetDotenvCli).brand({
  importMetaUrl: import.meta.url,
  description: 'Toolbox CLI',
});

program
  .attachRootOptions({ loadProcess: false })
  .use(cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }))
  .use(batchPlugin())
  .use(awsPlugin())
  .use(initPlugin())
  .use(helloPlugin())
  .passOptions({ loadProcess: false });

await program.parseAsync();
```

Notes:

- attachRootOptions() installs base flags (env/paths/shell/trace/etc.).
- passOptions() merges flags (parent < current), resolves dotenv context once, validates against config, and persists the merged options bag for nested flows.

## Branding the host

Use brand() to set CLI name/description and a versioned header:

```ts
await (program as unknown as GetDotenvCli).brand({
  importMetaUrl: import.meta.url, // resolve version from nearest package.json
  description: 'Toolbox CLI',
});
```

## Accessing context and options

Inside actions, prefer the structural helpers:

```ts
import { readMergedOptions } from '@karmaniverous/get-dotenv/cliHost';

cli.ns('print').action((_args, _opts, thisCommand) => {
  const bag = readMergedOptions(thisCommand) ?? {};
  const ctx = cli.getCtx();
  // bag contains merged root options (scripts, shell, capture, trace, etc.)
  // ctx.dotenv contains the final merged env (after overlays and dynamics)
});
```

See also:

- Config & Validation
- Executing Shell Commands

## Dynamic option descriptions

Prefer the plugin‑bound helper createPluginDynamicOption to render help text that reflects the resolved configuration for that specific plugin instance. The host evaluates dynamic descriptions with overlays and dynamic enabled, without logging or mutating the environment.

Key points:

- createPluginDynamicOption(cli, flags, (cfg, pluginCfg) => string, parser?, defaultValue?) attaches to the current plugin, injecting that plugin’s validated config slice (pluginCfg).
- The callback receives a read‑only resolved help config (top‑level flags) and the instance‑bound plugin config slice. Avoid by‑id lookups (e.g., cfg.plugins.<id>); rely on pluginCfg instead.
- Top‑level “-h/--help” computes a read‑only config and evaluates dynamic text; “help <cmd>” refreshes dynamic text after preSubcommand resolution.

Example (plugin flag with ON/OFF default label using instance‑bound config):

```ts
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

type HelloConfig = { loud?: boolean };

export const helloPlugin = () => {
  const plugin = definePlugin({
    id: 'hello',
    setup(cli) {
      cli
        .ns('hello')
        .description('Say hello with current dotenv context')
        .addOption(
          plugin.createPluginDynamicOption<HelloConfig>(
            cli,
            '--loud',
            (_bag, cfg) =>
              `print greeting in ALL CAPS${cfg.loud ? ' (default)' : ''}`,
          ),
        )
        .action(() => {
          const cfg = plugin.readConfig<HelloConfig>(cli);
          // use cfg.loud at runtime
        });
    },
  });
  return plugin;
};
```

Or build the Option first:

```ts
const opt = plugin.createPluginDynamicOption<{ color?: string }>(
  cli,
  '--color <string>',
  (_bag, cfg) => `text color (default: ${JSON.stringify(cfg.color ?? 'blue')})`,
);
cli.addOption(opt);
```

Notes:

- Use concise labels for ON/OFF toggles (e.g., “(default)”) and “(default: "...")” for string defaults.
- Plugin config is validated and deep‑interpolated once by the host; read it via plugin.readConfig(cli).

Update (DX: no undefined):

- With the current host, readConfig returns a concrete object (never undefined). Defaults are materialized from the schema when no slice is present.
- The dynamic option callback receives a concrete plugin config object too, so you can reference cfg.foo without optional chaining when you have defaults in your schema.
