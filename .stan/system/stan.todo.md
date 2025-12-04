# Development Plan

When updated: 2025-12-04T00:00:00Z

## Next up (near‑term, actionable)

- Host (instance‑bound plugin config; no by‑id)
  - computeContext: store validated/interpolated plugin config per plugin instance in a WeakMap<GetDotenvCliPlugin, unknown>. Stop writing ctx.pluginConfigs publicly.
  - definePlugin<TOptions, TConfig>: add plugin.readConfig(cli): TConfig | undefined and plugin.createPluginDynamicOption(flags, (bag, cfg) => string).
  - GetDotenvCli.ns(name): guard against same‑level duplicate command names with a clear early error; add a small unit test.

- Public API cleanup (remove by‑id)
  - Remove readPluginConfig<T>(cli, id) from cliHost public exports and delete internal usages.
  - Eliminate any remaining by‑id references in source/tests/docs (including cfg.plugins.<id> in help callbacks).

- Migrate shipped plugins to instance model
  - aws: replace readPluginConfig and cfg.plugins usage with plugin.readConfig(cli); use plugin.createPluginDynamicOption for dynamic defaults.
  - batch: same migration as aws (instance‑bound reads; plugin‑bound dynamic help).
  - cmd: confirm no plugin config; ensure help/alias behavior unaffected.
  - Tests: update unit/E2E to assert plugin.readConfig(cli) path and plugin‑bound help; remove by‑id assumptions.

- Templates
  - Scaffold “hello” plugin: demonstrate p.readConfig(cli) usage (minimal config shape; no schema dependency) and show a simple plugin‑bound dynamic option label.

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
