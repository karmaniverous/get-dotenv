# Project Requirements — get-dotenv

When updated: 2025-09-15T00:00:00Z

## Mission

Load environment variables from a configurable cascade of dotenv files and/or
explicit variables, optionally expand variables recursively, optionally inject
into `process.env`, and expose a flexible CLI that can act standalone or as the
foundation for child CLIs. Backward compatibility with the existing public API
and behaviors is required.

## Supported Node/Runtime

- Node: >= 22.19
- ESM-first package with dual exports:
  - import: dist/index.mjs (types: dist/index.d.mts)
  - require: dist/index.cjs (types: dist/index.d.cts)

## Tooling

- Build: Rollup
- TypeScript: strict; ESM module
- Lint: ESLint v9 (flat config), Prettier formatting
- Test: Vitest with V8 coverage

## Core behaviors (must be preserved)

1) Dotenv cascade and naming (public/private/global/env)
   - Public globals: `<token>` (e.g., `.env`)
   - Public env: `<token>.<env>`
   - Private globals: `<token>.<privateToken>`
   - Private env: `<token>.<env>.<privateToken>`
   - Defaults:
     - `dotenvToken`: `.env`
     - `privateToken`: `local`
     - Paths default to `["./"]` unless explicitly overridden (backward compatible).

2) Option layering (defaults semantics, “custom overrides defaults”)
   - CLI generator defaults resolution (`generateGetDotenvCli`):
     - Merge order (lowest precedence first): base < global < local < custom
   - getDotenv programmatic defaults (`resolveGetDotenvOptions`):
     - Merge order: base (from CLI defaults) < local (getdotenv.config.json) < custom
   - Per-subcommand merges (nested CLI):
     - Merge order: parent < current (current overrides).
   - Behavior: “defaults-deep” semantics for plain objects (no lodash required).

3) Variable expansion
   - Recursive expansion with defaults:
     - `$VAR[:default]` and `${VAR[:default]}`
   - Unknown variables resolve to empty string.
   - Progressive expansion supported where later values may reference earlier results.

4) Dynamic variables
   - `dynamicPath` default-exports a map of:
     - key → function(dotenv, env?) => value, or
     - key → literal value
   - Functions evaluate progressively (later keys can depend on earlier).
   - Backward compatibility: JS modules remain the simplest path.
   - Optional TypeScript support (see “Dynamic TypeScript” below).

5) CLI execution and nesting
   - The base CLI can execute commands via `--command` or the default `cmd` subcommand.
   - Shell resolution:
     - If `shell === false`, use Execa plain (no shell).
     - If `shell === true` or `undefined`, use default OS shell:
       - POSIX: `/bin/bash`
       - Windows: `powershell.exe`
     - If `shell` is a string, use that shell.
     - Script-level overrides (`scripts[name].shell`) take precedence for that script.
   - Nested CLI:
     - Outer context is passed to inner commands via `process.env.getDotenvCliOptions` (JSON).
     - Within a single process tree (Commander), the current merged options are placed
       on the command instance as `getDotenvCliOptions` for subcommands.
