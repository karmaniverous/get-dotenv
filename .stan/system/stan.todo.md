# Development Plan

## Next up (near‑term, actionable)

- Remove the public GetDotenvCli.prototype.overrideRootOptions helper; keep attachRootOptions internal only.
- Update tests to prefer createCli rootOptionDefaults/rootOptionVisibility over overrideRootOptions.
- Docs: update README/guides and template commentary to reflect createCli-based overrides (scripts hidden; loadProcess not forced OFF).

## Completed (recent)

- Introduced GetDotenvCli.overrideRootOptions as a
  delegating shim over existing attachRootOptions + passOptions. Updated the
  shipped createCli and template CLI to use overrideRootOptions. Visibility is
  accepted but not yet enforced; scripts remain hidden by default.

- Amendment: overrideRootOptions declares flags only (no early install). Hooks
  and context resolution are still installed via passOptions() after plugin
  wiring to ensure plugins are registered before installation.

- Consolidated hook registration into overrideRootOptions (no early install,
  no duplicated defaults). Removed passOptions usage from createCli and the
  template CLI and updated the exposure test to assert overrideRootOptions
  presence. Plugin install remains explicit in run() paths, preserving the
  correct mount order.

- Migrated unit tests off deprecated passOptions() to overrideRootOptions();
  updated aws/batch/cmd/init and host dynamic‑help tests to call
  overrideRootOptions() and removed unsafe casts where unnecessary. This
  restores test/runtime parity under the new consolidated root wiring.

- Fixed generic compatibility in GetDotenvCli hooks by casting service
  options to Partial<TOptions> when calling resolveAndLoad(), satisfying
  exactOptionalPropertyTypes and eliminating TS2379 in typecheck.

- Follow‑through: remove src/cliHost/passOptions.ts and any stale exports in a
  separate sweep, then re‑run verify scripts and bump version for the helper
  removal once docs are updated.

- Installed plugins explicitly in unit tests (await cli.install()) before
  parsing and help evaluation to ensure parent-level alias options and
  subcommands are registered ahead of Commander parse. This resolves
  “unknown option --cmd” and “too many arguments” failures introduced by
  the removal of passOptions() early install behavior.

- Top-level -h parity: createCli now composes the help-time bag from
  base defaults + composition defaults (overrideRootOptions) and overlays
  resolved toggles from ctx.optionsResolved. This fixes wrong labels for
  --load-process-off when packaged or composition defaults set it OFF.

- Fix: Programmatic resolveGetDotenvOptions no longer reads a local
  getdotenv.config.json from the current package root. This restores the
  expected default behavior (loadProcess ON from base defaults) for
  programmatic getDotenv, unblocking core tests that assert process.env
  is populated by default.

- Fix: createCli help-time overlay casts ctx.optionsResolved to the CLI
  options shape and removes an unnecessary nullish coalescing default,
  resolving TS2339 and lint (no-unnecessary-condition) errors.

- Lint: resolveGetDotenvOptions made non-async and now returns
  Promise.resolve(...) to satisfy @typescript-eslint/require-await while
  preserving the Promise-return contract for await call sites.

- Requirements/doc refactor: adopted createCli rootOptionDefaults/rootOptionVisibility
  as the single source of truth for root overrides and visibility; removed the public
  overrideRootOptions helper in the requirements. Documented visibility families, shipped
  defaults (scripts hidden; loadProcess not forced OFF), template changes, and advanced
  host author guidance.

- createCli: added rootOptionDefaults and rootOptionVisibility. Defaults are applied
  once pre-compose; visibility is honored by hiding matching root options via hideHelp.
  Top-level -h parity uses base defaults overlaid with rootOptionDefaults and the resolved
  ctx toggles. Shipped CLI no longer forces loadProcess OFF by default (base defaults apply).

- Template CLI: updated to pass rootOptionDefaults to createCli and stopped calling
  overrideRootOptions in the compose block. This aligns the template with the factory’s
  single source of truth for root wiring.

- createCli wiring refactor: createCli no longer calls the public
  overrideRootOptions helper. Root flags are declared via the internal
  attachRootOptions builder and resolution hooks are installed via a new
  internal helper (src/cliHost/rootHooks.ts). Behavior is unchanged; this
  unblocks deprecating and ultimately removing the public helper.
- rootHooks typing/lint fix: removed implicit any and unsafe member access in
  debug logging. Added a typed debugView over Partial<RootOptionsShape> and
  used it in preSubcommand/preAction logs to satisfy strict/ESLint.
- Fix: resolve TS2379 in createCli → installRootHooks by relaxing the
  installRootHooks signature to accept `GetDotenvCli<TOptions>` with default
  generics (replacing the `unknown[]/OptionValues` alias). This removes the
  generic invariance mismatch when passing `new GetDotenvCli(alias)` and
  allows typecheck to pass. Also removed the now‑unused OptionValues import.
- Remove public GetDotenvCli.prototype.overrideRootOptions. Advanced authors
  should prefer createCli with rootOptionDefaults/rootOptionVisibility.
  Internal root wiring remains via attachRootOptions + rootHooks (factory‑only).

- Tests: refactor plugin/host tests to use createCli().compose(...) instead of
  calling overrideRootOptions directly. Updated cmd/alias and batch/init tests
  to construct a runner and pass argv arrays, preserving existing assertions.
  Adjusted helpers.exposure test to assert overrideRootOptions is not present.
- Refactor tests to the createCli runner and remove deprecated
  overrideRootOptions usage. Updated unit tests for cmd, batch, init, and root
  dynamic-help to compose plugins via createCli and to pass full argv style
  arrays (['node','alias', ...]) so the runner’s derive logic preserves
  subcommands. Enabled help capture under Vitest by setting
  GETDOTENV_STDIO=pipe and adjusted expectations to current defaults
  (shell ON, loadProcess ON, log OFF). This clears the TS error, lint errors,
  and readMergedOptions failures in unit tests.