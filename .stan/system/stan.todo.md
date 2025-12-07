# Development Plan

When updated: 2025-12-07T00:00:00Z

## Next up (near‑term, actionable)

- CI confirmation
  - Re-run typecheck and full test suite in CI to confirm green after the final
    alias compat-cast patch.

- Docs polish
  - Replace the local tsdoc/syntax disable with a wording tweak if a cleaner
    fix is found.

- Release preparation
  - Update CHANGELOG.md (npm run changelog) and bump version.
  - Verify bundle/tarball (npm run verify:bundle, verify:tarball) and run smoke.
  - Publish (pre-release if needed, then stable).

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

- Type casts: remove unnecessary casts and ease help config typing
  - helpConfig: toHelpConfig now accepts Partial<GetDotenvCliOptions>, removing
    cast-at-call-site patterns.
  - Updated call sites in cliHost/index.ts and index.ts.
  - computeContext: dropped redundant "as unknown as ZodObject" by asserting
    plugin schema presence; removed unused ZodObject import.

- Cast/coalesce cleanup: remove unnecessary casts and ?? {}
  - cliHost/index: pass merged directly to getDotenvCliOptions2Options; drop
    RootOptionsShapeCompat import; rely on toHelpConfig to default plugins
    (remove “?? {}”).
  - index: remove “?? {}” at help-time toHelpConfig call.

- Cast/fallback sweep: remove more unnecessary casts and coalescing
  - cliHost/index: replace “as unknown as …” with single precise casts;
    simplify logger/strict access via single typed casts; rely on
    toHelpConfig for plugin defaulting.
  - computeContext: drop identity casts when storing plugin config; reduce
    optionsResolved cast to a single “as TOptions”.
