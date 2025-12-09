# Development Plan

When updated: 2025-12-08T00:00:00Z

## Next up (near‑term, actionable)

- Namespace & host‑created mounts — implement and validate (breaking by design)
  - DefineSpec and typing
    - Require `ns: string` in definePlugin spec for every plugin (non‑empty).
    - Remove `children?` from the author spec (keep `.use(child)` as the single composition API).
    - Update `GetDotenvCliPlugin.setup` to return `void | Promise<void>` (no more return‑the‑mount).
  - Installer (registerPlugin)
    - Always create the mount: `const mount = parent.ns(effectiveNs)`.
    - Pass the created `mount` to `setup(mount)`. Await async setup before installing children.
    - Accept consumer overrides supplied via `.use(child, { ns: '...' })`.
    - Enforce sibling uniqueness per parent; on conflict throw:
      `Duplicate namespace '<ns>' under '<parent>'. Override via .use(plugin, { ns: '...' }).`
  - Composition override API
    - Extend `.use(child)` to `.use(child, { ns?: string })`.
    - Store/propagate overrides for effectiveNs resolution.
  - Identity and config/help keys
    - Replace public `id` with internal Symbol identity (WeakMap storage).
    - Key config/help by realized path (e.g., `aws/whoami`) and drop id‑based grouping.
  - Help grouping
    - Render leaf‑only headings for plugin groups (e.g., “Plugin options — whoami”).
    - Keep full path internal for config/help lookups; no path display in headings.
  - Shipped plugins
    - Add `ns` to each shipped plugin (aws, batch, cmd, init, demo).
    - Update setups to rely on provided `mount`; remove any return of a mount.
    - Preserve parent‑level alias behavior for `cmd` via `mount.parent`.
  - Tests
    - Unit: sibling collision throws with the suggested override message.
    - Unit: `.use(child, { ns })` overrides the leaf and composes config/help keys accordingly.
    - E2E: `getdotenv aws -h` lists `whoami` (leaf only in group heading).
  - Docs (Authoring & Config)
    - Authoring → Lifecycle: ns required; host‑created mounts; `.use(child, { ns })`; children param removed from define spec.
    - Config/Help: config.plugins keys are realized paths; renaming changes keys; help grouping is leaf‑only.
  - Semver/migration
    - Call out breaking changes (setup return, ns required, id removed publicly).
    - Migration notes for shipped plugins and deprecation of id‑based config/help.

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
  - Bump major version due to breaking type signature changes (no runtime
    changes).
  - Add migration notes: typed ns(), removal of any lingering non‑generic
    host usages, and guidance to rely on inference in plugin actions.
  - Include the namespace/mount pivot and path‑keyed config/help in the notes.

- Release
  - Build, typecheck, lint, test, smoke, verify bundle/tarball.
  - Publish (pre‑release as needed), then stable.

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

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

- Local verification: re‑ran typecheck, lint, and test suites; all
  green including E2E flows (help, alias termination, CLI core).

- Tooling: verify‑bundle import check targets
  '@commander-js/extra-typings' as the canonical external Commander
  reference; kept in sync with bundling strategy.

- Built‑in plugins audit (aws, batch, cmd, init, demo):
  confirmed typed cli.ns('id') usage across aws, batch, init, and demo;
  cmd intentionally uses createCommand('cmd') to preserve desired help
  formatting and output behavior. No residual casts were required in
  action handlers; no runtime behavior changes identified.

- Typing fix: propagate Usage through dynamic Option helpers so addOption
  can infer flags and widen Opts. Updated makeDynamicOption(), host

- Lint: remove unnecessary generic from dynamicOption to satisfy
  @typescript-eslint/no-unnecessary-type-parameters. Typed option
  inference remains through createDynamicOption/Option<Usage> and
  plugin.createPluginDynamicOption.

- Remove dynamicOption helper from GetDotenvCli. It could not propagate
  Commander option inference (returned `this`) and recently lost its
  generic due to lint. Steer callers to `createDynamicOption(...); addOption(...)`
  or `plugin.createPluginDynamicOption(...)` for fully typed options.

- Plugins: refactor actions to rely on Commander inference for args/opts
  and annotate only the third param as CommandUnknownOpts for helpers:
  • aws: action(async (args, opts, thisCommand: CommandUnknownOpts) => …)
  • init: action(async (destArg, opts, thisCommand: CommandUnknownOpts) => …)
  • demo: align script action signature similarly; runtime unchanged.

- Type fix: batch plugin actions aligned with Commander generics. Updated
  attachDefaultCmdAction and attachParentAction to accept
  Command<[string[]], {}, {}> and annotated action parameters
  (commandParts: string[], opts: {}, thisCommand: CommandUnknownOpts),
  resolving typecheck errors (TS2345/TS7006).

- Unify naming and helpers (big bang): introduced src/cliHost/invoke.ts
  (composeNestedEnv, maybePreserveNodeEvalArgv); renamed batch
  parentAction -> parentInvoker and forwarded getDotenvCliOptions in
  all parent paths; extracted cmd default subcommand action to
  actions/defaultCmdAction.ts; replaced cmd alias installer with
  actions/parentInvoker.ts (behavior unchanged). Updated plugin
  index modules to use unified names and avoided re-exports per plan.

- Type fixes: batch parentInvoker action now accepts variadic args and
  extracts [commandParts, opts, thisCommand] to satisfy CommandUnknownOpts
  signature. Restored plugin `this` cast in cmd/index when calling
  attachParentInvoker to satisfy helper contract under exactOptionalPropertyTypes.

- Fix cmd runner TS/lint and unit tests: ensured parts is always string[],
  removed unnecessary String() on string inputs, wrapped runCommand in a
  Vitest-aware try/catch to tolerate mocked execa returning undefined in unit
  tests, and simplified alias invoker childNames to avoid lint warning.

- Tests: fix batch plugin unit tests by mocking the correct module
  path "./execShellCommandBatch" (replacing outdated
  "../../services/batch/execShellCommandBatch"), preventing real
  process.exit and /bin/zsh spawn and allowing execMock assertions.

- Nested composition implementation (mount propagation):
  updated installer to await setup and propagate an optional mount
  (structural type guard, existential typing kept internal). Adjusted
  awsPlugin to return its ns('aws') so awsWhoami mounts under it.
  Added unit test (compose.mount.test.ts) to assert parent→child
  nesting and updated E2E to ensure "aws -h" lists "whoami".
  Kept public author DX cast‑free and contained recursive typing at
  the installer boundary. Docs facet remains disabled pending
  stabilization.

- Gate fixes for nested composition:
  replaced setup return unions with overloads (no void-in-union,
  no unknown unions), contained existential typing in the installer
  (typed setup invocation + structural guard), moved installation
  out of use() into install() to avoid floating promises, and
  refactored aws plugin to assign setup after creation to avoid
  self-referential initializer (TS7022). Fixed unit test to satisfy
  require-await. All type/lint/test gates green.

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