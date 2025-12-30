# Development Plan

## Next up (near‑term, actionable)

- Implement a format-preserving dotenv editor utility:
  - Add a state-machine parser that preserves comments/whitespace/EOL and supports multiline quoted values.
  - Implement deterministic target resolution across getdotenv `paths` (default reverse) with template bootstrap (default extension: `template`) and “throw when ambiguous”.
  - Implement merge vs sync modes, configurable null/undefined and duplicate-key behaviors, JSON stringify for objects/arrays, and quote preservation/upgrades.
  - Add unit tests covering preservation guarantees and edge cases (bare-key template placeholders, duplicates, EOL preserve/lf/crlf).

- Deprecations: soft-deprecate the `z` re-export (JSDoc + a short Guides callout) and ensure docs/templates import `{ z }` from `zod`.

## Completed (recent)

- Defined requirements and plan for a format-preserving dotenv edit utility with deterministic multi-path target resolution and template bootstrap.
