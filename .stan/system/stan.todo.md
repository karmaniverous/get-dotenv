# Development Plan

## Next up (near‑term, actionable)

- Implement createCli rootOptionDefaults/rootOptionVisibility:
  - Apply defaults/visibility once pre‑compose and install root resolution hooks.
  - Ensure top‑level -h parity by overlaying resolved toggles from ctx.optionsResolved.
  - Hide scripts by default; implement visibility families as specified in requirements.
- Remove the public GetDotenvCli.prototype.overrideRootOptions helper; keep attachRootOptions internal only.
- Update template CLI skeleton to set rootOptionDefaults/rootOptionVisibility on createCli and stop calling overrideRootOptions.
- Update tests:
  - E2E and unit paths that previously called overrideRootOptions should move to createCli or a small internal test helper.
  - Refresh help-default assertions to reflect base (loadProcess ON) unless tests override via createCli.
- Docs:
  - (Follow‑through) Update README/guides and any shipped template commentary to reflect createCli-based overrides (scripts hidden; loadProcess not forced OFF).

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
