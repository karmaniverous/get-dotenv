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

## Architecture: Services‑first (Ports & Adapters)

Adopt a services‑first architecture with clear ports (interfaces) and thin adapters:

- Ports (service interfaces)
  - Define the core use‑cases and inputs/outputs as pure TypeScript types.
  - Keep business logic in services that depend only on ports; avoid hard process/fs/network dependencies.

- Adapters (CLI, HTTP, worker, GUI, etc.)
  - Map from the edge (flags, HTTP params, env) to service inputs; format service outputs for the edge.
  - Remain thin: no business logic, no hidden state management, no cross‑cutting behavior beyond mapping/presentation.
  - Side effects (fs/process/network/clipboard) live at adapter boundaries or in small leaf helpers wired through ports.

- Composition and seams
  - Wire adapters to services in a small composition layer; prefer dependency injection via ports.
  - Make seams testable: unit tests for services (pure), integration tests for adapters over minimal end‑to‑end slices.

- Code organization
  - Prefer many small modules over large ones (see long‑file guidance).
  - Co‑locate tests with modules for discoverability.

This matches the “Services‑first proposal required” step in the Default Task: propose contracts and adapter mappings before code.

## Testing architecture

Principles

- Pair every non‑trivial module with a test file; co‑locate tests (e.g., `foo.ts` with `foo.test.ts`).
- Favor small, focused unit tests for pure services (ports) and targeted integration tests for adapters/seams.
- Exercise happy paths and representative error paths; avoid brittle, end‑to‑end fixtures unless necessary.

Regression and coverage

- Add minimal, high‑value tests that pin down discovered bugs or branchy behavior.
- Keep coverage meaningful (prefer covering branches/decisions over chasing 100% lines).

## System‑level lint policy

Formatting and linting are enforced by the repository configuration; this system prompt sets expectations:

- Prettier is the single source of truth for formatting (including prose policy: no manual wrapping outside commit messages or code blocks).
- ESLint defers to Prettier for formatting concerns and enforces TypeScript/ordering rules (see repo config).
- Prefer small, automated style fixes over manual formatting in patches.
- Keep imports sorted (per repo tooling) and avoid dead code.

Assistant guidance

- When emitting patches, respect house style; do not rewrap narrative Markdown outside the allowed contexts.
- Opportunistic repair is allowed for local sections you are already modifying (e.g., unwrap manually wrapped paragraphs), but avoid repo‑wide reflows as part of unrelated changes.

## Host typing and help metadata (durable rules)

- Dynamic help storage
  - The CLI host must store dynamic option description callbacks in a host‑owned WeakMap keyed by Commander.Option. Do not mutate Option via symbol properties.
  - The CLI host must store option grouping metadata (for help rendering) in a host‑owned WeakMap keyed by Option. Do not add ad‑hoc properties (e.g., “\_\_group”) to Option.
  - Expose a public API `setOptionGroup(opt: Option, group: string)` on the host so builders/plugins can tag groups without mutating Commander.Option.

- Command creation semantics
  - The host’s createCommand(name?) override must construct child commands via `new GetDotenvCli(name)` explicitly. We do not rely on `(this.constructor as …)` to support subclassing semantics. This keeps help/dynamic behaviors consistent on subcommands.

- Public interface and generics
  - The host class implements the structural public interface GetDotenvCliPublic<TOptions>.
  - The plugin contract is generic on TOptions: `GetDotenvCliPlugin<TOptions>` so afterResolve/setup receive correctly typed ctx/cli when plugins depend on option typing.
  - The `definePlugin()` helper returns a generic `GetDotenvCliPlugin<TOptions>`, preserving plugin type identity.

- Help evaluation typing
  - ResolvedHelpConfig is `Partial<GetDotenvCliOptions> & { plugins: Record<string, unknown> }` so callbacks can read shell/log/loadProcess/exclude\*/warnEntropy without casts.
  - Dynamic help must be evaluated against:
    - The merged CLI options bag in normal flows (preSubcommand/preAction).
    - A defaults‑only merged CLI bag (resolveCliOptions + baseRootOptionDefaults) in the top‑level “-h/--help” flow (no side effects), for parity.

- Commander usage
  - The host must use Commander’s public typed properties (options, commands, parent, flags, description). Avoid “unknown” casts.

# Context window exhaustion (termination rule)

When context is tight or replies risk truncation:

1. Stop before partial output. Do not emit incomplete patches or listings.
2. Prefer a handoff:
   - Output a fresh “Handoff — <project> for next thread” block per the handoff rules.
   - Keep it concise and deterministic (no user‑facing instructions).
3. Wait for the next thread:
   - The user will start a new chat with the handoff and attach archives.
   - Resume under the bootloader with full, reproducible context.
