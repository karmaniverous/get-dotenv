---
title: Generated CLI
---

# Generated CLI

`get-dotenv` can power a standalone, generated CLI that you embed in your projects. This approach is great when you want a fixed command surface with minimal code in the host repository.

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

```bash
# TypeScript config with a dynamic example; CLI named "toolbox"
npx getdotenv init ./apps/toolbox \
  --config-format ts \
  --cli-name toolbox
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

### Validation and diagnostics

The generated CLI uses the same always-on loader and post-composition checks as the plugin-first host:

- Validation (once after Phase C): declare JSON/YAML `requiredKeys` or provide a JS/TS Zod `schema`. Warnings are printed by default; pass `--strict` (or set `strict: true`) to fail the run on issues.
- Diagnostics (presentation-only): enable `--redact` with optional `--redact-pattern <regex...>` to mask secret-like keys in `--trace` and `-l/--log` outputs. Entropy warnings are on by default and can be tuned via:
  - `--entropy-warn` / `--entropy-warn-off`
  - `--entropy-threshold <n>`
  - `--entropy-min-length <n>`
  - `--entropy-whitelist <regex...>`
- Tracing and capture: use `--trace [keys...]` for per-key origin lines and `--capture` (or `GETDOTENV_STDIO=pipe`) for CI-friendly buffered output.

See also:

- [Config Files & Overlays](./config.md)
- [Shell Execution Behavior](./shell.md)
- [Plugin-First Host](./authoring/index.md)
