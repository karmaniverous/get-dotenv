# Development Plan

## Next up (near‑term, actionable)

- Implement overrideRootOptions(defaults?, visibility?) on GetDotenvCli; declare flags from visibility (default: all visible except scripts) and install resolution hooks replacing passOptions (merge: base < compose < inherited < current; resolve context; evaluate dynamic help; run --strict).
- Replace attachRootOptions/passOptions usage from createCli and templates with overrideRootOptions(); shipped createCli calls overrideRootOptions() with no defaults and does not override loadProcess.
- Persist the merged root bag on the host for in‑process nesting and serialize it to env for cross‑process; keep readMergedOptions behavior for plugins unchanged.
- Unify top‑level -h/--help with parsed help by synthesizing the same help bag and overlaying resolved toggles (shell/log/loadProcess/entropy/redaction) from ctx.optionsResolved.
- Hide the scripts family from help by default while keeping runtime behavior; ensure toggle families (e.g., shell, loadProcess) are hidden/shown together via visibility.
- Remove attachRootOptions and passOptions from code and public exports; update cliHost barrel exports and internal imports accordingly.
- Update README and templates to reference overrideRootOptions semantics, visibility, help‑defaults parity, and shipped createCli defaults; replace attachRootOptions/passOptions in templates/cli/index.ts.
- Update unit and E2E tests to use overrideRootOptions; refresh help‑defaults expectations; ensure alias, batch, AWS, dynamic, smoke, and diagnostics tests remain green.
- Ensure process.env inheritance and nested options‑bag inheritance are covered by tests; add regressions if missing.
- Bump version for the breaking helper removal and update CHANGELOG; re‑run verify scripts (types, tarball, bundle, package).

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

- Introduced GetDotenvCli.overrideRootOptions(defaults?, visibility?) as a
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
