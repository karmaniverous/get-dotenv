# Development Plan

## Next up (near‑term, actionable)

- Add dotenv provenance metadata to the host `ctx`:
  - `kind: 'file' | 'config' | 'vars' | 'dynamic'` plus `op: 'set' | 'unset'`.
  - Descriptor-only (no value payloads); include keys later unset by higher layers; exclude parent `process.env` provenance.
  - Implement provenance as a per-key ordered stack (ascending precedence; last entry is effective).
  - Thread provenance collection through file cascade + config overlay + vars + dynamic (first-class concern, no post-hoc reconstruction).
  - Capture minimum descriptors per kind (file/config/vars/dynamic) and follow the “as provided” descriptor policy for `paths[]` and `dynamicPath`.
- Align dynamic precedence everywhere (A2): config dynamic \< programmatic dynamic \< `dynamicPath`, with `dynamicPath` always evaluated when present and last-writer-wins on collisions:
  - Update programmatic `getDotenv()` to apply both programmatic `dynamic` and `dynamicPath`, with `dynamicPath` last.
  - Ensure `excludeDynamic` disables all dynamic sources (including `dynamicPath`).
  - Update/replace any tests that assumed programmatic `dynamic` suppresses `dynamicPath`.
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
- Documented ctx provenance + dynamic precedence (A2) requirements and plan.
- Expanded ctx provenance requirements and plan details (entry shape, ordering, and A2 semantics everywhere).
