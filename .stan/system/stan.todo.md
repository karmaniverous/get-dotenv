# Development Plan

## Next up (near‑term, actionable)

- Dotenv editor follow-ups:
  - Consider whether to expose a small “resolve target path” helper for reuse in future plugins/tools (keep the FS port boundary).
- Deprecations: soft-deprecate the `z` re-export (JSDoc + a short Guides callout) and ensure docs/templates import `{ z }` from `zod`.

## Completed (recent)

- Defined requirements and plan for a format-preserving dotenv edit utility with deterministic multi-path target resolution and template bootstrap.
- Implemented a format-preserving dotenv editor (text + FS) and documented the public API in the assistant guide.
- Fixed dotenv editor typing/lint and stabilized test timeouts.
- Resolved remaining dotenv editor TS/lint errors (green tests).
- Added dotenv editor regression tests (unclosed quotes, export, inline #).- Documented the dotenv editor in a dedicated guide and updated the STAN assistant guide for downstream usage.