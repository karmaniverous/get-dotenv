# Development Plan

When updated: 2025-12-06T00:00:00Z

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

- Requirements/doc: typed env, config builder, Zod canonical options, loader flag removal
  - Updated stan.requirements.md to document:
    - ESM-only distribution and exports.
    - Canonical options types derived from Zod schemas.
    - Typed config builder for JS/TS configs (defineGetDotenvConfig).
    - Optional typed getDotenv<Vars>() env shape and explicit removal of useConfigLoader.

- Fix typecheck/lints (schema-derived overlays and resolver generics)
  - Use RootOptionsShape & ScriptsTable in resolveCliOptions call sites (cliHost, index, cmd alias).
  - Cast merged bags to GetDotenvCliOptions where needed for downstream DX (logger/trace/capture/etc.).
  - Add scripts type guard in cmd alias; import ScriptsTable; remove unsafe casts. Escape TSDoc angle brackets.

- Fix typecheck/lints (schema-derived overlays and resolver generics)
  - Use RootOptionsShape & ScriptsTable in resolveCliOptions call sites (cliHost, index, cmd alias).
  - Cast merged bags to GetDotenvCliOptions where needed for downstream DX (logger/trace/capture/etc.).
  - Add scripts type guard in cmd alias; import ScriptsTable; remove unsafe casts. Escape TSDoc angle brackets.
  - Follow-up: compat casts and TSDoc cleanup
  - Cast to RootOptionsShapeCompat at getDotenvCliOptions2Options boundaries in
    cliHost and cmd alias to satisfy exactOptionalPropertyTypes.
  - Widen readonly defaults via unknown when passing baseRootOptionDefaults into
    resolveCliOptions generics (help-time path).
  - Escape "\<alias\> v\<version\>" in TSDoc; locally disable tsdoc/syntax in cliCore/GetDotenvCliOptions.ts.

- Alias converter boundary: compat cast
  - plugins/cmd/alias.ts: import RootOptionsShapeCompat and cast mergedBag to
    RootOptionsShapeCompat when calling getDotenvCliOptions2Options.

- Helpers for inference polish (omitUndefined/toHelpConfig)
  - Added util/omitUndefined (omitUndefined and omitUndefinedRecord) and refactored
    computeContext/resolveGetDotenvOptions to use them (replacing ad‑hoc Object.entries
    filters for exactOptionalPropertyTypes).
  - Added cliHost/helpConfig.toHelpConfig and updated host hooks and createCli()
    help path to centralize help‑bag construction for dynamic option evaluation,
    reducing inline casts while keeping types precise.

- Typecheck/lint follow‑through (omitUndefined boundary & unused import)
  - Made Zod-parse boundary explicit in computeContext so omitUndefined preserves
    the GetDotenvOptions overlay; removed an unused type import in cliHost/index.ts.