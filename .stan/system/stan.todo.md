# Development Plan

When updated: 2025-12-04T00:00:00Z

## Next up (near‑term, actionable)

- Public API cleanup (remove by‑id)
  - Remove readPluginConfig<T>(cli, id) from cliHost public exports and delete internal usages.
  - Eliminate any remaining by‑id references in source/tests/docs (including cfg.plugins.<id> in help callbacks).

- Migrate shipped plugins to instance model
  - aws: replace readPluginConfig and cfg.plugins usage with plugin.readConfig(cli); use plugin.createPluginDynamicOption for dynamic defaults.
  - batch: same migration as aws (instance‑bound reads; plugin‑bound dynamic help).
  - cmd: confirm no plugin config; ensure help/alias behavior unaffected.
  - Tests: update unit/E2E to assert plugin.readConfig(cli) path and plugin‑bound help; remove by‑id assumptions.

- Type/input DX polish (compile‑only)
  - Broaden inputs: accept Readonly<Record<string, string | undefined>> in dotenvExpandAll and overlayEnv.
  - Add defineScripts<TShell>() helper (identity) to preserve TShell inference when building script tables in code.
  - Keep URL accepted only at the outer exec seam; continue to type internal helpers as string | false (no widening).

- Docs
  - Authoring/Config & Lifecycle: document plugin.readConfig(cli) and plugin‑bound dynamic option helper; remove all by‑id examples.
  - Shipped plugins (aws, batch): update snippets to the instance‑bound model.
  - Getting Started / Shell / Exec: add a short note for defineScripts; mention Readonly acceptance in expansion/overlay helpers.

- Verify and release (major)
  - Update CHANGELOG with a short migration guide:
    - Replace readPluginConfig<T>(cli, 'id') with plugin.readConfig(cli).
    - Replace cfg.plugins.<id> help callbacks with plugin‑bound dynamic helper or inline plugin.readConfig(cli).
    - Duplicate command names are now guarded at definition time.
  - Bump major version.
  - Run full suite: typecheck, lint, unit/E2E tests, build, verify:types|bundle|tarball, smoke.

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

- Host plugin seam: added instance‑bound helpers and structural host support
  - GetDotenvCliPublic now exposes createDynamicOption (structural typing).
  - definePlugin returns plugins with readConfig(cli) and createPluginDynamicOption(cli, …) helpers.
  - Removed unsafe “arguments” usage and any‑typed generics in definePlugin; computeContext plugin store typed to GetDotenvOptions.
- Batch/AWS migration (initial)
  - Batch uses plugin.createPluginDynamicOption(cli, …) for dynamic defaults.
  - AWS action path fixed self redeclaration; uses plugin.readConfig(cli) correctly.
- Lint/Typecheck cleanup (plugin seam)
  - Restored readConfig/createPluginDynamicOption as optional in the plugin interface to keep test helpers and ad‑hoc plugins compiling.
  - Typed plugin-config WeakMap to GetDotenvOptions for constraint compliance; adjusted set/get casts.
  - Simplified dynamic help fallback checks to satisfy “unnecessary-condition”.
  - Added targeted eslint suppressions for single‑use generics on typed helpers.
  - Removed unused imports in batch plugin.

- Instance helpers: make required on definePlugin return type
  - Returned plugin type now includes required readConfig(cli) and createPluginDynamicOption(cli, …) helpers (intersection type).
  - Fixed TS errors in aws/batch plugins without adding non-null assertions.
  - Kept public interface optional for ad‑hoc/test plugins; targeted ESLint suppressions added for single‑use generics.

- Duplicate command name guard
  - GetDotenvCli.ns(name) now throws a clear error on same‑level duplicate names.
  - Added unit test (src/cliHost/ns.duplicate.test.ts) to assert guard behavior.

- Templates update
  - hello plugin template now passes cli into plugin.createPluginDynamicOption(cli, …) and continues to use plugin.readConfig(cli).

- Lint hygiene
  - Suppressed @typescript-eslint/no-unnecessary-type-parameters where generics are intentionally single-use (overloads and helper methods).

- Lint: overload single‑use generics
  - Added inline eslint-disable-next-line for @typescript-eslint/no-unnecessary-type-parameters on definePlugin overload signatures to silence remaining rule hits.
