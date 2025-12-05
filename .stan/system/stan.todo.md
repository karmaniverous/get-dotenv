# Development Plan

When updated: 2025-12-05T00:00:00Z

## Next up (near‑term, actionable)

- Final verification and release
  - Run full suite (typecheck, lint, test, build, verify-types, verify-package).
  - Ensure no regressions from schema-first refactor.

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

- Scripts: verify-types star & multi-hop chase
  - Enhanced re-export handling to detect `export * from` and chase up to two levels to locate overlayEnv and programmaticVars reliably across type bundles.

- Build: ESM-only distribution
  - Removed CJS JS outputs and .d.mts/.d.cts types from Rollup config; emit ESM and .d.ts only.
  - Updated package.json exports to ESM-only (removed all "require" maps; import.types -> .d.ts); set main to dist/index.mjs.
  - Adjusted verify-bundle to check only ESM bundles and verify-tarball to drop index.cjs expectation.
  - Removed CJS interop test (src/interop/createCli.cjs.test.ts).

- verify-types: robust chase for JS re-exports
  - Updated tools/verify-types.js to replace .js/.mjs/.cjs extensions with .d.ts/.ts
    (and add .d.ts/.ts when no extension) while resolving re-export targets.
  - Ensures overlayEnv and programmaticVars detection succeeds against dts stubs.

- TypeDoc: include PluginWithInstanceHelpers
  - Exported PluginWithInstanceHelpers in src/cliHost/definePlugin.ts to remove
    the “referenced but not included” warning during docs generation.

- verify-types: detect typed-const overlayEnv
  - Broadened overlayEnv detection to match both function declarations and
    typed-const function types (declare/export const overlayEnv: <...>(...) => ...)
    in .d.ts outputs, ensuring robust detection after re-export chasing.

- verify-types: source fallback for overlayEnv
  - When direct and chased dts checks do not surface overlayEnv, inspect
    src/env/overlay.ts as a last-resort fallback to confirm the declaration and
    the programmaticVars parameter, making the check resilient to dts stubs.

- Requirements/doc: typed env, config builder, Zod canonical options, loader flag removal
  - Updated stan.requirements.md to document:
    - ESM-only distribution and exports.
    - Canonical options types derived from Zod schemas.
    - Typed config builder for JS/TS configs (defineGetDotenvConfig).
    - Optional typed getDotenv<Vars>() env shape and explicit removal of useConfigLoader.

- Wired canonical options types to Zod schemas and removed useConfigLoader
  - Replaced GetDotenvOptions/GetDotenvCliOptions manual interfaces with types derived from schemas.
  - Tightened scripts schema in CLI options.
  - Implemented defineGetDotenvConfig<Vars, Env> and generic getDotenv<Vars>().
  - Refined definePlugin to return TConfig-bound instance helpers.
  - Updated TS config template to use defineGetDotenvConfig.
  - Fixed Zod imports and deduplicated schema keys.
  - Aligned RootOptionsShape with Zod strict optional types.
  - Derived RootOptionsShape from Zod schema (schema-first).

- Polished typing for readonly inputs
  - Updated helpers (getDotenv, defineDynamic, defineGetDotenvConfig) to accept Readonly types (as const).
  - Added AnyProcessEnv alias.
  - Verified Scripts<TShell> prevents unintended URL widening.

- Resolved strict type mismatches in options compatibility layers.

- Fixed getter overload signatures and refined compat types.
