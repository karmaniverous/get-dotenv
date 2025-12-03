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

- `attachRootOptions()` installs base flags (env/paths/shell/trace/etc.).
- `passOptions()` merges flags (parent < current), resolves dotenv context once, validates against config, and persists the merged options bag for nested flows.

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

- [Config & Validation](./config.md)
- [Executing Shell Commands](./exec.md)

## Dynamic option descriptions

Use dynamicOption (or createDynamicOption + addOption) to render help text that reflects the resolved configuration at help time. The host evaluates dynamic descriptions with overlays and dynamic enabled, without logging or mutating the environment.

Key points:

- dynamicOption(flags, (cfg) => string, parser?, defaultValue?) is chainable like option().
- The callback receives a read‑only resolved help config: top‑level get‑dotenv options and cfg.plugins slices (merged, interpolated).
- Top‑level “-h/--help” computes a read‑only config and evaluates dynamic text; “help <cmd>” refreshes dynamic text after preSubcommand resolution. Both paths render the same defaults.

Example (plugin flag with ON/OFF default label):

```ts
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

export const helloPlugin = () =>
  definePlugin({
    id: 'hello',
    setup(cli) {
      cli
        .ns('hello')
        .description('Say hello with current dotenv context')
        .dynamicOption('--loud', (cfg) => {
          const on = !!(cfg.plugins as { hello?: { loud?: boolean } })?.hello
            ?.loud;
          return `print greeting in ALL CAPS${on ? ' (default)' : ''}`;
        })
        .action((_args, _opts) => {
          // …
        });
    },
  });
```

Or build the Option first:

```ts
const opt = (cli as any).createDynamicOption('--color <string>', (cfg) => {
  const col =
    (cfg.plugins as { hello?: { color?: string } })?.hello?.color || 'blue';
  return `text color (default: ${JSON.stringify(col)})`;
});
cli.addOption(opt);
```

Notes:

- Plugin config lives under plugins.<id> (see “Plugin config” in Config files & overlays); strings are deep‑interpolated once against { ...ctx.dotenv, ...process.env } (process.env wins for plugin slices).
- Use concise labels for ON/OFF toggles (e.g., “(default)”) and “(default: "...")” for string defaults.

See also:

- Config files & overlays → “Plugin config” for where defaults come from and how they’re merged.
- Shell execution behavior for examples of dynamic default labels at root and in plugins.
