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

- Converter & aws help DX polish
  - Use omitUndefinedRecord in getDotenvCliOptions2Options to drop undefined
    vars consistently at the boundary.
  - Switch aws plugin flags to plugin.createPluginDynamicOption so help shows effective defaults.

- AWS plugin: remove set-env option; unconditional env writes + typing DX
  - Removed --set-env/--no-set-env and the setEnv config key. The plugin now
    always writes AWS_REGION (+ AWS_DEFAULT_REGION if unset) and credentials to
    process.env in both afterResolve and the aws subcommand action.
  - Docs updated to remove setEnv references and reflect unconditional behavior.
  - Improved plugin DX: createPluginDynamicOption now defaults its type
    parameter to the plugin’s TConfig, so call sites no longer need to
    specify the generic (in aws and other plugins).
- Lint: suppress no-unnecessary-type-parameters in definePlugin (file-level) to allow generic-default DX without false positives.

- AWS plugin defaults and ctx mirror hardening
  - Removed add-ctx flag and behavior; the plugin now always publishes only
    non‑sensitive metadata (profile, region) under ctx.plugins.aws.
  - Tied set-env effective default to the root --load-process (when unset);
    help text clarifies “(default: follows --load-process)”.
  - Updated guides/shipped/aws.md to reflect the new behavior and safer mirroring.
