---
title: cmd
---

# Shipped Plugins: cmd

Execute a single command under the current dotenv context. Includes a convenient parent‑level `-c, --cmd <command...>` alias so npm script flags apply to getdotenv rather than the inner shell command.

## Import paths

```ts
// Recommended: plugins barrel (shares type identity with cliHost)
import { cmdPlugin } from '@karmaniverous/get-dotenv/plugins';
```

Per‑plugin subpaths remain available when needed:

```ts
import { cmdPlugin } from '@karmaniverous/get-dotenv/plugins/cmd';
```

## Command

```bash
getdotenv cmd [command...]
```

Positional tokens are used as the command payload. The plugin resolves scripts and shell settings using shared helpers and executes the child with:

- Explicit env injection: `{ ...process.env, ...ctx.dotenv }`
- `stdio`: inherits by default; enable capture with `--capture` or `GETDOTENV_STDIO=pipe`
- Shell resolution: uses the scripts table when present; object-form scripts `{ cmd, shell }` require an explicit `shell` (omission currently results in shell-off rather than inheriting the root shell)

Shell-off note: when `--shell-off` is active and you run `node -e/--eval`, the runner preserves argv tokens (and normalizes one layer of outer quotes on the code argument) to avoid lossy re-tokenization across platforms.

## Parent alias

The alias allows:

```bash
getdotenv -c 'echo $APP_SETTING'
```

Prefer the alias for npm scripts so flags after `--` are routed to getdotenv:

```json
{ "scripts": { "print": "getdotenv -c 'echo $APP_SETTING'" } }
```

Then:

```bash
npm run print -- -e dev
```

Conflict guard: Supplying both the alias and the `cmd` subcommand in the same invocation is disallowed and exits with a helpful message.

## Quoting and eval snippets

- On POSIX, prefer single quotes around `$VAR` to avoid outer‑shell expansion.
- On PowerShell, single quotes are literal; use double quotes for interpolation.
- For Node eval snippets, quote the entire payload so Commander doesn’t treat `-e/--eval` as getdotenv’s `--env`.

Examples:

```bash
getdotenv --cmd 'node -e "console.log(process.env.APP_SETTING ?? \"\")"'
getdotenv --shell-off cmd node -e "console.log(process.env.APP_SETTING ?? '')"
```

## Diagnostics

Use `--trace [keys...]` to print concise lines to stderr before spawning the child, indicating the origin and value composition for each key. Useful in CI and for debugging overlays.

## Scripts table and shell overrides

Commands may resolve via `scripts[name]`. When `scripts[name]` is the object form `{ cmd, shell }`, the effective shell is `scripts[name].shell` (and when omitted, the script currently runs with shell-off rather than inheriting the root shell):

```json
{
  "scripts": {
    "bash-only": { "cmd": "echo $SHELL && echo OK", "shell": "/bin/bash" },
    "plain": { "cmd": "node -v", "shell": false }
  }
}
```

Then:

```bash
getdotenv cmd bash-only
getdotenv cmd plain
```
