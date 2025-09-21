---
title: Generated CLI
---

# Generated CLI

get-dotenv can power a standalone, generated CLI that you embed in your projects. This approach is great when you want a fixed command surface with minimal code in the host repository.

## When to use the generated CLI

- You prefer a thin wrapper with a stable command set and defaults baked into a config file.
- You don’t need to compose custom commands or plugins beyond the built-in batch/cmd flows.
- You want to share a simple, consistent CLI across multiple repos without adding code to each.

## When the plugin host is a better fit

The plugin-first host (`GetDotenvCli`) resolves dotenv context once per invocation and provides:

- Composable plugins with clear lifecycles (setup, afterResolve).
- Deterministic env injection into subprocesses (and `--trace` diagnostics).
- Config overlays (JSON/YAML/JS/TS) that apply before plugins run.
- A single, typed options model with strict validation.

If you need custom commands, richer composition, or programmatic hooks, prefer the plugin host. You can still expose the same ergonomics as a CLI while enjoying better structure and observability.

## Getting started with the generated CLI

The generator produces a `Command` wired with the base options, a default `cmd` subcommand, and the `batch` subcommand. You can set defaults from a `getdotenv.config.json` and forward variables to subprocesses.

Example:

```bash
# JSON config + .local variant, and a CLI skeleton named "acme"
npx getdotenv init . \
  --config-format json \
  --with-local \
  --cli-name acme \
  --force
```

This scaffolds:

- `getdotenv.config.json` (and `.local` variant if requested)
- A CLI skeleton at `src/cli/<name>/index.ts`

Inside npm scripts, prefer the parent-level alias form to ensure flags apply to getdotenv rather than the inner shell command:

```json
{
  "scripts": {
    "env-print": "getdotenv -c 'node -e \"console.log(process.env.APP_SETTING ?? \\\"\\\")\"'"
  }
}
```

Then:

```bash
npm run env-print -- -e dev
```

See also:

- Plugin host overview: the “Plugin-first host” guide for building domain plugins and composing commands on top of get-dotenv.
- Shell and quoting: the “Shell execution behavior” guide for cross-platform quoting and capture tips.
- Config loader and overlays: the “Config files and overlays” guide for JSON/YAML/JS/TS sources and precedence.
