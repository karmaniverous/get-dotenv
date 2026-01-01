# Development Plan

## Next up (near‑term, actionable)

- Fix verification failures from the last run:
  - Typecheck (exactOptionalPropertyTypes) in host provenance plumbing.
  - Lint: vitest conditional expect, unused import, unnecessary condition.
- Re-run the full verification suite (lint/test/typecheck/build + verify scripts) and persist outputs for the next archive.
- Add higher-signal provenance assertions:
  - Verify dynamic provenance ordering across config/programmatic/dynamicPath when configured.
  - Verify unset provenance behavior for dynamic functions returning `undefined`.
- Reconcile provenance descriptor completeness vs current semantics:
  - Decide whether to represent empty-string expansions as `op: 'unset'` across file layers (currently applied for config/vars layers).
  - Ensure provenance includes keys later overridden by higher-precedence layers across multi-path cascades.
- Dotenv editor follow-ups:
  - Consider whether to expose a small “resolve target path” helper for reuse in future plugins/tools (keep the FS port boundary).
- Deprecations: soft-deprecate the `z` re-export (JSDoc a short Guides callout) and ensure docs/templates import `{ z }` from `zod`.

## Completed (recent)

- Defined requirements and plan for a format-preserving dotenv edit utility with deterministic multi-path target resolution and template bootstrap.
- Implemented a format-preserving dotenv editor (text FS) and documented the public API in the assistant guide.
- Fixed dotenv editor typing/lint and stabilized test timeouts.
- Resolved remaining dotenv editor TS/lint errors (green tests).
- Added dotenv editor regression tests (unclosed quotes, export, inline #).
- Documented the dotenv editor in a dedicated guide and updated the STAN assistant guide for downstream usage.
- Clarified shipped plugin interop contracts in the STAN assistant guide (aws child mounting, `ctx.plugins.aws` shape, dotenv editor winner-path selection, guarded X-Ray enablement, and cmd/batch/init interop notes).
- Documented ctx provenance dynamic precedence (A2) requirements and plan.
- Expanded ctx provenance requirements and plan details (entry shape, ordering, and A2 semantics everywhere).
- Fixed typecheck/lint regressions in provenance plumbing (exactOptionalPropertyTypes-safe args, provenance entry narrowing in tests).