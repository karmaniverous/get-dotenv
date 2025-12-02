# Project Requirements — get-dotenv

When updated: 2025-10-16T00:00:00Z

## Overview

This document captures durable, project-level requirements for get-dotenv. It consolidates all product requirements that were previously intermingled in the project prompt. Assistant/policy instructions live in stan.project.md; keep requirements here.

## Product positioning (summary)

Where it shines:

- Deterministic dotenv cascade across paths with public/private/global/env axes.
- Progressive, recursive expansion with defaults; dynamic vars in JS/TS (safe).
- Plugin-first host with once-per-invocation context and typed options.
- Cross-platform command execution (argv-aware shell-off; normalized shells).
- CI-friendly capture and `--trace` diagnostics.

Who will love it:

- Platform/DX/DevOps teams in monorepos.
- Tooling/CLI authors composing domain plugins.
- CI/CD engineers needing deterministic env and observability.
- Cross-platform app teams (Windows + POSIX).

## Mission

Load environment variables from a configurable cascade of dotenv files and/or explicit variables, optionally expand variables recursively, optionally inject into `process.env`, and expose a flexible CLI that can act standalone or as the foundation for child CLIs. Backward compatibility with the existing public API and behaviors is required.

## Compatibility policy

- The plugin-first shipped CLI is the only CLI surface. It may evolve under semantic versioning; breaking changes require a major bump.

## Supported Node/Runtime

- Node: >= 20
- ESM-first package with dual exports:
  - import: dist/index.mjs (types: dist/index.d.mts)
  - require: dist/index.cjs (types: dist/index.d.cts)

## Tooling

- Build: Rollup
- TypeScript: strict; ESM module
- Lint: ESLint v9 (flat config), Prettier formatting
- Test: Vitest with V8 coverage

## Core behaviors (must be preserved)

### 1) Dotenv cascade and naming (public/private/global/env)

- Public globals: `<token>` (e.g., `.env`)
- Public env: `<token>.<env>`
- Private globals: `<token>.<privateToken>`
- Private env: `<token>.<env>.<privateToken>`
- Defaults:
  - `dotenvToken`: `.env`
  - `privateToken`: `local`
  - Paths default to `["./"]` unless explicitly overridden (backward compatible).

### 2) Option layering (defaults semantics, “custom overrides defaults”)

- CLI host defaults resolution:
  - Merge order (lowest precedence first): base < packaged root < project public < project local < custom invocation
- Programmatic defaults (`resolveGetDotenvOptions`):
  - Merge order: base (from CLI defaults) < local (getdotenv.config.\*) < custom invocation
- Per-subcommand merges (nested CLI):
  - Merge order: parent < current (current overrides).
- Behavior: “defaults-deep” semantics for plain objects.

### 3) Variable expansion

- Recursive expansion with defaults:
  - `$VAR[:default]` and `${VAR[:default]}`
- Unknown variables resolve to empty string.
- Progressive expansion supported where later values may reference earlier results.

### 4) Dynamic variables

- `dynamicPath` default-exports a map of:
  - key → function(dotenv, env?) => value, or
  - key → literal value
- Functions evaluate progressively (later keys can depend on earlier).
- Backward compatibility: JS modules remain the simplest path.
- Optional TypeScript support:
  - If a TS loader is not present, auto-bundle with esbuild when available; otherwise attempt a simple transpile fallback for single-file modules without imports; otherwise error with clear guidance.

### 5) CLI execution and nesting

- The base CLI executes commands via the default `cmd` subcommand (parent alias available).
- Shell resolution:
  - If `shell === false`, use Execa plain (no shell).
  - If `shell === true` or `undefined`, use default OS shell:
    - POSIX: `/bin/bash`
    - Windows: `powershell.exe`
  - If `shell` is a string, use that shell.
  - Script-level overrides (`scripts[name].shell`) take precedence for that script.
- Nested CLI:
  - Outer context is passed to inner commands via `process.env.getDotenvCliOptions` (JSON).
  - Within a single process tree (Commander), the current merged options are placed on the command instance as `getDotenvCliOptions` for subcommands.

#### CLI flag standardization (plugin-first host)

- Use “-c, --cmd <command...>” provided by the cmd plugin as the parent-level option alias. The shipped CLI does not include a root “-c, --command” flag.

#### Command alias on parent (cmd)

The CLI MUST support two equivalent ways to execute a command:

1. Subcommand: `cmd [args...]` (positional arguments are joined verbatim),
2. Option alias on the parent: `-c, --cmd <command...>` (variadic, joined with spaces).

Notes and guidance:

- Prefer the alias for npm scripts so flags after `--` are routed to getdotenv:
  - Anti-pattern:
    ```json
    { "scripts": { "script": "getdotenv echo $FOO" } }
    ```
    Flags passed to `npm run script -- ...` are applied to `echo`, not to `getdotenv`.
  - Recommended:
    ```json
    { "scripts": { "script": "getdotenv -c 'echo $FOO'" } }
    ```
    Now `npm run script -- -e dev` applies `-e` to `getdotenv`.
- Scripts and shell precedence is unchanged:
  - `scripts[name].shell` (object form) overrides the global `shell` for that script.
- Scope: The alias is owned by the cmd plugin and attaches to the parent.

#### Shell expansion guidance (procedural)

- Outer shells (e.g., bash, PowerShell) may expand variables before Node receives argv. Document quoting rules and recommend single quotes for `$FOO` on POSIX and single quotes on PowerShell to suppress outer expansion. Prefer `"getdotenv -c '...'"` in npm scripts.

## Dynamic option descriptions (help)

The host MUST support dynamic help text that reflects the resolved configuration (including overlays and plugin config) without side effects.

- APIs on GetDotenvCli:
  - `dynamicOption(flags, (resolved) => string, parser?, defaultValue?)` — chainable, mirrors `command.option`, but the second parameter is a description function that receives a read‑only ResolvedConfig computed for help rendering.
  - `createDynamicOption(flags, (resolved) => string, parser?, defaultValue?)` — factory that returns a Commander Option instance carrying the dynamic description; useful when building then adding via `addOption`.
- ResolvedConfig shape for description functions:
  - Top‑level keys are the resolved get‑dotenv options (post overlays and dynamic).
  - `plugins` bag contains merged, interpolated per‑plugin config slices keyed by plugin id. Config string leaves are interpolated against `{ ...dotenv, ...process.env }`.
- Help rendering behavior:
  - Top‑level `-h/--help`: the host computes a read‑only resolved config with overlays and dynamic enabled (no logging; `loadProcess=false`; no env mutation), evaluates all dynamic descriptions, then prints help and returns without `process.exit`.
  - `help <cmd>`: after normal pre‑subcommand resolution, the host refreshes dynamic descriptions and prints help. Both paths produce identical help text.
- Subcommand typing and DX:
  - The host overrides `createCommand()` so subcommands are instances of the GetDotenvCli subclass (not plain Commander), enabling `ns().dynamicOption(...)` to chain naturally alongside native `option(...)`.
- Consistency requirement:
  - Root flags that display defaults in help (e.g., shell, loadProcess, exclude\* families, log, entropy‑warn) MUST be authored with `dynamicOption(...)` so they use the same resolved source of truth and semantics as plugin options. Static text remains acceptable where no default needs to be displayed.

## Host root options builder (attachRootOptions)

- The root options builder is host‑only and typed: `(program: GetDotenvCli, defaults?: Partial<RootOptionsShape>)`.
- It MUST use `createDynamicOption/dynamicOption` for any flag whose help displays an effective default value.
- The builder MUST NOT rely on duck‑typing fallbacks for non‑host Command instances.

## Prioritized roadmap (requirements)

Must-have (near-term):

1. Batch concurrency (opt-in)
   - Flag: `--concurrency <n>` (default 1).
   - Aggregate output by job; buffered flush; end-of-run summary.
   - Optional `--live` for prefixed interleaved streaming.
   - Respect per-script hints: `scripts[name].parallel?: boolean`, `concurrency?: number`.

2. Redacted logging/tracing
   - `--redact` with default masks (SECRET, TOKEN, KEY, PASSWORD); allow custom patterns.
   - Apply to `-l/--log` and `--trace`.
   - Entropy warnings (warning-only; no masking):
     - Purpose: Provide a low-risk signal for likely secrets without altering values or masking by default. Keeps observability high while nudging safer workflows.
     - Surfaces:
       - `--trace`: emit an extra stderr line per affected key (once per key per run).
       - `-l/--log`: same warning policy (values are printed).
     - Trigger gating:
       - Evaluate only when gated by length ≥ 16 and printable ASCII.
       - Compute Shannon entropy; warn when bits/char ≥ 3.8.
     - Warning format (no value preview):
       ```
       [entropy] key=<NAME> score=<X.XX> len=<N> origin=<dotenv|parent|unset>
       ```
     - No redaction:
       - Diagnostic-only. Never alters the environment or output; coexists with deterministic masking (names/regexes) as a separate, opt-in feature.
     - Noise control:
       - Once-per-key-per-run to avoid spam.
     - CLI flags:
       - `--entropy-warn` / `--entropy-warn-off`
       - `--entropy-threshold <bitsPerChar>`
       - `--entropy-min-length <n>`
       - `--entropy-whitelist <pattern>` (repeatable) to suppress by key name.
     - Config mirrors:
       ```json
       {
         "warnEntropy": true,
         "entropyThreshold": 3.8,
         "entropyMinLength": 16,
         "entropyWhitelist": ["^GIT_", "^npm_", "^CI$", "SHLVL"]
       }
       ```

3. Required keys / schema checks
   - Validate final env against a declared keys list or schema (JSON/YAML/TS).
   - Fail-fast with helpful diagnostics when `--strict` is set; otherwise warn.

4. Shell completion
   - Generate bash/zsh/pwsh completions for flags/subcommands.

Nice-to-have (next):

5. First-party secrets provider plugins (AWS/GCP/Vault).
6. Watch mode for local dev (recompute on file changes; optional command rerun).
7. Enhanced `--trace` diff (origin/value/overridden-by).
8. Troubleshooting doc (common shell pitfalls and quoting recipes).

## Architecture: Plugin-first CLI host and schema-driven config

Purpose

- Compose environment-aware CLIs. Validate options, resolve dotenv context once per invocation, and expose lifecycle hooks for plugins.

### Architectural split

- Core service (unchanged):
  - getDotenv(options): deterministic env resolution engine.
  - File cascade and dotenv expansion semantics preserved.

- CLI host:
  - class GetDotenvCli extends Commander.Command.
  - Responsibilities:
    - Discover and layer configs (packaged root → consumer repo public → consumer repo .local → invocation).
    - Validate and normalize options with Zod (raw → resolved).
    - Resolve env with getDotenv and attach a per-invocation context.
    - Expose a plugin API to register commands/subcommands.
  - Context:
    - `ctx = { optionsResolved, dotenv, plugins?: Record<string, unknown> }`.
    - Produced once per invocation in a preSubcommand hook.
    - If `loadProcess` is true, merge ctx.dotenv into process.env; regardless, plugins can read ctx.dotenv and pass it explicitly to subprocesses.

- Plugin API:
  - `definePlugin({ id?, setup(cli), afterResolve?(cli, ctx) })`.
  - Composition:
    - `plugin.use(childPlugin)` returns the parent; the host installs children pre-order (parent → children).
  - Setup phase: register commands/subcommands under the host (e.g., `cli.ns('aws').command(...)`).
  - AfterResolve phase: initialize clients/secrets using ctx.dotenv or previously-attached plugin state, then attach to `ctx.plugins` (optional; namespaced by convention).

- Built-in commands as plugins:
  - batch
  - cmd
  - aws (session bootstrap + optional forwarding)
  - init
  - demo (educational)
  - The shipped getdotenv CLI installs these plugins, preserving user-facing behavior.

### Zod schemas (single source of truth)

- Raw vs Resolved:
  - Raw schemas: all fields optional (undefined = inherit).
  - Resolved schemas: service-boundary contracts after defaults/inheritance.
- Schemas:
  - getDotenvOptionsSchemaRaw/Resolved
  - getDotenvCliOptionsSchemaRaw/Resolved (extends programmatic shapes with CLI string fields and splitters)
- Types:
  - `export type GetDotenvOptions = z.infer<typeof getDotenvOptionsSchemaResolved>`
  - `export type GetDotenvCliOptions = z.infer<typeof getDotenvCliOptionsSchemaResolved>`
- Validation policy:
  - Host: strict (schema.parse) by default; tolerant safeParse may be used where non-fatal.

### Config system

- Packaged root defaults (library root):
  - getdotenv.config.json|yaml|yml|js|ts at package root.
  - No `.local` at package level; no parent above it.
  - Must validate under schemas; missing required defaults are fatal (packaging error).

- Consumer repo configs (project root):
  - Public: `getdotenv.config.{json|yaml|yml|js|ts}`
  - Local (gitignored): `getdotenv.config.local.{json|yaml|yml|js|ts}`
  - JSON/YAML: pure data only.
  - JS/TS: may export `dynamic` (GetDotenvDynamic) and (optionally) a schema.

- Config-provided values as an alternative to .env files (pure data):
  - `vars?: Record<string, string>` (global, public)
  - `envVars?: Record<string, Record<string,string>>` (per-env, public)
  - Private values live in `.local` configs with the same keys (privacy derives from filename).
  - These insert into env overlay with three axes:
    1. kind: `dynamic` > `env` > `global`
    2. privacy: `local` > `public`
    3. source: `project` > `packaged` > `base`
  - Programmatic dynamic remains the top of the dynamic tier.

- Dynamic from config (JS/TS only):
  - `dynamic?: GetDotenvDynamic`
  - Order among dynamics (highest → lowest):
    - programmatic dynamic (passed to getDotenv)
    - config dynamic (JS/TS configs; .local prioritized via privacy)
    - file dynamic (`dynamicPath`)

### Backward compatibility

- Preserve existing surfaces:
  - getDotenv(options): no signature/semantic changes.
  - Shipped getdotenv CLI: flags/help/behavior live solely on the host-based CLI.

## Concurrency policy (design)

- Default execution for `batch` is sequential for safety and legibility.
- Concurrency is explicit and opt-in:
  - `--concurrency <n>` enables a pool (n workers). Default remains 1.
  - When `n > 1`, force capture and aggregate per-job output (buffer, then flush).
  - Write full logs per job to `.tsbuild/batch/<run-id>/<sanitized-path>.{out,err}.log`.
  - Provide `--live` to stream interleaved updates with `[cwd]` prefixes (optional).
- Failure policy:
  - Honor `--ignore-errors`. When false (default), bail early on first failure or stop launching new jobs; print a summary.
  - When true, run all and summarize at the end.
- Per-script hints:
  - Extend scripts entries with `parallel?: boolean` and `concurrency?: number`.
  - When hints are present, they override the global concurrency for that script.

## AWS base plugin (plugin-first host)

Purpose

- Provide a minimal “auth context” for AWS that other plugins can rely on, without bundling any domain logic and without adding an AWS SDK dependency here.
- Works with the plugin-first host (GetDotenvCli).

Behavior (session bootstrap + optional forwarding)

- It resolves profile/region, acquires credentials (supporting SSO and non‑SSO profiles), publishes them to process.env when enabled, and mirrors them into `ctx.plugins.aws`. It also provides an `aws` subcommand to optionally forward to the AWS CLI with explicit env injection and normalized shell semantics.

Inputs and where they come from

- Values may come from dotenv (public/local) or getdotenv config (JSON/YAML/TS/JS):
  - Profiles typically live in local dotenv per environment (e.g., `.env.local`, `.env.dev.local`).
  - Region is non‑secret and may live in public dotenv or config.
  - The plugin reads the already‑resolved dotenv (`ctx.dotenv`) first, then optional config overrides under `plugins.aws`.

Resolution precedence

- Profile:
  1. `plugins.aws.profile` (explicit override in getdotenv config)
  2. `ctx.dotenv['AWS_LOCAL_PROFILE']` (default key)
  3. `ctx.dotenv['AWS_PROFILE']` (fallback key)
  4. undefined
- Region:
  1. `plugins.aws.region` (explicit override)
  2. `ctx.dotenv['AWS_REGION']` (default key)
  3. If a profile was resolved and region is still missing, best‑effort `aws configure get region --profile <profile>`
  4. `plugins.aws.defaultRegion` (optional fallback)
  5. undefined
- Advanced (optional) key renames:
  - `plugins.aws.profileKey` (default `'AWS_LOCAL_PROFILE'`)
  - `plugins.aws.profileFallbackKey` (default `'AWS_PROFILE'`)
  - `plugins.aws.regionKey` (default `'AWS_REGION'`)

Credentials acquisition (SSO and non‑SSO)

- Env‑first: if `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are already set, use them and stop.
- Otherwise, when a `profile` is present and strategy is enabled:
  1. Try CLI export (modern AWS CLI):
     `aws configure export-credentials --profile <profile>` (argv array, shell-off).
  2. If export fails:
     - Detect SSO hints (e.g., `sso_session`).
     - If SSO and `loginOnDemand === true`, run `aws sso login --profile <profile>` once, then retry export once.
     - Otherwise fall back to static reads:
       `aws configure get aws_access_key_id/secret_access_key[/aws_session_token] --profile <profile>`.

Publishing outputs

- `setEnv` (default true): write region/credentials to `process.env` (and `AWS_DEFAULT_REGION` if unset).
- `addCtx` (default true): mirror `{ profile?, region?, credentials? }` to `ctx.plugins.aws`.

## Codebase constraints (v6 and beyond)

- No generator path:
  - The codebase contains only the plugin-first host and shipped plugins. There is no “generated CLI” implementation, exports, tests, or documentation.
- Host-only root options builder:
  - `attachRootOptions` is provided for GetDotenvCli instances only and uses dynamic descriptions for any flag that displays an effective default.
- Help semantics:
  - Top-level `-h/--help` and `help <cmd>` produce identical dynamic help text for the same inputs and never mutate the environment or exit the process (host may exit on other code paths as usual).
