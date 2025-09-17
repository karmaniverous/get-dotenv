# Plugin-first host (GetDotenvCli)

The plugin-first host provides a composable way to build dotenv-aware CLIs. It
validates options strictly, resolves dotenv context once per invocation, and
exposes lifecycle hooks for plugins.

## Quickstart

```ts
#!/usr/bin/env node
import type { Command } from 'commander';
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins/batch';

const program: Command = new GetDotenvCli('mycli').use(batchPlugin());

// Guarded config loader (add via --use-config-loader)
const useConfigLoader = process.argv.includes('--use-config-loader');
await (program as unknown as GetDotenvCli).resolveAndLoad(
  useConfigLoader ? { useConfigLoader } : {},
);

await program.parseAsync();
```

- `resolveAndLoad()` produces a context `{ optionsResolved, dotenv, plugins? }`.
- The host registers a preSubcommand hook to ensure a context exists when
  subcommands run (e.g., batch).

## Writing a plugin

```ts
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

export const myPlugin = definePlugin({
  id: 'my',
  setup(cli) {
    cli
      .ns('my')
      .description('My commands')
      .action(async () => {
        const ctx = (cli as any).getCtx?.();
        // Use ctx.dotenv or ctx.plugins['my']...
      });
  },
  async afterResolve(cli, ctx) {
    // Initialize any clients/secrets using ctx.dotenv
    // Attach per-plugin state under ctx.plugins by convention:
    ctx.plugins ??= {};
    ctx.plugins['my'] = { ready: true };
  },
});
```

Composition:

```ts
const parent = definePlugin({ id: 'parent', setup() {} })
  .use(definePlugin({ id: 'childA', setup() {} }))
  .use(definePlugin({ id: 'childB', setup() {} }));
```

Plugins install parent → children; `afterResolve` also runs parent → children.

## Passing env to subprocesses

Prefer passing the resolved env explicitly to subprocesses invoked by your
commands:

```ts
import { execaCommand } from 'execa';

// inside a command action:
const ctx = (cli as any).getCtx?.();
await execaCommand('node -e "console.log(process.env.MY_VAR)"', {
  env: { ...process.env, ...ctx.dotenv },
  stdio: 'inherit',
});
```

The shipped CLI uses a nested-CLI strategy by placing the merged CLI options on
`process.env.getDotenvCliOptions` (JSON) so child `getdotenv` invocations can
inherit the parent’s defaults and flags.

## Scaffolding a host-based CLI

Use the built-in scaffolder to create config files and a starter CLI:

```bash
# JSON config + .local + CLI skeleton named "acme"
getdotenv init . --config-format json --with-local --cli-name acme --force
```

Notes:
- Templates are shipped with the package and copied verbatim (no inline codegen).
- Collision flow supports [o]/[e]/[s] and [O]/[E]/[S]; non-interactive defaults to `--yes` (skip all) unless `--force`.
- The CLI skeleton replaces `__CLI_NAME__` tokens with your chosen name.
- Non-interactive detection and precedence:
  - Treated as `--yes` (Skip All) when stdin or stdout is not a TTY OR when a CI-like
    environment variable is present (`CI`, `GITHUB_ACTIONS`, `BUILDKITE`,
    `TEAMCITY_VERSION`, `TF_BUILD`).
  - Precedence is `--force` > `--yes` > auto-detect (non-interactive => Skip All).

## Guarded config loader

The plugin host can enable the config-loader/overlay path by passing
`{ useConfigLoader: true }` to `resolveAndLoad()` or by exposing a flag and
reading it from `argv`. See the “Config files and overlays” guide for discovery,formats, and precedence.