---
title: batch
---

# Shipped Plugins: batch

Run a command across multiple working directories discovered by globs, with each run inheriting the current dotenv context. Execution is sequential by design to keep output readable.

## Import paths

```ts
// Recommended: plugins barrel (shares type identity with cliHost)
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins';
```

Per‑plugin subpaths remain available when needed:

```ts
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins/batch';
```

## CLI usage

```bash
getdotenv batch [options] [command...]
```

Notes:

- Batch runs after the host has resolved dotenv context (dotenv files + config overlays + dynamics), so each child process receives `{ ...process.env, ...ctx.dotenv }` (normalized via `buildSpawnEnv`).
- Root flags still apply as usual (for example `--paths`, `--env`, `--shell/--shell-off`, `--capture`, `--trace`); they can appear before `batch` in the invocation.

## Options

- `-p, --pkg-cwd` Use nearest package directory as current working directory (instead of CWD).
- `-r, --root-path <string>` Root path from current working directory (default: `"./"`).
- `-g, --globs <string>` Space‑delimited globs under the root path (default: `"*"`).
- `-c, --command <string>` Command to execute (string form; scripts-aware).
- `-l, --list` List working directories without executing the command.
- `-e, --ignore-errors` Continue processing remaining paths after a command error.

## Specifying what to run

Batch supports two equivalent ways to provide a command payload:

- Positional tokens (`[command...]`) (the default behavior)
- `--command <string>` (a string payload; scripts-aware)

Prefer providing exactly one of these. If both are provided, the current implementation treats positional tokens as the command payload (when not in list mode).

### 1) Positional command tokens (default)

This is the most direct form and is the easiest way to avoid shell quoting issues, especially for `node -e` snippets when running with `--shell-off`.

```bash# Run "echo OK" in each matched directory
getdotenv batch -r ./services -g "web api" echo OK
```

```bash
# Shell-off + argv-friendly form (recommended for Node -e across platforms)
getdotenv --shell-off batch -r ./services -g "web" cmd node -e "console.log(process.cwd())"
```

Notes:

- `batch cmd …` is explicit and mirrors the built-in `cmd` subcommand naming; `batch …` is equivalent (cmd is the default subcommand).
- When `--shell-off` is active and you run `node -e/--eval`, the host preserves the argv array to avoid lossy re-tokenization.

### 2) --command string (scripts-aware)

Use `--command` when you want a single string payload and/or want to resolve a named script through a scripts table.

```bash
# Run a raw string command (shell behavior depends on root --shell)
getdotenv batch -r ./services -g "*" --command "npm test"
```

```bash
# Run a named script from a scripts table
getdotenv batch -r ./services -g "*" --command build
```

Shell resolution:

- If the resolved script entry is the object form `{ cmd, shell }`, the effective shell is `scripts[name].shell` (and when omitted, the script currently runs with shell OFF rather than inheriting the root shell).
- If the resolved script entry is the string form, the root shell setting applies (`--shell` / `--shell-off`).

List mode:

```bash
# List only (no command required)
getdotenv batch -r ./services -g "web api" --list
```

Tip: in list mode, prefer `--globs "<space-delimited globs>"`. If you omit `--command`, extra positional tokens after `--list` are treated as additional globs (not as a command), for example:

```bash
getdotenv batch -r ./services -l web api
```

## Examples (end-to-end)

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

## Defaults via config (recommended)

You can set default `rootPath`, `globs`, `pkgCwd`, and (rarely) `shell` under `plugins.batch` in your getdotenv config. This controls both behavior and the “(default …)” labels shown in `getdotenv batch -h`.

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

Notes:

- Prefer top-level `scripts` for shared command aliases across `cmd` and `batch`; use plugin-scoped `plugins.batch.scripts` only when you want batch-specific behavior.
- For script-level shell overrides, prefer the object form `{ cmd, shell }` rather than setting a global `plugins.batch.shell`.

## Integration with a composed CLI host

If you are composing your own CLI surface, install `batchPlugin()` on the host just like the other shipped plugins:

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { batchPlugin, cmdPlugin } from '@karmaniverous/get-dotenv/plugins';

const run = createCli({
  alias: 'toolbox',
  compose: (p) =>
    p
      .use(cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }))
      .use(batchPlugin()),
});

await run();
```

## Behavior and diagnostics

- Sequential execution reduces noise and preserves legibility. A future `--concurrency` option is planned (see roadmap).
- Deterministic output for CI: set `GETDOTENV_STDIO=pipe` or pass `--capture` so each child process buffers output.
- Use `--trace [keys...]` (and optionally `--redact`) to inspect child env composition before spawning, without altering runtime values.
- On errors, the default behavior is to stop; use `--ignore-errors` to continue.