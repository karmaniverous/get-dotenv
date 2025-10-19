# Project Requirements — get-dotenv

When updated: 2025-10-19T00:00:00Z

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

## Compatibility policy (plugin-first vs generated CLI)

- The plugin-first shipped CLI may evolve without strict backward compatibility.
- The legacy generated CLI (via generateGetDotenvCli) MUST preserve existing flags/behavior for consumers. Changes to flag names or behavior in the plugin-first CLI do not imply changes to the generated CLI unless explicitly coordinated as a breaking change for that surface.

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

- CLI generator defaults resolution (`generateGetDotenvCli`):
  - Merge order (lowest precedence first): base < global < local < custom
- getDotenv programmatic defaults (`resolveGetDotenvOptions`):
  - Merge order: base (from CLI defaults) < local (getdotenv.config.json) < custom
- Per-subcommand merges (nested CLI):
  - Merge order: parent < current (current overrides).
- Behavior: “defaults-deep” semantics for plain objects (no lodash required).

### 3) Variable expansion

- Recursive expansion with defaults:
  - `$VAR[:default]` and `${VAR[:default]}`
- Unknown variables semantics (canonical and documented):
  - Embedded unknown references collapse to an empty substring (e.g., `x${UNKNOWN}y` → `xy`).
  - Isolated unknown references resolve to `undefined`.
  - `:default` is honored in either form (whitespace or bracket).
- Progressive expansion supported where later values may reference earlier results within an object expansion pass (left-to-right by key order).

### 4) Dynamic variables

- `dynamicPath` default-exports a map of:
  - key → function(dotenv, env?) => value, or
  - key → literal value
- Functions evaluate progressively (later keys can depend on earlier).
- Backward compatibility: JS modules remain the simplest path.
- Optional TypeScript support (see “Dynamic TypeScript” below).

### 5) CLI execution and nesting

- The base CLI can execute commands via the default `cmd` subcommand or a parent-level alias owned by the cmd plugin.
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

- The plugin-first CLI exposes a parent-level alias for cmd, typically `-c, --cmd <command...>` (owned by the cmd plugin).
- The legacy generated CLI retains the long-standing root `-c, --command <string>` for compatibility and uses its own command wiring as documented in the generator entry.

#### Shell expansion guidance (procedural)

- Outer shells (e.g., bash, PowerShell) may expand variables before Node receives argv. Document quoting rules and recommend single quotes for `$FOO` on POSIX and single quotes on PowerShell to suppress outer expansion. Prefer `"getdotenv -c '...'"` in npm scripts.

### 6) Config and option interpolation model (global + progressive per-plugin)

Deterministic interpolation of config and CLI string values is required, with an explicit bootstrap boundary and per-plugin progression:

- Phase A (bootstrap, ctx not yet available):
  - Parse CLI and read config with only a minimal bootstrap set used to compose `ctx.dotenv`. Bootstrap keys include: `dotenvToken`, `privateToken`, `env`, `defaultEnv`, `paths` (+ splitters), `vars` (+ splitters/assignor), `exclude*` flags, `loadProcess`, `log`, `shell`, and `dynamicPath`. These MUST NOT depend on `ctx.dotenv`.

- Phase B (compose ctx.dotenv):
  - Dotenv cascade (public/private, global/env) → overlay config sources (packaged → project public → project local) → apply dynamics in order (programmatic → config JS/TS → file `dynamicPath`).

- Phase C (global deep interpolation pass):
  - Deep‑interpolate all remaining CLI/config string options (excluding the bootstrap set) against `envRef = { ...process.env, ...ctx.dotenv }`, with `ctx.dotenv` precedence. Non-strings (numbers/booleans/arrays/objects/functions) are not interpolated.

- Progressive per-plugin interpolation (parent → children):
  - Immediately before invoking each plugin’s `afterResolve`, deep‑interpolate that plugin’s config slice (strings only) against `envRef = { ...ctx.dotenv, ...process.env }`, with `process.env` precedence so upstream plugin env mutations (e.g., AWS credentials) are visible to children. Then validate the slice (Zod; see Validation) and call `afterResolve`.

- Helper surface:
  - Expose `interpolateDeep(obj, envRef)` for plugin authors who wish to bind code-level defaults to env explicitly.

- Determinism:
  - `ctx.dotenv` is composed once and remains immutable post-compose. Progressive behavior flows only through per-plugin just‑in‑time interpolation with the defined precedence and parent→children order.

### 7) Presentation, redaction, and entropy warnings (diagnostics surfaces)

- `--trace [keys...]`: print concise per-key diagnostics (origin: dotenv|parent|unset and final composition). No secrets by default.
- Redaction (masking) — opt-in:
  - `--redact` masks values by matchers at presentation surfaces (`--trace`, `-l/--log`).
  - Defaults: mask common secret patterns (SECRET, TOKEN, KEY, PASSWORD); allow custom patterns via config mirrors.
- Entropy warnings (diagnostic only; warn-only):
  - Optional warnings once-per-key-per-run in `--trace` and `-l/--log`.
  - Gating: minimum length (default 16) and printable ASCII prefilter; compute Shannon entropy (bits/char) and warn when ≥ threshold (default 3.8).
  - Format (single concise stderr line, no value preview):
    ```
    [entropy] key=<NAME> score=<X.XX> len=<N> origin=<dotenv|parent>
    ```
  - Config mirrors and CLI flags are provided (see Roadmap).

### 8) Key aliasing (intentionally NOT in scope)

- Core will NOT implement a general `keyAliases` facility.
- Use config interpolation (JSON/YAML) and JS/TS dynamic modules to derive alias-like values instead:
  - JSON/YAML example: `{"vars":{"STAGE":"${ENV:dev}"}}`
  - JS/TS dynamic example: `dynamic: { STAGE: ({ ENV = '' }) => ENV || 'dev' }`
- Rationale: Interpolation/dynamics are more flexible, keep surface area small, and avoid ambiguous override semantics.

### 9) Spawn environment normalization helper

- Provide an exported helper for child process env composition:
  - `buildSpawnEnv(baseEnv)`: drops `undefined` entries and may normalize TMP/TEMP/HOME per platform where helpful.
- Core forwarders (cmd, batch, aws) use it; downstreams may opt-in for consistent behavior.

## Prioritized roadmap (requirements)

Must-have (near-term):

1. Batch concurrency (opt-in)
   - Flag: `--concurrency <n>` (default 1).
   - Aggregate output by job; buffered flush; end-of-run summary.
   - Optional `--live` for prefixed interleaved streaming.
   - Respect per-script hints: `scripts[name].parallel?: boolean`, `concurrency?: number`.

2. Redacted logging/tracing
   - `--redact` with sensible default masks (SECRET, TOKEN, KEY, PASSWORD); allow custom patterns.
   - Applies to `--trace` and `-l/--log`.

3. Entropy warnings (warn-only diagnostics)
   - Gating (length, printable ASCII); Shannon bits/char threshold (default 3.8).
   - Once-per-key-per-run; applies in `--trace` and `-l/--log`.
   - CLI: `--entropy-warn` (default on) / `--no-entropy-warn`, `--entropy-threshold <bitsPerChar>`, `--entropy-min-length <n>`, `--entropy-whitelist <pattern>` (repeatable).
   - Config mirrors:
     ```json
     {
       "warnEntropy": true,
       "entropyThreshold": 3.8,
       "entropyMinLength": 16,
       "entropyWhitelist": ["^GIT_", "^npm_", "^CI$", "SHLVL"]
     }
     ```

4. Required keys / schema checks (validation)
   - JSON/YAML config: `requiredKeys: string[]` for presence checks.
   - JS/TS config: export a Zod schema for strong validation.
   - Validation runs after the final env is composed (cascade + overlays + dynamics + dynamicPath).
   - `--strict` flag (not `--strict-env`): failures are fatal (non-zero exit); default behavior is warn-only.
   - Config mirror: `strict: boolean`.
   - Help ordering rule: options with short aliases appear before long-form-only options (ensure `--strict` appears after short-aliased flags).

5. Interpolation model (implementation)
   - Implement Phase C global deep interpolation excluding bootstrap keys.
   - Implement progressive per-plugin interpolation and validation pre-`afterResolve`.
   - Export `interpolateDeep(obj, envRef)`.

6. Spawn env normalization helper
   - Export `buildSpawnEnv(baseEnv)`; adopt in cmd/batch/aws forwarders.

Nice-to-have (next):

7. First-party secrets provider plugins (AWS/GCP/Vault).
8. Watch mode for local dev (recompute on file changes; optional command rerun).
9. Enhanced `--trace` diff (origin/value/overridden-by).
10. Troubleshooting doc (common shell pitfalls and quoting recipes).

## Architecture: Plugin-first CLI host and schema-driven config (vNext additive)

Purpose

- Introduce a plugin-first CLI host that composes environment-aware CLIs. It validates options strictly, resolves dotenv context once per invocation, and exposes lifecycle hooks for plugins.

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

- Built-in commands as plugins:
  - Batch and Cmd are provided as plugins (host installs them for the shipped CLI), preserving user-facing behavior.

### Zod schemas (single source of truth)

- Raw vs Resolved:
  - Raw schemas: all fields optional (undefined = inherit).
  - Resolved schemas: service-boundary contracts after defaults/inheritance.

- Schemas:
  - getDotenvOptionsSchemaRaw/Resolved
  - getDotenvCliOptionsSchemaRaw/Resolved (extends programmatic shapes with CLI string fields and splitters)
  - getDotenvCliGenerateOptionsSchemaRaw/Resolved (extends CLI with generator fields)

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
  - JSON/YAML: pure data only; JS/TS: may export `dynamic` (GetDotenvDynamic).

- Config-provided values as an alternative to .env files (pure data):
  - `vars?: Record<string, string>` (global, public)
  - `envVars?: Record<string, Record<string,string>>` (per-env, public)
  - Private values live in .local configs with the same keys (privacy derives from filename).

- Overlay precedence axes:
  1. Kind: dynamic > env > global
  2. Privacy: local > public
  3. Source: project > packaged > base (.env)

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

### CLI help ordering policy (host)

- In help output, options that have short aliases should list before long-form-only options.
- Ensure long-form-only flags introduced by new features (e.g., `--strict`) appear after short-aliased flags for predictable ergonomics.

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
  - When hints are present, they override the global concurrency for that script (e.g., force sequential for heavy tasks like `npm install`).

## AWS base plugin (plugin-first host)

Purpose

- Provide a minimal “auth context” for AWS that other plugins can rely on, without bundling any domain logic (e.g., secrets, SQS, etc.) and without adding an AWS SDK dependency here.
- Works only with the plugin-first host (GetDotenvCli definePlugin). The generated CLI path is explicitly out of scope; existing projects using it will continue to own their AWS wiring until they migrate to the host.

Behavior (no commands)

- Implemented as a base plugin with no commands. It runs once per invocation in `afterResolve`, after dotenv overlays/config have been applied.
- It resolves profile/region, acquires credentials (supporting SSO and non‑SSO profiles), publishes them to process.env when enabled, and mirrors them into `ctx.plugins.aws` for programmatic consumers.

Inputs and where they come from

- Values may come from dotenv (public/local) or getdotenv config (JSON/YAML/TS/JS):
  - Profiles typically live in local dotenv per environment (e.g., `.env.local`, `.env.dev.local`), since they are developer‑machine specifics.
  - Region is non‑secret and may live in public dotenv or config.
  - The plugin reads the already‑resolved dotenv (`ctx.dotenv`) first, then optional config overrides under `plugins.aws`.

Resolution precedence

- Profile:
  1. `plugins.aws.profile` (explicit override in getdotenv config)
  2. `ctx.dotenv['AWS_LOCAL_PROFILE']` (default key)
  3. `ctx.dotenv['AWS_PROFILE']` (fallback key)
  4. undefined (no profile; acquisition is skipped)
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
    Most teams can ignore these and use defaults.

Credentials acquisition (SSO and non‑SSO)

- Env‑first: if `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are already set in `process.env` (e.g., provided by CI or earlier tooling), use them and stop.
- Otherwise, when a `profile` is present and strategy is enabled:
  1. Try CLI export (works for SSO, role, and static profiles on modern AWS CLI):
     `aws configure export-credentials --profile <profile>` (no shell; argv array).
     If it succeeds, use the returned creds.
  2. If export fails:
     - Detect SSO hints for the profile (best‑effort, e.g., `sso_session`, `sso_start_url`).
     - If it appears SSO and `plugins.aws.loginOnDemand === true`, run `aws sso login --profile <profile>` (once), then retry export once.
     - If not SSO (static profile) or login is disabled, fall back to static reads:
       `aws configure get aws_access_key_id/secret_access_key/session_token` with `--profile <profile>`.
- If none of the above produce credentials, leave env untouched and do not publish a credentials bag (plugin is inert).

Publishing outputs

- `setEnv` (default true): when enabled, the plugin writes the resolved values to `process.env`:
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN?`
  - `AWS_REGION` (and optionally `AWS_DEFAULT_REGION` for broader compatibility)
- `addCtx` (default true): publish a programmatic mirror under `ctx.plugins.aws`:
  ```
  {
    profile?: string,
    region?: string,
    credentials?: {
      accessKeyId: string,
      secretAccessKey: string,
      sessionToken?: string
    }
  }
  ```

## SMOZ interop alignment (requirements amendment acceptance)

To finalize the interop contract with SMOZ:

- Validation: Support `requiredKeys` (JSON/YAML) and Zod schema (JS/TS); warn by default; `--strict` makes failures fatal; config mirror `strict`.
- Interpolation: Implement Phase C global pass (excluding bootstrap) and progressive per-plugin interpolation (process.env precedence) before `afterResolve`; export `interpolateDeep`.
- Unknown variables: Preserve documented semantics (embedded → empty substring; isolated → undefined; `:default` honored).
- Redaction & entropy warnings: Implement as specified; apply only at diagnostics surfaces.
- Stage semantics: No core special-casing; derive via interpolation/dynamic in configs; interop examples remain purely config-level.
- Key aliases: Not implemented in core; covered by interpolation/dynamic.
- Spawn env normalization: Export helper and adopt in core forwarders.
- Help ordering: Ensure long-form-only flags (e.g., `--strict`) appear after short-aliased flags in help output.

## Acceptance criteria

- After implementing the roadmap items above:
  - Validation succeeds against composed env; failures warn by default and exit non-zero under `--strict`.
  - Global option/config interpolation works deterministically; bootstrap keys are not retroactively interpolated with ctx.
  - Per-plugin interpolation occurs with process.env precedence, parent → children; slices validate pre-`afterResolve`.
  - Masking is deterministic under `--redact`; entropy warnings are gated and once-per-key.
  - Unknown variable semantics match documentation exactly.
  - No core key alias surface exists; examples use interpolation/dynamic.
  - `buildSpawnEnv(baseEnv)` exported and used by cmd/batch/aws forwarders.
  - CLI help ordering is stable and predictable with short-aliased options listed before long-only flags such as `--strict`.
