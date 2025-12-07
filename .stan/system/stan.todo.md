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

- passOptions helper: typecheck/lint fixes
  - Coerced service options to Partial<TOptions> for resolveAndLoad under
    exactOptionalPropertyTypes; this is safe because TOptions extends
    GetDotenvOptions and the service layer yields that shape.
  - Removed a stray unbound method expression to satisfy ESLint
    (no-unused-expressions, unbound-method) in passOptions.ts.

- Helpers decomposition (small files)
  - Added src/cliHost/passOptions.ts to install preSubcommand/preAction hooks;
    GetDotenvCli.passOptions() now delegates to this helper to keep the class
    lean and align with “one function per file” guidance.
  - Kept attachRootOptions as a separate pure builder; the class method is a
    thin delegate.
  - Restored InferPluginConfig type export in the cliHost barrel to satisfy
    src/index.ts and avoid downstream breaking changes.
- Host refactor: unify GetDotenvCli and decompose helpers
  - Removed the thin subclass in cliHost/index.ts and moved attachRootOptions()
    and passOptions() onto the core GetDotenvCli class.
  - Decomposed readMergedOptions into src/cliHost/readMergedOptions.ts (single
    function) and re‑exported it to preserve existing import paths
    (@/src/cliHost/GetDotEnvCli and the barrel).
  - Simplified the cliHost barrel to re‑export the unified class and types only.
  - Kept attachRootOptions/resolveCliOptions as pure helpers; the class
    delegates to them to keep modules small and focused.

- Batch logger wiring: preserve base logger through passOptions
  - Fixed host passOptions to merge provided defaults over baseRootOptionDefaults
    (instead of replacing them). This guarantees the base logger (console) is
    always present in the merged CLI options bag and flows through to plugin
    actions and services. Removed the implicit runtime “fallback to console” in
    the failing path by ensuring the merged bag itself carries the logger, which
    plugins pass along explicitly.
  - Relaxed resolveCliOptions generic usage in cliHost/index.ts to satisfy
    exactOptionalPropertyTypes and cast once when persisting the merged bag.
  - getDotenvCliOptions2Options now returns a service options object that always
    includes the required logger field (console), satisfying typecheck without
    relying on downstream schema defaults.

- Typecheck/lint cleanup (cliHost/index)
  - Replaced inline import() type annotations with import type for ScriptsTable,
    Logger, and RootOptionsShapeCompat (consistent-type-imports).
  - Annotated logger as Logger in both hooks to avoid unsafe assignment/member
    access/call warnings and to keep the base logger wired without fallbacks.

- Logger: strict contract + schema defaults; remove coalescing
  - Defined Logger as Pick<Console, 'log' | 'info' | 'error' | 'debug'> for a
    concrete compile-time contract. Defaulted logger to console in the    programmatic schema so runtime presence is guaranteed. Switched host and
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