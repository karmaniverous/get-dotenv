# Development Plan

## Next up (near‑term, actionable)

- Implement overrideRootOptions(defaults?, visibility?) on GetDotenvCli; declare flags from visibility (default: all visible except scripts) and install resolution hooks replacing passOptions (merge: base < compose < inherited < current; resolve context; evaluate dynamic help; run --strict).
- Replace attachRootOptions/passOptions usage in createCli and templates with overrideRootOptions(); shipped createCli calls overrideRootOptions() with no defaults and does not override loadProcess.
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