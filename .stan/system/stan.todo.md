# Development Plan

When updated: 2025-12-03T00:00:00Z

## Next up (near‑term, actionable)

- Tests and CI updates
  - Register/openapi/package outputs remain byte-for-byte identical.
  - Dev: stage precedence matrix; inline/offline spawn-env normalization; Windows CI smoke.
  - Verify help header branding and flags (-e/--strict/--trace/-V).

- Documentation updates
  - CLI: clarify host-based design; new commands (cmd/batch); global flags; getdotenv.config.\* surfaces.
  - Dev guide: stage precedence; recommend plugins.smoz.stage mapping; strict/diagnostics notes.
  - Troubleshooting: add safe tracing and quoting recipes for cmd; clarify Windows path hygiene is handled by spawn-env.
  - Config Files & Overlays: follow-ups as needed (major cross-links landed).

- Optional test hardening: add an integration test asserting batch child env includes a known dotenv key (regression guard for env injection).

- Optional UX: add a verbose mode to print a masked snapshot of the normalized child env before spawn (feature‑gated; off by default).

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**
