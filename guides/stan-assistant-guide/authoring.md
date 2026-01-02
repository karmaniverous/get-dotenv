---
title: 'Authoring Hosts & Plugins'
---

# Building your own host + plugins

## The host lifecycle

- Host resolves dotenv context once per invocation: `await program.resolveAndLoad(...)`.
- Resolved context is available via `cli.getCtx()` inside any plugin mount/action.
- Root hooks persist a merged “root options bag”: `readMergedOptions(thisCommand)`.

## Minimal plugin pattern

```ts
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

export const helloPlugin = () =>
  definePlugin({
    ns: 'hello',
    setup(cli) {
      cli.description('Say hello').action(() => {
        const ctx = cli.getCtx();
        console.log('dotenv keys:', Object.keys(ctx.dotenv).length);
      });
    },
  });
```

## Grouping plugins (groupPlugins)

Use `groupPlugins` to group child plugins under a shared prefix (e.g. `smoz getdotenv init`).

```ts
import { groupPlugins } from '@karmaniverous/get-dotenv/cliHost';
import { initPlugin } from '@karmaniverous/get-dotenv/plugins';

program.use(groupPlugins({ ns: 'getdotenv' }).use(initPlugin()));
```

## Dynamic option descriptions

Prefer the plugin-bound helper `createPluginDynamicOption` to render help text that reflects the resolved configuration for that specific plugin instance.

```ts
import { z } from 'zod';
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

const helloConfigSchema = z.object({
  loud: z.boolean().optional().default(false),
});

export const helloPlugin = () => {
  const plugin = definePlugin({
    ns: 'hello',
    configSchema: helloConfigSchema,
    setup(cli) {
      cli
        .description('Say hello')
        .addOption(
          // Helper infers config type
          plugin.createPluginDynamicOption(
            cli,
            '--loud',
            (
              _bag,
              pluginCfg, // inferred as Readonly<HelloConfig>
            ) =>
              `print greeting in ALL CAPS${pluginCfg.loud ? ' (default)' : ''}`,
          ),
        )
        .action(() => {
          const pluginCfg = plugin.readConfig(cli);
          // use pluginCfg.loud
        });
    },
  });
  return plugin;
};
```

### Subcommands (single-plugin)

To reflect defaults in subcommand help without creating separate plugins:

1. Model defaults in your plugin schema (nested object).
2. Pass the _subcommand instance_ to `createPluginDynamicOption`.

```ts
const sub = cli.command('sub');
sub.addOption(
  plugin.createPluginDynamicOption(
    sub, // target the subcommand
    '--mode <val>',
    (_bag, pluginCfg) => `mode (default: ${pluginCfg.sub.mode})`,
  ),
);
```

## Complex Plugins (Subcommands & Resolvers)

For plugins with multiple subcommands (e.g. `aws dynamodb create`), follow the **Resolver Pattern**.

1.  **Schema**: Model defaults as nested objects in the plugin schema (e.g. `create: { version: ... }`).
2.  **Registration**: `action` handler simply calls a resolver, then a service. Keep it thin.
3.  **Resolver**: Pure function `(flags, config, envRef) => ServiceInput`.
    - Handles precedence: Flags > Config > Defaults.
    - Handles expansion (see below).

### Expansion Rules

- **Config Strings**: The host interpolates these _before_ your plugin runs. Do not re-expand `pluginCfg` values.
- **Flag Values**: You must expand these manually if you want `${VAR}` support. Use `dotenvExpand(val, { ...process.env, ...ctx.dotenv })`.

### Testing

- **Wiring Tests**: Use `cli.install()` to verify commands/options exist (smoke test).
- **Resolver Tests**: Unit test the resolver function for precedence and logic.

## Running subprocesses safely

Always build a normalized child env:

```ts
import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
const env = buildSpawnEnv(process.env, ctx.dotenv);
```

Honor capture contract:

```ts
import {
  readMergedOptions,
  runCommand,
  shouldCapture,
} from '@karmaniverous/get-dotenv/cliHost';

const bag = readMergedOptions(thisCommand);
const capture = shouldCapture(bag.capture);

await runCommand('echo OK', bag.shell ?? false, {
  env,
  stdio: capture ? 'pipe' : 'inherit',
});
```

## Expanding plugin flag values

Expand at action time using the resolved context:

```ts
import { dotenvExpand } from '@karmaniverous/get-dotenv';

const raw = String(opts.tableName ?? '');
const envRef = { ...process.env, ...cli.getCtx().dotenv };
const expanded = dotenvExpand(raw, envRef) ?? raw;
```

## Diagnostics helpers

- `traceChildEnv({ parentEnv, dotenv, keys?, redact?, ... })`
- `redactDisplay(value, ...)`
- `maybeWarnEntropy(key, value, origin, opts, write)`

These are presentation-only helpers to mirror the shipped CLI behavior.
