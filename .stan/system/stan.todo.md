# Development Plan

When updated: 2025-12-05T00:00:00Z

## Next up (near‑term, actionable)

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

- Docs policy (fence hygiene)
  - Added project-level reminder in stan.project.md to apply Fence Hygiene when editing Markdown docs with embedded code blocks (compute N = max inner backticks + 1; re-scan after composing; avoid hardcoded triple backticks).

- Docs sweep (instance-bound helpers)
  - Updated Authoring/Lifecycle to use plugin.createPluginDynamicOption(cli, …) and plugin.readConfig(cli) (removed by‑id examples).
  - Updated Authoring/Config to replace readPluginConfig by‑id with plugin.readConfig(cli).
  - Updated Config guide to recommend plugin‑bound dynamic helper (no cfg.plugins.<id> in help callbacks).
  - README note now references plugin‑bound createPluginDynamicOption explicitly.

- Docs follow‑through (instance‑bound helpers in shipped pages)
  - Updated shipped plugin docs (aws, batch) to use plugin.readConfig(cli) and instance‑bound patterns; removed by‑id examples.

- Docs notes: defineScripts and readonly acceptance
  - Added a short defineScripts note to Shell and Authoring/Exec guides (TS inference for script tables).
  - Added a readonly‑inputs note where helpful (Getting Started / Shell / Exec) to reflect acceptance of readonly record shapes by helper APIs.

- Audit: dynamic help parity
  - Re‑verified root and plugin dynamic help labeling remained correct after doc/example updates (unit/E2E continue to pass).

- Public API cleanup (remove by‑id)
  - Removed readPluginConfig from public exports and eradicated internal/doc usages; plugin.readConfig(cli) is the sole path going forward.

- Shipped plugins migrated to instance model
  - aws/batch use plugin.readConfig(cli) and plugin‑bound dynamic help; cmd verified (no plugin config); unit/E2E updated accordingly.

- Type/input DX polish (compile‑only)
  - Broadened readonly inputs for dotenvExpandAll/overlayEnv and added defineScripts<TShell>() helper; URL remains accepted only at the outer exec seam.

- Scripts: verify-types overlay chase
  - Updated tools/verify-types.js to follow a single-level re-export in env-overlay.d.ts and validate the target declaration (overlayEnv/programmaticVars).
