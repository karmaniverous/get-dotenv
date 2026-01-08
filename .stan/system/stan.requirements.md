# Project Requirements — get-dotenv

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
- Note: The Commander generics refactor (see Strong typing and generics → J) is intentionally allowed to introduce breaking type changes in favor of significantly better downstream inference. Plan a major bump as needed.
- The package currently re-exports `z` from `zod` for convenience, but this re-export is deprecated; docs and templates must import `z` from `zod` directly. Removal is planned for v7 (next major).

## Supported Node/Runtime

- Node: >= 20
- ESM-only package:
  - import: dist/index.mjs (types: dist/index.d.ts)

## Tooling

- Build: Rollup
- TypeScript: strict; ESM module; exactOptionalPropertyTypes on
- Lint: ESLint v9 (flat config), Prettier formatting
- Test: Vitest with V8 coverage
- Commander typings: prefer and import from '@commander-js/extra-typings' across runtime and types. Treat the vendored .stan/imports/extra-typings/index.d.ts as the canonical reference for inference when reasoning in this repo.

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

There are two related layers of defaults in the system:

- Root CLI options (host/generator flows): precedence for all root options is:

  CLI flags > getdotenv.config.\* rootOptionDefaults (packaged/public < project/public < project/local) > createCli rootOptionDefaults > baseRootOptionDefaults

  Notes:
  - rootOptionDefaults is a single object that mirrors the CLI "stringly" surface (Partial<RootOptionsShape>), with families collapsed (e.g., `log`, not `log-off`). This is merged by source precedence:
    - packaged/public (host package root) < project/public (local repo) < project/local (local repo, private).
  - The defaults stack is built once per run and used both for actual runs and for help-time labels; CLI flags remain the highest precedence layer at runtime.
  - A createCli embedding may also supply root defaults (createCli({ rootOptionDefaults })), which are applied above baseRootOptionDefaults and below any rootOptionDefaults coming from config discovery (packaged/public and project/public/local).

- Programmatic `resolveGetDotenvOptions` (library callers):
  - Merge order remains: base (from CLI defaults) < custom invocation (no automatic read of local config files). Programmatic callers can read and apply config themselves if desired; the host path (CLI/generator) is responsible for config overlays and root defaults.

Per-subcommand merges (nested CLI):

- Merge order remains: parent < current for CLI flags; the default stack for root options still comes from base < createCli < config (packaged/public < project/public < project/local), with parent-provided options marshaled through the parentJson bag (above defaults, below current).

Behavior:

- “defaults-deep” semantics for plain objects are preserved wherever deep merges occur (root defaults, config slices, plugin slices).

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
- Dynamic precedence (A2): config dynamic \< programmatic dynamic \< `dynamicPath`, with last-writer-wins on key collisions.
- When `dynamicPath` is provided, it MUST be evaluated even when programmatic `dynamic` is also provided.
- `excludeDynamic` MUST disable all dynamic sources (config dynamic, programmatic `dynamic`, and `dynamicPath`).
- Backward compatibility: JS modules remain the simplest path.
- Optional TypeScript support:
  - If a TS loader is not present, auto-bundle with esbuild when available; otherwise attempt a simple transpile fallback for single-file modules without imports; otherwise error with clear guidance.

### 6) Dotenv provenance metadata (host ctx)

- The host invocation context (`GetDotenvCliCtx`) MUST carry a dotenv provenance mapping describing the provenance of keys in `ctx.dotenv`.
- Provenance MUST be descriptor-only (no value payloads).
- Provenance MUST preserve override history per key (including cases where a value from a lower-precedence source is later overridden by a higher-precedence source).
- Provenance MUST include keys that were observed in lower layers but later explicitly unset by a higher-precedence layer.
- Provenance MUST NOT include origins from the parent `process.env` (parent env is not part of dotenv provenance).
- Provenance collection MUST be a first-class concern during overlay/dynamic application (no post-hoc reconstruction).

Provenance structure:

- Provenance MUST be represented as a mapping: `Record<string, DotenvProvenanceEntry[]>`.
- The array value for a key MUST be ordered in ascending precedence (lower to higher); the effective provenance is the last entry in the array.
- Each entry MUST include:
  - `kind: 'file' | 'config' | 'vars' | 'dynamic'`
  - `op: 'set' | 'unset'` (explicit unsets are represented without storing values)

Unset behavior:

- When a higher-precedence layer unsets a key, the provenance MUST record an `op: 'unset'` entry for that key.
- When a key is explicitly unset, runtime behavior MUST remain unchanged (the key may remain present with value `undefined`; it is not required to be deleted from the object).

Minimum descriptor fields:

- For `kind: 'file'`, provenance entries MUST include:
  - `scope: 'global' | 'env'`
  - `privacy: 'public' | 'private'`
  - `env?: string` (required when `scope === 'env'`)
  - `path: string` (the corresponding `paths[]` entry as provided by the user/CLI)
  - `file: string` (computed dotenv filename token, e.g., `.env`, `.env.dev`, `.env.local`, `.env.dev.local`)
- For `kind: 'config'`, provenance entries MUST include:
  - `scope: 'global' | 'env'` (global = config `vars`; env = config `envVars[env]`)
  - `privacy: 'public' | 'private'` (config `local` MUST be represented as `privacy: 'private'` on this axis)
  - `env?: string` (required when `scope === 'env'`)
  - `configScope: 'packaged' | 'project'`
  - `configPrivacy: 'public' | 'local'`
- For `kind: 'vars'`, provenance entries MUST represent explicit programmatic/CLI vars overrides, and MUST be ordered by the same overall precedence model as other layers.
- For `kind: 'dynamic'`, provenance entries MUST include:
  - `dynamicSource: 'config' | 'programmatic' | 'dynamicPath'`
  - `dynamicPath?: string` (when `dynamicSource === 'dynamicPath'`, record the path as provided by the caller/CLI; do not resolve to an absolute path for provenance)

Descriptor “as provided” policy:

- Provenance MUST prefer “as provided” descriptors over resolved absolute paths wherever applicable (for example, the `path` field for file provenance and the `dynamicPath` field for dynamic-path provenance).

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

#### Plugin mount creation and namespaces (host‑created; ns required)

Goal: deterministic composition, collision‑free sibling mounts, and consumer control over displayed names.

Required model

- Every plugin declares a default namespace ns: string (non‑empty). This is the command name used when the plugin is mounted.
- The consumer MAY override the namespace at composition time:
  - `program.use(plugin, { ns: 'deploy-api' })`
  - `parent.use(child, { ns: 'whoami2' })`
- Sibling uniqueness is enforced at install time. If two siblings resolve to the same final segment under the same parent, the host throws a clear error, for example:
  - `Duplicate namespace 'deploy' under 'tools'. Override via .use(plugin, { ns: '...' }).`

Where mounts are created

- The host always creates the mount: `const mount = parent.ns(effectiveNs)` and then calls `setup(mount)`.
- Plugin setup does not return the mount and returns `Promise<void> | void` only.
- This hard‑pivot guarantees the consumer’s override is honored and simplifies collision handling.

Breaking API changes (acceptable)

- definePlugin<TOptions, TConfig>() returns a plugin object that includes instance-bound helpers and is represented by the alias `PluginWithInstanceHelpers<TOptions, TConfig>`.
- definePlugin requires ns (string) in the spec for every plugin.
- Plugin setup return type becomes `void | Promise<void>`; plugins that previously returned a mount must be updated to use the provided mount parameter and return nothing.
- The authoring surface no longer supports “return a mount from setup” as a way to guide attachment.

id becomes purely internal

- The public concept of id is removed. Internally, the host uses a unique Symbol per plugin instance (e.g., for WeakMap stores).
- Public config/help keys are based on the realized mount path, not id.

Config/help keyed by realized path

- Config mapping: `config.plugins['aws']` or `config.plugins['aws/whoami']` refers to the mount path (root alias excluded).
- Overriding a namespace (or nesting) changes the config/help key to match the CLI surface the user sees.
- Trade‑off: renaming the mount path breaks the config key by design. This is intentional and aligns with composition as the source of truth.

Help grouping policy

- Use leaf‑only names in grouped help headings (e.g., “Plugin options — whoami”). The realized path is used internally for lookup, but not displayed in group headings.
- In the rare event of ambiguous leafs under the same parent, the installer’s sibling‑uniqueness guard prevents ambiguous groupings by requiring a namespace override.

Consumer override API

- Minimal and future‑proof:
  - `.use(plugin, { ns: '...' })`
  - The override object may be extended later (e.g., `groupLabel`) without breaking the API.

Edge cases

- Plugins that attach only parent‑level options (no subcommand) still receive a mount for grouping/config (e.g., `cmd`) and may attach options to `mount.parent` for parent aliases. This avoids conflicts while keeping grouping clear.

#### Namespace collision and override examples

- Sibling collision (error):
  - Composition:
    ```
    program
      .use(deployPlugin())    // ns: "deploy"
      .use(deployPlugin());   // ns: "deploy"
    ```
  - Error at install:
    ```
    Duplicate namespace 'deploy' under 'getdotenv'. Override via .use(plugin, { ns: '...' }).
    ```
- Consumer override to disambiguate:
  - Composition:
    ```
    program
      .use(deployPlugin(), { ns: 'deploy-api' })
      .use(deployPlugin(), { ns: 'deploy-web' });
    ```
  - Help grouping (leaf only):
    ```
    Plugin options — deploy-api
    Plugin options — deploy-web
    ```
- Path‑keyed config
  - Given composition:
    ```
    program
      .use(awsPlugin(), { ns: 'aws' })
      .use(awsWhoamiPlugin(), { ns: 'whoami' });
    ```
  - Config keys:
    ```
    plugins:
      aws:
        # parent config
      aws/whoami:
        # child config
    ```

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

## Strong typing and generics (durable requirements)

Improve inference and type precision without changing runtime behavior. All items below are type-level only unless explicitly noted.

### A) defaultsDeep: intersection-based overloads (typed heads)

Goal: callers that layer heterogeneous shapes should not need casts; merged type should be inferred as an intersection of layer shapes.

- Keep implementation unchanged (variadic merge with plain-object semantics).
- Add type-only overloads for up to 4–5 layers using intersections.
- Preserve exactOptionalPropertyTypes: ignore `undefined` (do not overwrite).

Example signatures (illustrative; final set up to 5 layers):

```ts
export function defaultsDeep<A extends object>(a?: Partial<A>): A;

export function defaultsDeep<A extends object, B extends object>(
  a?: Partial<A>,
  b?: Partial<B>,
): A & B;

export function defaultsDeep<
  A extends object,
  B extends object,
  C extends object,
>(a?: Partial<A>, b?: Partial<B>, c?: Partial<C>): A & B & C;

// add 4th/5th layer overloads similarly
```

Acceptance:

- Existing call sites (e.g., options/base < local < custom merges) infer intersections without `as unknown as …` casts.
- No runtime behavior or semantics change.

### B) dotenvExpandAll: preserve key set generically and accept Readonly inputs

Goal: retain key specificity and accept readonly maps at call sites.

Signature:

```ts
export function dotenvExpandAll<T extends ProcessEnv | Readonly<ProcessEnv>>(
  values: T,
  options?: { ref?: ProcessEnv; progressive?: boolean },
): { [K in keyof T]: string | undefined } & ProcessEnv;
```

Acceptance:

- Callers indexing known keys do not need extra casts.
- Passing `as const`/readonly literals compiles without friction.
- Progressive behavior unchanged.

### C) Scripts table: generic shell type propagation + helper

Goal: unify on a single generic Scripts<TShell> across host/services/plugins and preserve TShell in authored tables.

- Public type:
  ```ts
  export type Scripts<TShell extends string | boolean = string | boolean> =
    Record<string, string | { cmd: string; shell?: TShell | undefined }>;
  ```
- Functions that resolve command/shell use generic `TShell`:
  ```ts
  export function resolveShell<TShell extends string | boolean>(
    scripts: Scripts<TShell> | undefined,
    command: string,
    shell: TShell | undefined,
  ): TShell | false;
  ```
- Helper for authored tables:
  ```ts
  export const defineScripts =
    <TShell extends string | boolean>() =>
    <T extends Scripts<TShell>>(t: T) =>
      t;
  ```

Acceptance:

- Inference propagates a concrete shell (e.g., `'/bin/zsh'`) through helpers.
- No widening to `URL` in intermediate helpers.

### D) Plugin config typing and access (instance‑bound; no by‑id)

Goal: eliminate by‑id config lookups; provide first‑class, instance‑bound access with strong typing.

- definePlugin<TOptions, TConfig>() returns a plugin object that includes instance-bound helpers and is represented by the alias `PluginWithInstanceHelpers<TOptions, TConfig>`.
- `PluginWithInstanceHelpers<TOptions, TConfig>` is the canonical helper type and includes:
  - `readConfig(cli): TConfig | undefined` — resolves this instance’s validated, interpolated config slice. Host stores slices per plugin instance (WeakMap), not by id.
  - `createPluginDynamicOption(flags, (bag, cfg: TConfig|undefined) => string)` — a plugin‑bound dynamic option helper that injects the plugin’s TConfig into help callbacks.
- Public API removal:
  - Remove `readPluginConfig<T>(cli, id: string)` from the public surface.
  - Remove public exposure of `ctx.pluginConfigs`. Plugin runtime state (if any) may remain under `ctx.plugins` at the plugin’s discretion, but config lookup is instance‑bound only.
- Duplicate same‑level command names are disallowed:
  - The host must guard early: adding a subcommand whose name collides with an existing sibling should throw a clear error (Commander may also guard; we prefer explicit diagnostics).
- Cross‑plugin introspection:
  - Not supported and not needed. Plugins (or the root) access only their own config via `plugin.readConfig(cli)`.

Acceptance:

- Call sites use:
  ```ts
  const p = myPlugin();
  program.use(p);
  const cfg = p.readConfig(program);
  ```
- Dynamic help for plugins uses `plugin.createPluginDynamicOption` or an inline `plugin.readConfig(cli)` inside the callback.
- No by‑id examples or helpers remain in docs or code.

### E) defineDynamic: key-aware vars bag

Goal: improve inference inside dynamic functions by narrowing the `vars` bag to the intended key set.

Types:

```ts
export type DynamicFn<Vars extends ProcessEnv> = (
  vars: Vars,
  env?: string,
) => string | undefined;

export type DynamicMap<Vars extends ProcessEnv> = Record<
  string,
  DynamicFn<Vars> | string | undefined
>;

export function defineDynamic<
  Vars extends ProcessEnv,
  T extends DynamicMap<Vars>,
>(d: T): T;
```

Acceptance:

- Authors can declare a known subset of keys and get strong inference when destructuring `vars` in dynamic functions.
- Programmatic `dynamic` remains compatible with existing call sites.
- No runtime behavior change.

### F) overlayEnv: generic passthrough of key set and Readonly inputs

Goal: preserve the key set from the base plus any programmatic additions at compile time and accept readonly maps.

Signature pattern:

```ts
export function overlayEnv<B extends ProcessEnv | Readonly<ProcessEnv>>(args: {
  base: B;
  env: string | undefined;
  configs: OverlayConfigSources;
}): B;

export function overlayEnv<
  B extends ProcessEnv | Readonly<ProcessEnv>,
  P extends ProcessEnv | Readonly<ProcessEnv>,
>(args: {
  base: B;
  env: string | undefined;
  configs: OverlayConfigSources;
  programmaticVars: P;
}): B & P;
```

Semantics:

- Runtime remains identical (progressive expansion per slice).
- Compile-time type is `B` when no programmaticVars; `B & P` when provided.
- Accepts readonly inputs.

### G) Canonical options types from Zod schemas

Goal: ensure the public options types always match the validated runtime shape defined by the Zod schemas and avoid divergence between interfaces and schemas.

- Canonical types:
  - `GetDotenvOptions` is defined as `z.output<typeof getDotenvOptionsSchemaResolved>`.
  - `GetDotenvCliOptions` is defined as `z.output<typeof getDotenvCliOptionsSchemaResolved>`.
- There is a single source of truth for option shapes:
  - All changes to options must go through the Zod schemas.
  - The exported TypeScript types are derived from the schemas, not hand-written interfaces.
- Acceptance:
  - Any addition/removal/shape change to options is reflected automatically in the exported types.
  - Validation behavior and TypeScript types cannot drift.

### H) Typed config builder for JS/TS configs (defineGetDotenvConfig)

Goal: give authors of JS/TS config files a strongly-typed helper that ties together `vars`, `envVars`, and `dynamic` keys and improves inference for dynamic functions.

- Helper:

  ```ts
  export type GetDotenvConfig<
    Vars extends ProcessEnv,
    Env extends string = string,
  > = {
    // Root CLI options defaults, same shape as CreateCliOptions['rootOptionDefaults']
    rootOptionDefaults?: Partial<RootOptionsShape>;

    // Visibility defaults for root flags: false hides a flag in help.
    rootOptionVisibility?: Partial<Record<keyof RootOptionsShape, boolean>>;

    // Top-level data/config providers:
    scripts?: Scripts;
    vars?: Vars;
    envVars?: Record<Env, Partial<Vars>>;
    dynamic?: DynamicMap<Vars>; // JS/TS only
    schema?: unknown; // JS/TS only (schema.safeParse is used when available)
    plugins?: Record<string, unknown>;
    requiredKeys?: string[];

    // Legacy root toggles are not allowed at the top level; use rootOptionDefaults.
  };
  ```

- Acceptance:
  - `dynamic` functions see a strongly-typed `vars` bag aligned with `vars`/`envVars`.
  - Mis-typed keys in `envVars` are rejected at compile time.
  - Runtime loader remains schema-driven; builder is compile-time only.

### I) Optional typed getDotenv env shape

Goal: allow programmatic callers to opt into a more precise env type while keeping the default behavior unchanged.

- Generic signature:
  ```ts
  export function getDotenv<Vars extends ProcessEnv = ProcessEnv>(
    options?: Partial<GetDotenvOptions>,
  ): Promise<Vars>;
  ```
- Overload for narrowing based on `vars`:
  ```ts
  export function getDotenv<Vars extends ProcessEnv>(
    options: Partial<GetDotenvOptions> & { vars: Vars },
  ): Promise<ProcessEnv & Vars>;
  ```
- Usage:

  ```ts
  type MyEnv = {
    APP_SETTING?: string;
    ENV_SETTING?: string;
    APP_SECRET?: string;
  };

  const env = await getDotenv<MyEnv>({
    dotenvToken: '.testenv',
    env: 'test',
    paths: ['./test/full'],
  });
  ```

- Acceptance:
  - Default call sites continue to see `Promise<ProcessEnv>`.
  - Callers that pass a type argument get a precise env shape for their code (e.g., shared with HTTP handlers).
  - No runtime behavior change; typing is opt-in only.

### J) Commander generics end-to-end & typed ns() (extra‑typings)

Goal: thread Commander’s generics `Command<Args, Opts, GlobalOpts>` end‑to‑end to preserve inference through `.command()`, `.argument()`, `.option()`/`.addOption()`, and `.action()`; eliminate erasure to bare `Command`/`CommandUnknownOpts`. Prefer `@commander-js/extra-typings`.

- Public host interface (breaking: replaces non‑generic extension):

  ```ts
  import type {
    Command,
    InferCommandArguments,
    OptionValues,
  } from '@commander-js/extra-typings';

  export interface GetDotenvCliPublic<
    TOptions extends GetDotenvOptions = GetDotenvOptions,
    TArgs extends any[] = [],
    TOpts extends OptionValues = {},
    TGlobal extends OptionValues = {},
  > extends Command<TArgs, TOpts, TGlobal> {
    ns<Usage extends string>(
      name: Usage,
    ): GetDotenvCliPublic<
      TOptions,
      [...TArgs, ...InferCommandArguments<Usage>],
      {},
      TOpts & TGlobal
    >;

    // existing members (getCtx/hasCtx/resolveAndLoad/etc.) unchanged, with “this” carrying generics
  }
  ```

- Host class (breaking: mirrors generics and preserves subclass identity):

  ```ts
  export class GetDotenvCli<
    TOptions extends GetDotenvOptions = GetDotenvOptions,
    TArgs extends any[] = [],
    TOpts extends OptionValues = {},
    TGlobal extends OptionValues = {},
  >
    extends Command<TArgs, TOpts, TGlobal>
    implements GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>
  {
    override createCommand(name?: string): GetDotenvCli<TOptions> {
      return new GetDotenvCli<TOptions>(name);
    }

    ns<Usage extends string>(
      name: Usage,
    ): GetDotenvCliPublic<
      TOptions,
      [...TArgs, ...InferCommandArguments<Usage>],
      {},
      TOpts & TGlobal
    > {
      const exists = this.commands.some((c) => c.name() === name);
      if (exists) throw new Error(`Duplicate command name: ${name}`);
      return this.command(name) as unknown as GetDotenvCliPublic<
        TOptions,
        [...TArgs, ...InferCommandArguments<Usage>],
        {},
        TOpts & TGlobal
      >;
    }
  }
  ```

- Plugins and helpers:
  - `definePlugin` and `PluginWithInstanceHelpers` gain Commander generics parameters (defaulted) so plugin setup/afterResolve can act on a fully generic host without writing type parameters at call sites.
  - Keep `CommandUnknownOpts` only in helpers that read opts or traverse but do not further chain Commander methods (e.g., `readMergedOptions`, alias executor, batch actions). Do not call `.command()`, `.argument()`, `.option()`, or `.action()` on values typed as `CommandUnknownOpts`.
  - `ns()` is a typed alias over `.command()` and returns the preserved generics, so `.argument()`/`.option()` chaining and `.action()` handler inference work without casts.

- End‑user ergonomics:
  - Plugin authors continue writing:
    ```ts
    cli
      .ns('aws')
      .description('...')
      .addOption(/* ... */)
      .argument('[arg]')
      .action((...inferred) => {
        /* no casts */
      });
    ```
  - No explicit `Args/Opts/Global` type parameters are required at call sites; extra‑typings drives inference.

- Extra‑typings source of truth:
  - Treat `.stan/imports/extra-typings/index.d.ts` as canonical for local reasoning about Commander’s generics, especially `InferCommandArguments`, `OptionValues`, and `Command<Args, Opts, Global>`.

- Breaking change note:
  - Replace prior non‑generic `GetDotenvCliPublic extends Command` and `ns(name: string): Command` signatures. Backward-compat is not a constraint for this refactor; plan a major version bump.

## Architecture: Services-first (Ports & Adapters)

Adopt a services-first architecture with clear ports (interfaces) and thin adapters:

- Ports (service interfaces)
  - Define the core use-cases and inputs/outputs as pure TypeScript types.
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
- Favor small, focused unit tests for pure services and targeted integration tests for adapters/seams.
- Exercise happy paths and representative error paths; avoid brittle, end‑to‑end fixtures unless necessary.

Regression and coverage

- Add minimal, high‑value tests that pin down discovered bugs or branchy behavior.
- Keep coverage meaningful (prefer covering branches/decisions over chasing 100% lines).

## Diagnostics and safety (presentation only)

- Redaction:
  - CLI toggles: `--redact` and `--redact-off` control presentation-time redaction of secret-like keys in `-l/--log` and `--trace` outputs (plus any plugin/user-invoked trace). A `--redact-pattern` option accepts additional regex patterns.
  - Config defaults: `rootOptionDefaults.redact?: boolean` and optional `rootOptionDefaults.redactPatterns?: string[]` set defaults; CLI flags override at runtime.
  - Default secret-like key patterns include SECRET, TOKEN, PASSWORD, API_KEY, KEY; users may extend via `--redact-pattern`.
- Entropy warnings (default on):
  - Once-per-key messages when printable strings of length ≥ 16 exceed bits/char threshold (default 3.8).
  - Surfaces: `--trace` and `-l/--log`.
  - Whitelist patterns supported.

## Host typing and help metadata (durable rules)

- Dynamic help storage
  - The CLI host stores dynamic option description callbacks in a host-owned WeakMap keyed by Commander.Option. Do not mutate Option via symbol properties.
  - The CLI host stores option grouping metadata (for help rendering) in a host-owned WeakMap keyed by Option. Expose `setOptionGroup(opt, group)`.

- Grouping policy (leaf‑only)
  - Plugin group headings render leaf‑only names (e.g., “Plugin options — whoami”). The full realized path is used internally for lookup and config keys but is not displayed in group headings.
  - In the rare event of ambiguous leafs under the same parent, the installer’s sibling‑uniqueness guard prevents ambiguous groupings by requiring a namespace override.

- Namespace model
  - definePlugin requires `ns: string` for every plugin.
  - The host creates mounts (parent.ns(effectiveNs)) and passes the mount into `setup(mount)`; `setup` returns `void | Promise<void>`.

- Command creation semantics and uniqueness guard
  - The host’s `createCommand(name?)` must construct child commands via `new GetDotenvCli(name)` explicitly. Do not rely on subclass constructor semantics.
  - Same-level duplicate command names are disallowed and must throw a clear error early (before parse).

- Public interface and generics
  - The host class implements the structural public interface `GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>` extending `Command<TArgs, TOpts, TGlobal>` from extra‑typings.
  - The plugin contract is generic on TOptions and Commander generics: `GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>` so setup/afterResolve receive correctly typed ctx/cli when plugins depend on option typing.
  - `definePlugin()` returns a plugin that preserves type identity and is represented by the alias `PluginWithInstanceHelpers<TOptions, TConfig>` (Commander generics defaulted to empty/{} for ergonomics).
  - `PluginWithInstanceHelpers<TOptions, TConfig>` is exported so downstream code can declare plugin variables with the precise config type and rely on Commander inference in setup.

- Help evaluation typing
  - ResolvedHelpConfig is `Partial<GetDotenvCliOptions> & { plugins: Record<string, unknown> }` so callbacks can read shell/log/loadProcess/exclude\*/warnEntropy/redact without casts at root or parent commands.
  - Dynamic help MUST be evaluated against the same default stack used for runtime:
    - Defaults stack: baseRootOptionDefaults < createCli rootOptionDefaults < config.rootOptionDefaults (packaged/public < project/public < project/local).
    - CLI flags are not applied for top-level -h, but labels must reflect the effective defaults, not side-effect suppression used to safely render help.
  - For plugin-scoped options, prefer plugin-bound dynamic helpers that inject that plugin’s TConfig; avoid relying on id-based lookups.

### Root options composition, visibility, and config (createCli + config.rootOptionDefaults/rootOptionVisibility)

A single defaults and visibility surface drives both help-time and runtime behavior.

- Authoritative root defaults are merged by precedence:

  baseRootOptionDefaults < createCli({ rootOptionDefaults }) < packaged/public getdotenv.config._ rootOptionDefaults < project/public getdotenv.config._ rootOptionDefaults < project/local getdotenv.config.\* rootOptionDefaults < CLI flags

- Visibility:
  - There is a parallel visibility surface: `rootOptionVisibility?: Partial<Record<keyof RootOptionsShape, boolean>>`, with the same source precedence as defaults except there are no CLI flags for visibility:
    - createCli({ rootOptionVisibility }) < packaged/public rootOptionVisibility < project/public rootOptionVisibility < project/local rootOptionVisibility
  - “false” hides a flag; “true” shows it. Undefined means “no opinion”.

- There are no “CLI-only” root options. Any root option available in the CLI must be expressible under rootOptionDefaults (collapsed by family). Plugin options are excluded.

- Top-level acceptance rules in config (breaking; clean input):
  - Root-only operational keys are NOT accepted at the top level — they must live inside rootOptionDefaults.
  - Top-level data/config providers:
    - scripts (see below)
    - vars and envVars
    - dynamic (JS/TS only)
    - schema (JS/TS only)
    - plugins
    - requiredKeys
    - rootOptionDefaults
    - rootOptionVisibility

- “CLI-friendly only” in rootOptionDefaults:
  - Include only stringly/flag-like options that have CLI equivalents (families and singles), e.g., env, defaultEnv, tokens, dynamicPath, shell/log/loadProcess and their OFF variants, exclude\* families, trace, strict, redact/redactPatterns, entropy families (warn/threshold/minLength/whitelist), paths + splitters, vars splitters, outputPath, etc.
  - Exclude non-CLI complex objects:
    - scripts is not allowed inside rootOptionDefaults (see next).
    - dynamic map is not allowed inside rootOptionDefaults (JS/TS top-level only; programmatic API allowed).

- scripts:
  - scripts is a top-level config key (sibling of rootOptionDefaults), merged from packaged/public < project/public < project/local.
  - Not exposed as a CLI flag and not allowed inside rootOptionDefaults.
  - The host injects merged scripts into the defaults bag so resolveCommand/resolveShell work naturally, and nested flows inherit via getDotenvCliOptions JSON.

- redact parity:
  - CLI: add `--redact` and `--redact-off` pair.
  - rootOptionDefaults.redact?: boolean and rootOptionDefaults.redactPatterns?: string[] set defaults; CLI flags override at runtime.

## Configuration files and overlays (always-on in host/generator)

Discovery:

- Packaged (host package) root public: first match among:

  getdotenv.config.json|yaml|yml|js|mjs|cjs|ts|mts|cts

- Project root: first match for public + first match for local among the same set. Combined order for consumption:
  - packaged/public → project/public → project/local

Formats:

- JSON/YAML (data only, always-on; no-op when no files are present):
  - Allowed keys:
    - rootOptionDefaults?: Partial<RootOptionsShape> (collapsed families; CLI-like; no scripts, no dynamic)
    - rootOptionVisibility?: Partial<Record<keyof RootOptionsShape, boolean>> (false hides a flag)
    - scripts?: Scripts (table of strings or `{ cmd, shell? }`)
    - vars?: Record<string, string>
    - envVars?: Record<string, Record<string, string>>
    - plugins?: Record<string, unknown>
    - requiredKeys?: string[]
  - Disallowed: dynamic and schema (JSON/YAML loader rejects both; use JS/TS instead).

- JS/TS (data + dynamic + schema + root defaults + visibility):
  - Accepts all JSON/YAML keys and also:
    - dynamic?: GetDotenvDynamic — a map where values are either strings or functions of the form `(vars: ProcessEnv, env?: string) => string | undefined`.
    - schema?: unknown — a schema object (e.g., a Zod schema) whose `safeParse(finalEnv)` will be executed once after overlays.
  - The loader resolves default exports via robust TypeScript/ESM fallback rules, preferring esbuild bundling with a transpile fallback.

Root option defaults (unified model):

- rootOptionDefaults is the single source for root operational defaults (collapsed families) and may not be duplicated at the top level.
- Keys must be CLI-like (stringly/flags) and exclude scripts and dynamic map.
- rootOptionVisibility is the single source for default visibility (false hides), merged with createCli visibility.

Overlays and precedence for env/data (higher wins):

1. Kind: `dynamic` > `env` > `global`
2. Privacy: `local` > `public`
3. Source: `project` > `packaged` > `base`

Timing:

1. Compose base dotenv from files (`excludeDynamic: true`)
2. Overlay config sources (packaged → project/public → project/local) with progressive interpolation inside each slice
3. Apply dynamic in order:
   - config-level `dynamic` (JS/TS only) in order: packaged → project/public → project/local
   - programmatic `dynamic` (when provided programmatically)
   - file-level `dynamicPath` (highest dynamic tier; last-writer-wins, evaluated when present)
4. Effects: optional `outputPath` write; optional logging; optional `process.env` merge

Interpolation model:

- Phase C (host/generator): interpolate remaining string options against `{ ...process.env, ...ctx.dotenv }`. Precedence: ctx wins over parent process.env.
- Per-plugin slice interpolation: merge plugin config slices by precedence (packaged → project/public → project/local), deep‑interpolate each plugin’s slice once against `{ ...ctx.dotenv, ...process.env }` (process.env wins for plugin slices), validate if a schema is present, then store per plugin instance (WeakMap). Plugins retrieve their validated slice via `plugin.readConfig(cli)`.

Validation:

- JSON/YAML: `requiredKeys?: string[]`.
- JS/TS: `schema?: { safeParse(finalEnv) }` (e.g., Zod).
- Runs once after overlays/Phase C; `--strict` fails on issues; otherwise warn.

Loader activation:

- The config loader/overlay pipeline is always active for the plugin-first host and generator paths and is a no-op when no config files are present.
- Programmatic callers use the same semantics as the host for env overlays/dynamic when they opt into the loader path, but do not implicitly read root defaults from config via `resolveGetDotenvOptions` (see “Option layering” above).

Per‑plugin config keyed by realized path

- The `plugins` map in JSON/YAML/JS/TS config is keyed by the realized mount path of plugins (root alias excluded). Examples:
  - `plugins.aws` — parent plugin mounted at `aws`
  - `plugins['aws/whoami']` — child plugin mounted under `aws`
- Renaming a namespace via `.use(plugin, { ns: '...' })` changes the corresponding config key. This ensures config follows the CLI surface area the consumer assembles.
- Author guidance:
  - Stabilize namespaces in compositions to avoid churn in config keys over time.
  - Use leaf‑only names in help displays; rely on the realized path for config keys and internal lookups.

## Dotenv file editing utility (format-preserving)

The library MUST provide utilities to update a dotenv-style file in place while preserving comments, whitespace, ordering, and non-assignment content.

Primary use cases:

- Bootstrap: reconstruct missing gitignored private files (e.g., `.env.dev.local`) from a committed template and a JSON payload (e.g., fetched from a secrets store).
- Sync: update existing dotenv files in place while preserving developer formatting and comments.
- General updates: update a public or private file for either global scope or a specific environment.

### Target selection (deterministic; paths-only)

Given an available getdotenv context and explicit selector options, the utility MUST be able to determine the exact file to edit by searching `paths` only (no separate directory parameter).

Selector axes (mutually exclusive):

- Scope: `global` or `env` (never both).
- Privacy: `public` or `private` (never both).

Filename construction (from context + selector):

- Base token: `dotenvToken` (default `.env`).
- Environment segment:
  - If scope is `env`, use `env` (or `defaultEnv`) and include `.<env>` in the filename.
  - If no effective env is available when scope is `env`, throw.
- Private token:
  - If privacy is `private`, append `.<privateToken>` (default `local`).
  - If privacy is `public`, do not append a private token.

The resulting filename MUST be exactly one of:

- Public/global: `<dotenvToken>`
- Public/env: `<dotenvToken>.<env>`
- Private/global: `<dotenvToken>.<privateToken>`
- Private/env: `<dotenvToken>.<env>.<privateToken>`

Search order across `paths` MUST be configurable:

- Default: reverse order (highest precedence path wins, consistent with overlay precedence).
- Optional: forward order.

Resolution rules:

- If the target file exists at any searched path, edit the first match and stop.
- If the target file does not exist anywhere, but a template file exists, copy the template to create the target file as a sibling of the template and then edit it.
  - Template extension MUST default to `template` (e.g., `.env.local.template`).
- If neither the target file nor its template exists anywhere under `paths`, the utility MUST throw (cannot determine destination).

### Format-preserving edits (state-machine parsing)

The utility MUST implement a small state-machine parser (not regex-only parsing) to preserve formatting.

Preservation guarantees:

- Preserve comments (full-line and inline).
- Preserve blank lines.
- Preserve unknown/unparsed lines verbatim.
- Preserve indentation and separator spacing around `=` (and any supported alternative separators).
- Preserve existing quote style where possible (single vs double vs unquoted).
- Preserve per-line EOL tokens when `eol: preserve` is selected.
- Preserve trailing newline presence/absence.

### Editing semantics

The editor MUST support:

- Mode:
  - Default `merge`: update/add keys from the input object without deleting unrelated keys.
  - Optional `sync`: remove assignment lines for keys not present in the input object.
- Duplicate key handling:
  - Configurable strategy: `all | first | last`.
  - Default: `all` (update all occurrences).
- Null/undefined handling (configurable):
  - Default: `undefined` skips (no change).
  - Default: `null` deletes the key assignment line(s) (subject to duplicate strategy).
  - Additional behaviors may be supported (e.g., set empty string) without breaking defaults.
- JSON value normalization:
  - Objects and arrays MUST be supported by stringifying (e.g., `JSON.stringify`) before writing.

Sync + undefined safety:

- In `sync` mode, a key present in the update object with value `undefined` and `undefinedBehavior: skip` MUST NOT be treated as “missing” for deletion purposes.

### Quoting and correctness

The editor MUST prefer correctness and compatibility with dotenv parsers while still preserving formatting when feasible.

- Preserve the original quote style for updated keys when the new value can be safely represented with that style.
- Upgrade quoting as needed to represent the new value correctly (for example, multiline values or values that would otherwise be truncated by inline comments).
- When updating a template placeholder line that contains only a bare key (no separator/value), the editor MUST insert a default separator (`=`) when applying a value.

### EOL policy

EOL normalization MUST be configurable:

- Default: `preserve` (detect and preserve existing EOL style; inserted lines follow the detected file EOL).
- Options: force `lf` or `crlf`.

## Prioritized roadmap (requirements)

Must-have (near-term):

1. Batch concurrency (opt-in)
   - Flag: `--concurrency <n>` (default 1).
   - Aggregate output by job; buffered flush; end-of-run summary.
   - Optional `--live` for prefixed interleaved streaming.
   - Respect per-script hints: `scripts[name].parallel?: boolean`, `concurrency?: number`.

2. Redacted logging/tracing
   - CLI family: `--redact` and `--redact-off` control presentation-time redaction; `--redact-pattern` accepts additional regex patterns.
   - Config defaults: `rootOptionDefaults.redact` and `rootOptionDefaults.redactPatterns`.
   - Apply to `-l/--log` and `--trace`.
   - Entropy warnings (warning-only; no masking):
     - Purpose: Provide a low-risk signal for likely secrets without altering values or masking by default.
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
