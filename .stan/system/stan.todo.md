# Development Plan

When updated: 2025-12-09T00:00:00Z

## Next up (near‑term, actionable)

- Docs and templates
  - Update Authoring guides to reflect required ns, host‑created mounts,
    and override API. Keep Commander generics guidance (no casts needed in actions).
  - Verify Shipped plugin docs/examples remain accurate after the refactor.
  - Confirm scaffolded templates continue to compile and use cli.ns('…')
    naturally without casts.

- Tooling and verification
  - Run build and verification scripts locally: build, verify:bundle,
    verify:types, verify:tarball. Adjust checks only if public types move.
  - Keep verify-bundle assertions targeting '@commander-js/extra-typings'.

- Semver and migration
  - Bump major version due to breaking type signature changes (no runtime changes).
  - Add migration notes: typed ns(), removal of any lingering non‑generic
    host usages, and guidance to rely on inference in plugin actions.
  - Include the namespace/mount pivot and path‑keyed config/help in the notes.

- Release
  - Build, typecheck, lint, test, smoke, verify bundle/tarball.
  - Publish (pre‑release as needed), then stable.

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

- createCli: compose-first, runner return, and defaults precomposition
  - Simplified API: createCli returns the runner function directly
    (argv?: string[]) and defaults to process.argv, slicing internally
    when full argv is provided.
  - Introduced compose?: (program) => program for plugin wiring; removed
    the need to surface configureOutput/exitOverride as createCli options.
  - Preconfigure defaults BEFORE composition so they apply via inheritance:
    default configureOutput on the root, tests-only exitOverride, and a
    no-op root action so root-only flows trigger hooks. compose() may
    override any of these.

- Root no-op action to trigger hooks
  - Added a no-op root action in createCli() and initializeInstance() so
    passOptions preAction hooks run for root-only flows (e.g., -l) and alias
    (--cmd ...) before Commander prints help.
- Move aws debug to stderr to avoid stdout pollution breaking E2E assertions.

- Diagnostics: add GETDOTENV_DEBUG breadcrumbs
  - createCli.run: log argv, help routing decisions, and parse start
  - passOptions hooks: log rawArgs and picked merged flags (preSubcommand/preAction)
  - cmd parent invoker: log rawArgs, child names, aliasKey/value, and decision flags (provided/hasSub)
- Requirements updated: adopt host‑created mounts with required plugin
  namespaces, enforce sibling uniqueness with override guidance, make id
  internal‑only (Symbol), key config/help by realized path, and render leaf‑only
  plugin group headings. Document minimal override API `.use(plugin, { ns })`.

- Thread Commander generics through host interface and class:
  added defaulted Commander generics to GetDotenvCliPublic and
  GetDotenvCli, implemented typed ns<Usage>() with duplicate-name
  guard, and kept createCommand() returning a proper GetDotenvCli.

- Fix typecheck & lint after generics threading:
  widened helper generics in registerPlugin/runAfterResolve to accept
  any Commander generics on the host, and replaced any[] with
  unknown[] to satisfy no-explicit-any.

- Generalize plugin interface over Commander generics and thread through:
  added TArgs/TOpts/TGlobal to GetDotenvCliPlugin and carried those
  generics into host plugin list, use(), and helpers. Broadened
  readConfig/createPluginDynamicOption host argument types to accept
  unknown[]/OptionValues for ergonomic assignability.

- Generalize compute/resolve helpers over Commander generics so the
  host can pass its plugin list without narrowing: updated
  computeContext and resolveAndComputeContext to accept plugins with
  Commander argument/option/global generics.

- Helper audit (read‑only helpers & hooks):
  ensured CommandUnknownOpts is used only in read‑only traversal helpers
  (no Commander chaining), and hook wrappers delegate without erasing
  generics.

- Before propose any code changes, enumerate all source files and flag any file whose length exceeds 300 lines.
- This rule applies equally to newly generated code:
  - Do not propose or emit a new module that exceeds ~300 lines. Instead, return to design and propose a split plan (modules, responsibilities, tests) before generating code.
- Present a list of long files (path and approximate LOC). For each file, do one of:
  - Propose how to break it into smaller, testable modules (short rationale and outline), or
  - Document a clear decision to leave it long (with justification tied to requirements).
- Do not refactor automatically. Wait for user confirmation on which files to split before emitting patches.

- Fix: assign aws plugin afterResolve on the plugin object (was a free
  function), resolving parse/type errors blocking many tests.

- Lifecycle: call install() from passOptions() to ensure parent-level
  options (e.g., --cmd) and namespaced commands are registered before
  Commander validates argv. This also makes compose.mount unit test
  pass without parse(), as commands now exist after passOptions().

- Lint: remove redundant union with unknown in registerPlugin installer
  and flatten aws parent/child composition in src/index.ts to a const
  before .use() to avoid confusing-void/unsafe-argument warnings.

- Help routing: await program.install() at the beginning of createCli().run()
  so subcommands/aliases are registered before inspecting argv for “-h” routing
  (fixes E2E subcommand help assertions for “batch -h” and “aws -h”).

- Fix: eliminate duplicate subcommand registration by guarding concurrent
  plugin installation. Added a private `_installing?: Promise<void>` to the
  host and reworked `install()` to await an in‑flight install rather than
  re‑running setup. This preserves early install from `passOptions()` and
  avoids races with `createCli().run()`; resolves “cannot add command 'cmd'”
  failures across interop and E2E help/CLI tests.

- Typing: simplify plugin `setup` return type to a single union
  `void | GetDotenvCliPublic | Promise<...>` so object‑literal functions that
  return a mount satisfy the contract without overloads. This fixes TS2769
  errors in unit tests and shipped plugins (aws/batch/cmd/init/demo) and keeps
  the nested composition API intact.

- Lint/typing: replace `void` in union return types with `undefined` to satisfy
  @typescript-eslint/no-invalid-void-type, and broaden plugin `setup` to accept
  either a GetDotenvCliPublic or a Commander Command (structural) since chained
  `.argument().action()` narrows type to Command. Adjust install() generic call
  to pass a GetDotenvCliPublic view of `this` and stop clearing `_installing`
  to `undefined` under exactOptionalPropertyTypes.

- Typecheck fix: accept Commander generics in plugin setup return type
  (Command<unknown[], OptionValues, OptionValues>) and add explicit
  `return undefined` in setup functions that do not return a mount
  (demo, cmd, init, batch, aws/whoami, unit test). No runtime changes.

- Typecheck fix (final): add explicit `return undefined` in the batch plugin
  setup function to satisfy the widened setup return union. No runtime changes.

- Fix afterResolve traversal: iterate child plugin entries correctly
  (`for (const child of p.children) await run(child.plugin)`), resolving
  runtime TypeError “p.children is not iterable” and associated E2E failures.

- Attach cmd alias to parent: register the `--cmd` option and hooks on the
  parent (root) command so the alias is recognized at the root, fixing
  “unknown option --cmd” and restoring root help grouping (“Plugin options — cmd”).

- Default cmd action signature: switch to a rest‑args handler compatible with
  extra‑typings; derive `thisCommand` and positional argv safely.

- Installer generics: simplify to existential Commander generics
  (unknown[]/OptionValues) and remove `any` in `registerPlugin`, fixing TS2345
  and lint no‑explicit‑any reports.

- Cmd default subcommand: declare `[command...]` positional to accept payload
  tokens, resolving “too many arguments for 'cmd'” failures across E2E.

- Installer synchronous mounts: create mounts and run setup synchronously when
  possible, and only await Promises when returned. This eliminates the race
  window in compose.mount tests so children are visible immediately after
  passOptions().

- Cross-instance context/options: make getCtx/hasCtx/getOptions climb to the
  root instance when local storage is unset so plugin actions called on
  subcommand mounts can access the root context/options. Fixes aws subcommand
  “Dotenv context unavailable” in unit tests.

- Host install caller generics: update setupPluginTree invocation to the
  simplified single type parameter signature and existential Commander generics
  to satisfy TS2558 after refactor.

- Windows case-sensitivity fix for GetDotenvCli imports:
  unified all imports/re-exports from './GetDotEnvCli' to './GetDotenvCli'
  across cliHost modules and tests to resolve TS1261 in typecheck on Windows.

- Alias unit tests termination guard:
  updated cmd alias executor (maybeRunAlias) to suppress process.exit() when
  running under tests (GETDOTENV_TEST or VITEST_WORKER_ID present), preventing
  unexpected process termination during unit tests while retaining termination
  behavior for E2E/real runs.

- Tests-only exitOverride when constructing GetDotenvCli directly:
  installed under-tests exitOverride in initializeInstance so unit tests using
  the host directly do not trigger process.exit on Commander help/version
  flows. This addresses alias unit test exits.

- DRY Batch 1: centralized dynamic/trace/dotenv writer and AWS context.
  - Added: src/env/dynamic.ts (applyDynamicMap/loadAndApplyDynamic).
  - Added: src/util/dotenvFile.ts (writeDotenvFile).
  - Added: src/diagnostics/trace.ts (traceChildEnv).
  - Added: src/cliHost/paths.ts (flattenPluginTreeByPath/realizedPathForMount).
  - Added: src/plugins/aws/common.ts (applyAwsContext).
  - Updated: getDotenv.ts and cliHost/computeContext.ts to use new helpers.
  - Updated: cmd/runner.ts to use traceChildEnv; batch exec to use composeNestedEnv.
  - Updated: aws/index.ts to applyAwsContext in action/afterResolve.
  - Updated: cliHost/invoke.ts to export stripOne; removed unused maybeRunAlias.ts.

- Amendment: Batch 1 follow-up — fix typecheck and lint issues.
  - Adjust cmd/runner trace args for exactOptionalPropertyTypes.
  - Fix AWS debug breadcrumb to reference out.\*; TSDoc escapes; remove unused import.

- DRY Batch 2: exec normalization.
  - Added private \_execNormalized() in cliHost/exec.ts to centralize plain/shell
    and capture/inherit flows; refactored runCommand and runCommandResult to use it.

- Amendment: exec normalization follow-up — exactOptionalPropertyTypes-safe opts.
  - Build opts for \_execNormalized conditionally to omit undefined keys.

- DRY split: definePlugin decomposition
  - Created src/cliHost/definePlugin/contracts.ts (types only).
  - Created src/cliHost/definePlugin/helpers.ts with definePlugin(), readConfig,
    and createPluginDynamicOption. Enforced sibling-name uniqueness at composition.
  - Slimmed src/cliHost/definePlugin.ts to a thin re-export wrapper.
  - Added unit tests: src/cliHost/definePlugin/helpers.test.ts covering sibling
    uniqueness and dynamic option injection (help-time).

- Templates and scripts consistency
  - Updated template hello plugin to use ns (not id) and preserved dynamic help and
    instance-bound config access for parity with shipped plugins.
  - Rewired the template CLI skeleton to mirror createCli wiring (normalized help
    output, root options, passOptions, minimal branding) while only installing the
    hello template plugin.
  - Fixed smoke script to route command payloads via the cmd subcommand for steps 1–3.
  - Resolved Rollup multi-chunk error by enabling inlineDynamicImports on all ESM outputs.
  - Removed legacy "demo" plugin expectations from verify-package and verify-tarball,
    and limited verify-bundle import checks to cliHost.mjs.

- Type tooling and scaffolder tests
  - tsconfig.json: removed local "paths" override to inherit complete mappings
    from tsconfig.base.json (including @karmaniverous/get-dotenv → src/index.ts),
    and included templates/\*\* for typechecking so editor/tsc resolve createCli
    to source (new callable signature).
  - init scaffolder tests: stopped asserting CLI-name token substitution inside
    template files; now validate compose-first wiring/alias in CLI index and
    generic hello plugin content.

- Helper: getRootCommand and template usage
  - Added src/cliHost/getRootCommand.ts to return the true root Command
    from any mount/action. Exported via cliHost barrel.
  - Updated template hello plugin to use getRootCommand for deriving the root name.

- Subpath CLI export and build outputs
  - Added optional package.json export "./cli" → dist/cli.mjs with types at dist/cli.d.ts.
  - Updated Rollup to emit dist/cli.mjs and dist/cli.d.ts from src/cli/index.ts.
  - Adjusted CLI binary enumeration to include only subdirectories under src/cli (prevents files like createCli.ts from being treated as commands).
  - Updated templates (and README examples) to prefer importing createCli from '@karmaniverous/get-dotenv/cli' while keeping the root export available.

- Core/runtime cycle removal
  - Eliminated the core ↔ cliHost circular dependency by removing the runtime
    import of baseGetDotenvCliOptions from the host barrel in
    src/core/GetDotenvOptions.ts. Core now imports neutral defaults from
    src/defaults (baseRootOptionDefaults) and uses type-only imports from cliHost/types. Behavior unchanged.

- Verify scripts: update verify-types fallback to read src/env/overlayEnv.ts (with legacy overlay.ts fallback) so env overlay type check matches current implementation.

- Knip config: replace stale entry "src/env/overlay.ts" with "src/env/index.ts" to remove configuration hint and reflect current source layout.
