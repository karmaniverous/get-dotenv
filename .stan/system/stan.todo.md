# Development Plan

## Next up (near‑term, actionable)

- Implement a format-preserving dotenv editor utility:
  - Design the public API surface (library-level):
    - Pure/text layer: parse → apply edits → render (no fs).
    - FS adapter layer: resolve target file across getdotenv `paths`, optional template bootstrap, then read/edit/write.
  - Add a state-machine parser and line model that preserves:
    - Unknown lines verbatim, full-line and inline comments, blank lines, ordering, per-line EOL tokens, trailing newline presence/absence.
    - Assignment spacing around separators (preserve existing separator spacing when updating a line).
    - Quote style preservation where possible, upgrade quoting when required for correctness (e.g., multiline, inline comment safety).
  - Implement deterministic target resolution across getdotenv `paths`:
    - Default search order: reverse (highest-precedence path wins), configurable.
    - Exact file naming from selector axes (global|env) × (public|private).
    - Template bootstrap: copy `<target>.<templateExtension>` (default `template`) to `<target>` when `<target>` is missing.
    - Throw when neither target nor template exists anywhere under `paths`.
  - Implement editing semantics:
    - Mode: merge (default) vs sync.
    - Duplicate key strategy: all (default) vs first vs last.
    - null/undefined handling (configurable): default undefined=skip, null=delete assignment lines.
    - JSON stringify for objects/arrays before writing; string coercion for primitives.
    - Bare-key template placeholder support: `KEY` → `KEY=<value>` using default separator `=`.
  - Tests:
    - Pure unit tests for parser + renderer + edit application (preservation guarantees, duplicates, quoting upgrades, bare-key placeholders).
    - FS-level integration tests for multi-path target resolution + template bootstrap + ambiguity/throw cases.
    - EOL coverage: preserve + force lf + force crlf.

- Deprecations: soft-deprecate the `z` re-export (JSDoc + a short Guides callout) and ensure docs/templates import `{ z }` from `zod`.

## Completed (recent)

- Defined requirements and plan for a format-preserving dotenv edit utility with deterministic multi-path target resolution and template bootstrap.
