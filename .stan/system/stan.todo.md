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

- Lint: batch default action emit call
  - Replace unnecessary nullish-coalescing fallback and stored method variable
    with a direct `loggerLocal.error(...)` call to satisfy
    `no-unnecessary-condition` and `unbound-method` rules.

- Typecheck/lint: batch default action and cmd alias hook
  - batch default action: provide a concrete fallback for list shell
    (`?? false`) to satisfy `string | boolean | URL` and remove redundant
    `?? undefined` from env bag retrieval. Adjusted method presence checks
    to probe via `unknown`-typed properties and invoke with `.call(...)` to
    avoid `unbound-method` lint while preserving behavior.
  - cmd alias: hook callbacks now accept Commander `Command` as required by
    Commander’s hook signatures; cast when delegating to `maybeRun` (which
    accepts `CommandUnknownOpts`). Resolves TS2345 variance in hook wiring
    without changing runtime behavior.
  - Re-run lint/typecheck locally: expected clean after these fixes.

- Alias/batch typing & lint cleanup
  - cmd/alias: typed maybeRun and hook params as CommandUnknownOpts; fixes TS2304
    and unsafe-argument lint in hook callbacks.
  - batch default action: bind opts/optsWithGlobals via .call and simplify
    list shell fallback (no unnecessary nullish-coalescing). Keeps behavior
    unchanged while satisfying unbound-method and no-unnecessary-condition.
- Fix Commander variance in cmd alias wiring and batch action lint
  - cmd/alias: accept CommandUnknownOpts for `_cmd` to match a `[command...]`
    child, eliminating the tuple variance TS2345.
  - batch default action: typed positional args as string[], replaced chained
    nullish shell fallback with explicit selection, and reworked parent opts
    retrieval to avoid unbound-method lint. Preserved runtime behavior (parent
    --list only; no local -l scan).
- Typing cleanup: adopt CommandUnknownOpts across helpers/actions
  - GetDotenvCli.tagAppOptions now accepts (root: CommandUnknownOpts) to align
    with tagAppOptionsAround and avoid Commander tuple variance.
  - tagAppOptionsAround retyped with precise typeof root.addOption to remove
    unsafe assignments; no Command import required.
  - index.ts: recursive configureOutput now uses CommandUnknownOpts, fixing
    action signature variance.
  - batch actions: removed explicit Command annotations; actions now accept
    (thisCommand: CommandUnknownOpts). Dropped unused local list scan; only
    parent --list is honored. Replaced double-negation (!!) with Boolean().
  - cmd and demo plugins: action third param now CommandUnknownOpts with guarded
    parent opt retrieval (optsWithGlobals/opts) to avoid generics mismatches.
- Refactor: drop redundant inline casts for merged options; destructure
  - cmd plugin (index): destructured logger/debug/capture/scripts/shell/trace/redact/entropy flags;
    simplified capture computation and removed per‑property casts.
  - cmd alias path: same refactor; simplified debug/shell/trace/redact/entropy access;
    streamlined envBag build for nested invocations.
  - aws plugin: use bag.capture directly.
  - passOptions: access merged.strict directly (no cast).
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

- GetDotenvCli: extract larger method bodies to helpers
  - Constructor setup moved to initializeInstance (help config, header hook,
    lazy context resolver).
  - Options resolution context computation extracted to resolveAndComputeContext.
  - Version lookup factored to readPkgVersion; brand remains a thin delegate.
  - Help composition moved to buildHelpInformation.
  - tagAppOptions wrapper extracted to tagAppOptionsAround.
  - Plugin setup recursion and afterResolve recursion extracted to
    setupPluginTree and runAfterResolveTree, respectively.

- Fixes after helper extraction
  - GetDotenvCli now imports GROUP_TAG from ./groups to restore grouped help
    tagging and resolve runtime ReferenceError/TS2304.
  - tagAppOptions now delegates to tagAppOptionsAround to remove duplicate
    monkey‑patch logic and clear lint for unused imports.

- Cmd alias: type-safe scripts usage in maybeRunAlias
  - Removed unknown→Record casts; use ScriptsTable | undefined directly and pass
    to resolveCommand/resolveShell. No behavior change; safer typing.

- Cmd alias: simplify entOpts and remove casts in catch
  - Refactored EntropyOptions/RedactOptions construction to concise object
    literals and introduced a type guard to extract exitCode without casts.

- Init plugin: inherit logger; remove logger option and unsafe opts cast
  - Dropped plugin-scoped logger in init; readMergedOptions supplies the base
    logger inside the action. Replaced Record<string, unknown> opts cast with a
    typed local shape for flags. Updated tests to call initPlugin() without args.

- Typecheck/lint: finalize alias hook and batch action fixes
  - cmd alias: remove explicit Commander.Command annotation in hook callbacks
    to let Commander infer the parameter type; continue passing the callback
    argument to maybeRun with a safe cast to CommandUnknownOpts. Resolves the
    remaining TS2345 without changing behavior.
  - batch default action: drop unnecessary `?? false` on a non-nullable root
    shell; use Reflect.get to retrieve methods and invoke with `.call(...)` to
    avoid unbound-method lint.

- Typecheck/lint: finalize batch list shell and alias hook adapter
  - batch default action: ensure `listShell` never undefined (fallback to
    `false`), avoid `??` in config fallbacks (ternaries), and replace
    `.call(...)` with `Reflect.apply(...)` for optsWithGlobals/opts to
    eliminate unbound-method lint.
  - cmd alias: adapt hook forwarding to accept `unknown` and cast once inside
    the wrapper to Commander `Command` for maybeRunAlias, removing TS2345.

- Build: resolve residual rollup TypeScript warning from templates
  - Constrained the TypeScript program used by rollup to `src/**` by adding
    `"include": ["src/**/*.ts"]` in tsconfig.base.json so files under
    `templates/**` are never part of rollup’s diagnostics set.
  - Added a `paths` mapping for `"@karmaniverous/get-dotenv"` → `src/index.ts`
    to keep the local template import resolvable in editor/typecheck contexts
    without affecting runtime bundling.
- Build: silence config-plugin TypeScript warning
  - The “loaded rollup.config.ts with warnings” line came from the config
    plugin that compiles rollup.config.ts using tsconfig.json. That program was
    still scanning templates/** and reporting unresolved imports in template TS
    files. Updated tsconfig.json "exclude" to omit templates/** (and other
    non-build dirs), removing the stray warning.
- Build: exclude templates from TypeScript and copy to dist
  - Added top-level `"exclude"` to tsconfig.base.json so templates/\*_ (and other
    non-build dirs) are never included in the TypeScript program used by rollup
    or rollup-plugin-dts. Prevents the “templates/config/ts/_.ts” warnings and
    avoids compiling templates.
  - Added rollup-plugin-copy to mirror `templates/` into `dist/templates` with
    `copyOnce` to avoid repeated copies in the multi-output build.

- Lint: enable typed ESLint for template TS files
  - Added tsconfig.eslint.json that includes both `src/**/*.ts` and
    `templates/**/*.ts`, with `noEmit` to keep this config lint-only.
  - Updated eslint.config.ts to set typescript-eslint parserOptions.project
    to an array: `['./tsconfig.json', './tsconfig.eslint.json']`. This lets
    ESLint type-check templates while the build configs continue to exclude
    them.
- Build: fix path alias resolution for rollup TypeScript steps
  - Added `"@/*": ["*"]` to tsconfig.base.json so @rollup/plugin-typescript can
    resolve `@/…` imports (the alias plugin alone doesn’t satisfy TS resolution).
  - Pointed rollup-plugin-dts at `./tsconfig.base.json` to share the same paths
    and excludes, eliminating stray type-bundling warnings.

- CI: update verify-bundle for @commander-js/extra-typings
  - Revised tools/verify-bundle-imports.js to treat
    '@commander-js/extra-typings' as the canonical external Commander
    reference (with 'commander' accepted for back-compat). Prevents false
    failures after migrating imports.
