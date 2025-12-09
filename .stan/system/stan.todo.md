# Development Plan

When updated: 2025-12-09T00:00:00Z

## Next up (near‑term, actionable)

- Decompose long module: src/cliHost/definePlugin.ts
  - Split into: contracts (public types), instance helpers, and dynamic option
    helpers. Add paired tests for each smaller module.

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
