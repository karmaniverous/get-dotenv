---
title: batch
---

# Shipped Plugins: batch

Execute a command across multiple working directories, each inheriting the current dotenv context. Output is streamed sequentially for legibility.

## Import paths

```ts
// Recommended: plugins barrel (shares type identity with cliHost)
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins';
```

Per‑plugin subpaths remain available when needed:

```ts
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins/batch';
```

## Command

```bash
getdotenv batch [options] [command...]
```

Options:

- -p, --pkg-cwd Use nearest package directory as current working directory.
- -r, --root-path <string> Root path from current working directory (default: ./).
- -g, --globs <string> Space‑delimited globs under the root path (default: \*).
- -c, --command <string> Command to execute (dotenv‑expanded).
- -l, --list List working directories without executing the command.
- -e, --ignore-errors Continue on error.

Notes:

- The default subcommand is cmd, so positional tokens after batch are treated as the command to run. List mode merges extra positional tokens into globs.
- Commands run with explicit env injection: { ...process.env, ...ctx.dotenv }.
- Shell resolution honors script‑level overrides and the global shell setting.
- Use --capture or GETDOTENV_STDIO=pipe to buffer outputs deterministically (e.g., CI).

## Examples

List repositories matching two globs:

```bash
getdotenv batch -r ./services -g "web api" -l
```

Run a Node snippet in each web repo under ./services:

```bash
getdotenv --shell-off batch -r ./services -g web cmd node -e "console.log(process.cwd())"
```

Run a named script (resolving via scripts and honoring per‑script shell):

```bash
getdotenv batch -g "*" -c build
```

## Plugin defaults via config

You can set default scripts, shell, rootPath, globs, and pkgCwd under plugins.batch in your config:

```json
{
  "plugins": {
    "batch": {
      "scripts": {
        "build": { "cmd": "npm run build", "shell": "/bin/bash" }
      },
      "shell": false,
      "rootPath": "./packages",
      "globs": "*",
      "pkgCwd": false
    }
  }
}
```

## Typed config (DX)

Use the typed accessor to read the validated plugins.batch slice:

```ts
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';
import type { BatchConfig } from '@karmaniverous/get-dotenv/plugins/batch';

export const myBatchAwarePlugin = () => {
  const plugin = definePlugin({
    id: 'my-batch',
    setup(cli) {
      const cfg = plugin.readConfig<BatchConfig>(cli);
      // cfg.scripts / cfg.shell / cfg.rootPath / cfg.globs / cfg.pkgCwd are strongly typed here
    },
  });
  return plugin;
};
```

## Behavior and diagnostics

- Sequential execution reduces noise and preserves legibility. A future --concurrency option is planned (see roadmap).
- The child env is composed from the current context and parent env; use --trace [keys...] to inspect where values come from (dotenv vs parent).
- On errors, the default behavior is to stop; use --ignore-errors to continue.
