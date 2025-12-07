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

- Logger: strict contract + schema defaults; remove coalescing
  - Defined Logger as Pick<Console, 'log' | 'info' | 'error' | 'debug'> for a
    concrete compile-time contract. Defaulted logger to console in the
    programmatic schema so runtime presence is guaranteed. Switched host and
    cmd plugin to use merged/validated logger directly (no “?? console”),
    emitting via logger.error/info/log/debug. Nested env JSON continues to omit
    logger as before.

- Typecheck fixes: generic plugin-config wrappers and readonly whitelist
  - Introduced generic setPluginConfig/getPluginConfig over the WeakMap
    to carry TOptions/TConfig and eliminate defaulting to
    GetDotenvOptions in store helpers. Replaced underscored helpers and
    updated computeContext/definePlugin call sites. Resolves TS2379 with
    exactOptionalPropertyTypes.
  - Switched RootOptionsShape.entropyWhitelist to ReadonlyArray<string>
    to align with readonly tuple defaults and remove readonly→mutable
    cast issues (TS2352). No runtime changes.

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

- Cast/fallback pass (continued):
  - index: remove intermediate 'unknown' in defaults cast.
  - cliHost/index: eliminate remaining double casts; keep only precise single casts
    and rely on helper defaults instead of manual fallbacks.
- Tests: batch plugin specs now install passOptions (and attachRootOptions) on
  the host to satisfy the stricter readMergedOptions invariant (no legacy fallback).

- Cmd plugin: added Zod config schema with optional `expand` flag and plumbed
  the value into the alias path. Alias expansion now honors merged CLI override
  first, then plugin-config default; default behavior remains “expand”.