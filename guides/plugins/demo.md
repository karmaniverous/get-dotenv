---
title: Demo plugin
---

# Demo plugin

An educational plugin that showcases:

- Accessing the resolved dotenv context (`cli.getCtx()`).
- Executing child processes with explicit env injection.
- Resolving commands and shell overrides via the shared helpers.
- Using `--trace` diagnostics.

## Commands

- `demo ctx` — Print a summary of the current dotenv context (counts + sample).
- `demo run --print KEY` — Print a single dotenv value via a shell‑off child.
- `demo script [command...]` — Resolve and execute a command via `scripts` and
  per‑script shell overrides.

## Example

```bash
getdotenv demo run --print APP_SETTING
getdotenv --trace ENV_SETTING demo script node -e "console.log(process.env.ENV_SETTING ?? '')"
```

These examples run with explicit env injection (`{ ...process.env, ...ctx.dotenv }`)
so exclusions (e.g., `--exclude-private`) are honored predictably.

