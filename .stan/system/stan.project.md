# Project Requirements — get-dotenv

When updated: 2025-09-16T12:40:00Z

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
  - Command alias on parent (cmd):
    - The CLI MUST support two equivalent ways to execute a command:
      1) Subcommand: `cmd [args...]` (positional arguments are joined verbatim),
      2) Option alias on the parent: `-c, --cmd <command...>` (variadic, joined with spaces).
    - The option alias is an ergonomic convenience to ensure npm-run flag routing applies
      to getdotenv rather than the inner shell command. Recommended authoring pattern:
      - Anti-pattern: `"script": "getdotenv echo $FOO"` (flags passed to `npm run script -- ...`
        are applied to `echo`, not `getdotenv`).
      - Recommended: `"script": "getdotenv -c 'echo $FOO'"`, then
        `npm run script -- -e dev` applies `-e` to getdotenv itself.
    - Conflict detection: if both the alias and the `cmd` subcommand are supplied in a single
      invocation, print a helpful message and exit with code 0 (legacy-parity graceful exit).
    - Expansion semantics:
      - Alias value is dotenv-expanded at parse time (unless explicitly disabled in a future
        option); `cmd` positional args are joined verbatim and then resolved via scripts/shell.
    - Scripts and shell precedence is unchanged:
      - `scripts[name].shell` (object form) overrides the global `shell` for that script.
    - Scope: For the new plugin-first CLI, the alias is owned by the cmd plugin and attaches
      to the parent; the old generated CLI retains its original `-c, --command` until a
      deliberate breaking change is published.
  - Shell expansion guidance (procedural):
    - Outer shells (e.g., bash, PowerShell) may expand variables before Node receives argv.
      Document quoting rules and recommend single quotes for `$FOO` on POSIX and single quotes
      on PowerShell to suppress outer expansion. Prefer `"getdotenv -c '...'"` in npm scripts.
    - Future optional safety nets may include `--cmd-file <path>` (read command from file) or
      env-backed alias (`GETDOTENV_CMD`) to avoid outer-shell expansion entirely.

## vNext (additive) — Plugin-first CLI host and Schema-driven config

Purpose
- Introduce a plugin-first CLI host that composes environment-aware commands.
- Centralize options and config validation with Zod schemas (types inferred).
- Provide a richer config system (JSON/YAML/JS/TS + .local) that can serve as an alternative
  to text .env files and optionally supply dynamic variables (JS/TS only).
- Preserve full backward compatibility for getDotenv(), the shipped getdotenv CLI, and the
  generator entrypoint; the new host is additive.

### Architectural split

- Core service (unchanged):
  - getDotenv(options): deterministic env resolution engine.
  - File cascade and dotenv expansion semantics preserved.

- New CLI host (additive):
  - class GetDotenvCli extends Commander.Command.
  - Responsibilities:
    - Discover and layer configs (packaged root → consumer repo global → consumer repo .local → invocation).
    - Validate and normalize options with Zod (raw → resolved).
    - Resolve env with getDotenv and attach a per-invocation context.
    - Expose a plugin API to register commands/subcommands.
  - Context:
    - ctx = { optionsResolved, dotenv, plugins?: Record<string, unknown> }.
    - Produced once per invocation in a preSubcommand hook.
    - If `loadProcess` is true, merge ctx.dotenv into process.env; regardless, plugins can read ctx.dotenv and pass it explicitly to subprocesses.

- Plugin API:
  - definePlugin({ id?, setup(cli), afterResolve?(cli, ctx) }): Plugin.
  - Composition:
    - plugin.use(childPlugin): returns the parent for chaining; the host installs children first, then parent.
  - Setup phase: register commands under the host (e.g., cli.ns('aws').command(...)).
  - AfterResolve phase: initialize clients/secrets using ctx.dotenv or previously-attached plugin state (e.g., AWS creds), then attach to ctx.plugins (namespaced by convention).

- Built-in commands as plugins:
  - Batch command refactored to a plugin (first target).
  - Cmd subcommand may also be offered as a plugin.
  - The shipped getdotenv CLI can be implemented internally by installing these plugins, preserving user-facing behavior.

### Zod schemas (single source of truth)

- Raw vs Resolved:
  - Raw schemas: all fields optional (undefined = inherit).
  - Resolved schemas: service-boundary contracts after defaults/inheritance.
- Schemas:
  - getDotenvOptionsSchemaRaw/Resolved
  - getDotenvCliOptionsSchemaRaw/Resolved (extends programmatic shapes with CLI string fields and splitters)
  - getDotenvCliGenerateOptionsSchemaRaw/Resolved (extends CLI with generator fields)
- Types:
  - export type GetDotenvOptions = z.infer<typeof getDotenvOptionsSchemaResolved>
  - export type GetDotenvCliOptions = z.infer<typeof getDotenvCliOptionsSchemaResolved>
  - export type GetDotenvCliGenerateOptions = z.infer<typeof getDotenvCliGenerateOptionsSchemaResolved>
- Validation policy:
  - New host: strict (schema.parse).
  - Legacy paths: staged “warn” via safeParse → log (no throws) unless explicitly opted-in to strict.

### Config system (additive)

- Packaged root defaults (library root):
  - getdotenv.config.json|yaml|yml|js|ts at package root.
  - No `.local` at package level; no parent above it.
  - Must validate under schemas; missing required defaults are fatal (packaging error).

- Consumer repo configs (project root):
  - Public: getdotenv.config.{json|yaml|yml|js|ts}
  - Local (gitignored): getdotenv.config.local.{json|yaml|yml|js|ts}
  - JSON/YAML: pure data only.
  - JS/TS: may export `dynamic` (GetDotenvDynamic) and optional CLI-level hooks if retained.

- Config-provided values as an alternative to .env files (pure data):
  - vars?: Record<string, string>                (global, public)
  - envVars?: Record<string, Record<string,string>> (env-specific, public)
  - Private values live in .local configs with the same keys (privacy derives from filename).
  - These insert into env overlay with three axes:
    1) kind: dynamic > env > global
    2) privacy: local > public
    3) source: config > file
  - Programmatic dynamic remains the top of the dynamic tier.

- Dynamic from config (JS/TS only):
  - `dynamic?: GetDotenvDynamic` permitted only in JS/TS configs.
  - Order among dynamics (highest → lowest):
    - programmatic dynamic (passed to getDotenv)
    - config dynamic (JS/TS configs; .local still prioritized via privacy within the “config” source)
    - file dynamic (dynamicPath)

### Backward compatibility

- Preserve existing surfaces:
  - getDotenv(options): no signature/semantic changes.
  - Shipped getdotenv CLI: same flags, help text (wording may be clarified), behavior and outputs.
  - generateGetDotenvCli(...) remains available; may be backed internally by the new host but must be functionally identical.
- New host (GetDotenvCli) and plugins: additive; legacy users are unaffected unless they opt in.
- Config formats:
  - Legacy path continues to accept current JSON; loader can be staged to accept YAML/JS/TS + .local as an additive improvement behind a guard.

### Directory layout and exports (proposed)

- src/schema/…               (Zod schemas; raw/resolved pairs)
- src/config/loader.ts       (config discovery: root + project global + .local; JSON/YAML/JS/TS)
- src/env/resolveEnv.ts      (env overlay engine: kind/privacy/source axes; expansion; dynamic overlays)
- src/cliHost/GetDotenvCli.ts (plugin host class; extends Command; context symbol; ns helper)
- src/plugins/batch/…        (batch plugin; exported)
- Exports (future subpaths):
  - “./plugins/batch”: runtime plugin entry and types
  - “./cliHost”: GetDotenvCli and definePlugin helper
  - “./schema”: optional re-exports of schema constants/types for advanced users

### Testing requirements

- Schemas:
  - Round-trip parse of valid configs; informative errors on invalid shapes.
  - Raw → Resolved materialization (inheritance) unit tests.
- Loader:
  - JSON/YAML/JS/TS + .local discovery and precedence (root vs project).
  - JS/TS config dynamic import (direct → esbuild → transpile) and error guidance.
- Env overlay:
  - Three-axis precedence (kind/privacy/source) across combinations (files vs config; public vs local; dynamic vs env vs global).
  - Expansion correctness (progressive; escaped dollars; defaults).
- Plugin host:
  - preSubcommand lifecycle: context created; optional process.env merge respected.
  - afterResolve hooks order (parent → children).
  - Actions access ctx via accessor and operate deterministically.
- Batch plugin:
  - Behavior parity with current subcommand (listing, cwd selection, shell handling, errors).
- Legacy CLI/generator:
  - Behavior remains unchanged; test parity suite continues to pass.

### Documentation requirements

- Update README:
  - Dynamic TS guidance (install esbuild; simple fallback for trivial TS without imports).
  - “Build your own CLI with plugins” quickstart and examples.
  - Explicit env usage in subprocesses (pass ctx.dotenv).
- Add Plugin author guide:
  - definePlugin; setup/afterResolve; composition via .use(); ctx access; namespacing helper.
  - Config sections under config.plugins[pluginId] (optional future).
- Clarify config formats and .local behavior; JSON/YAML vs JS/TS capabilities.