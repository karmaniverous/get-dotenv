# Development Plan

## Next up (near‑term, actionable)

- Refactor: Add `radash` dependency and simplify utilities (omitUndefined, spawnEnv, cmd plugin, build scripts).
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
- Resolved Rollup circular dependency warnings (remove internal barrel import cycle; suppress node_modules AWS SDK cycles).
- Added tests asserting dynamic provenance ordering and unset semantics.
- Added test asserting file provenance stacks across multiple paths.
- Recorded file provenance op=unset for empty file values (KEY=).
- Exposed a reusable dotenv target resolver for multi-path editing.
- Fixed editDotenvFile target resolution call to omit undefined env/defaultEnv under exactOptionalPropertyTypes.
- Documented provenance functionality in a dedicated guide and updated the STAN assistant guide.
- Refined dynamic option examples in assistant/human guides (canonical naming).
- Decomposed `guides/stan-assistant-guide.md` into sub-guides (`env`, `editing`, `cli`, `authoring`, `plugins`) to satisfy 300-LOC constraints while maintaining content.
- Documented single-plugin subcommand dynamic help pattern in assistant and user guides.
- Documented canonical subcommand/resolver patterns in assistant and user guides (based on entity-client-dynamodb interop).
- Enumerated all root and plugin options in config guides and assistant guides.
- Exported provenance types from package root to improve DX for GetDotenvCliCtx consumers.
- Refactored codebase to use `radash` for simplification (`omitUndefined`, `spawnEnv`, `cmd` plugin, build scripts).
- Removed `src/util/omitUndefined.ts` and updated `src/core/GetDotenvOptions.ts` to use `radash.shake` directly.
- Hoisted utility functions (`silentLogger`, `requireString`, `assertByteLimit`, `toNumber`, `getAwsRegion`, help utils) from downstream to `get-dotenv`.
- Added tests for new utility functions and fixed TypeDoc comments.
- Hoisted additional helpers: `ensureForce` (cliHost) and number parsers (`parseFiniteNumber`, `parsePositiveInt`, `parseNonNegativeInt`).
- Exported `applyIncludeExclude` from package root and added TypeDoc comments.