---
title: Plugin-first host
---

# Plugin-first host (GetDotenvCli)

The plugin-first host provides a composable way to build dotenv-aware CLIs. It validates options strictly, resolves dotenv context once per invocation, and exposes lifecycle hooks for plugins.

## Quickstart

```ts
#!/usr/bin/env node
import type { Command } from 'commander';
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins/batch';

const program: Command = new GetDotenvCli('mycli').use(batchPlugin());
await (program as unknown as GetDotenvCli).resolveAndLoad();
await program.parseAsync();
```

- `resolveAndLoad()` produces a context `{ optionsResolved, dotenv, plugins? }`.
- The host registers a preSubcommand hook to ensure a context exists when subcommands run (e.g., batch).

## Branding the host CLI

Use the branding helper to set the CLI’s name/description and automatically display the version at the top of help (-h). When you provide `importMetaUrl`, the host resolves the nearest package.json and uses its `version`. If you don’t pass a `helpHeader`, the host prints a sensible default `<name> v<version>` as a header.

```ts
#!/usr/bin/env node
import type { Command } from 'commander';
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';

const program: GetDotenvCli = new GetDotenvCli('toolbox');
await program.brand({
  importMetaUrl: import.meta.url, // resolves version from your package.json
  description: 'Toolbox CLI', // optional
  // helpHeader: 'My Toolbox v1.2.3',  // optional; default uses "<name> v<version>"
});

// … wire options/plugins …
await program.parseAsync();
```

Notes:

- The shipped getdotenv CLI calls `brand({ importMetaUrl })` so `getdotenv vX.Y.Z` appears at the top of `-h` output.
- Downstream CLIs should do the same; the resolved version will be your package’s version.

## Adding app/root options and consuming them from a plugin

You can add your own root options and group them under “App options” in help using `tagAppOptions`. Install base flags and merging with `attachRootOptions().passOptions()` so values flow into the merged options bag:

```ts
import type { Command } from 'commander';
import {
  GetDotenvCli,
  readMergedOptions,
} from '@karmaniverous/get-dotenv/cliHost';
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

const program: GetDotenvCli = new GetDotenvCli('mycli');
await program.brand({ importMetaUrl: import.meta.url, description: 'My CLI' });

program
  .attachRootOptions() // install base flags (-e, --paths, etc.)
  .tagAppOptions((root) => {
    root.option('--foo <value>', 'custom app option'); // appears under "App options" in -h
  })
  .use(
    definePlugin({
      id: 'print',
      setup(cli) {
        cli.ns('print').action((_args, _opts, thisCommand) => {
          // Read the merged root options bag. Custom keys flow through.
          const bag = readMergedOptions(thisCommand) ?? {};
          const foo = (bag as unknown as { foo?: string }).foo;
          console.log(`foo=${foo ?? ''}`);
        });
      },
    }),
  )
  .passOptions(); // merge flags (parent < current), compute dotenv context

await program.parseAsync();
```

Example:

```bash
mycli -e dev --foo bar print
# -> foo=bar
```

Notes:

- `tagAppOptions` only affects help grouping; values are parsed by Commander and merged by `passOptions()`.
- Use `readMergedOptions(thisCommand)` in actions (or `cli.getOptions()` from code that has a handle on the host) to read the merged options bag. Custom keys are present at runtime even if not in the default type.

## Writing a plugin

```ts
import type { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

export const myPlugin = definePlugin({
  id: 'my',
  setup(cli: GetDotenvCli) {
    cli
      .ns('my')
      .description('My commands')
      .action(async () => {
        const ctx = cli.getCtx?.();
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

Prefer passing the resolved env explicitly to subprocesses invoked by your commands:

```ts
import { execaCommand } from 'execa';

// inside a command action:
const ctx = cli.getCtx?.();
await execaCommand('node -e "console.log(process.env.MY_VAR)"', {
  env: { ...process.env, ...ctx.dotenv },
  stdio: 'inherit',
});
```

The shipped CLI uses a nested-CLI strategy by placing the merged CLI options on `process.env.getDotenvCliOptions` (JSON) so child `getdotenv` invocations can inherit the parent’s defaults and flags.

## Scaffolding a host-based CLI

Use the built-in scaffolder to create config files and a starter CLI:

```bash
# JSON config + .local + CLI skeleton named “acme”
getdotenv init . --config-format json --with-local --cli-name acme --force
```

Notes:

- Templates are shipped and copied verbatim (no inline codegen).
- Collision flow supports [o]/[e]/[s] and [O]/[E]/[S]; non-interactive defaults to `--yes` unless `--force`.
- The CLI skeleton replaces `__CLI_NAME__` tokens with your chosen name.
- Non-interactive detection and precedence:
  - Treated as `--yes` (Skip All) when stdin or stdout is not a TTY OR when a CI-like environment variable is present (`CI`, `GITHUB_ACTIONS`, `BUILDKITE`, `TEAMCITY_VERSION`, `TF_BUILD`).
  - Precedence is `--force` > `--yes` > auto-detect (non-interactive => Skip All).

## Config loader behavior

The plugin host and the generator use the config loader/overlay path by default (always-on). When no config files are present, the loader is a no-op. See the “Config files and overlays” guide for discovery, formats, and precedence. There is no switch to enable this behavior; it is always active.

## AWS

The AWS base plugin resolves profile/region and acquires credentials using a safe cascade (env-first → CLI export → (optional) SSO login → static fallback), then writes them into `process.env` and mirrors them under `ctx.plugins.aws`.

You can also use the `aws` subcommand to establish a session and optionally forward to the AWS CLI:

- Session only:
  ```
  getdotenv aws --profile dev --login-on-demand
  ```
  Establishes credentials/region according to overrides and exits 0.
- Forward to AWS CLI (tokens after `--` are passed through):
  ```
  getdotenv aws --profile dev --login-on-demand -- sts get-caller-identity
  ```
  Uses the same exec path as `cmd`: shell-off by default for binaries, honors script/global shell overrides, and supports CI-friendly capture via `--capture` or `GETDOTENV_STDIO=pipe`.

NPM script patterns:

- Needs runtime flags:
  ```json
  { "scripts": { "aws": "getdotenv aws" } }
  ```
  Then:
  ```
  npm run aws -- --profile dev -- -- s3 ls
  ```
- Hardcoded command:
  ```json
  {
    "scripts": {
      "aws:whoami": "getdotenv aws --login-on-demand -- sts get-caller-identity"
    }
  }
  ```
