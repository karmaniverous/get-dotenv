# Development Plan

When updated: 2025-12-08T00:00:00Z

## Next up (near‑term, actionable)

- Commander generics threading (host interface and class)
  - Update GetDotenvCliPublic to mirror Commander generics:
    <TOptions, TArgs extends any[] = [], TOpts extends OptionValues = {},
    TGlobal extends OptionValues = {}> extends
    Command<TArgs, TOpts, TGlobal>.
  - Implement a typed ns<Usage>() that returns
    GetDotenvCliPublic<TOptions, [...TArgs, ...InferCommandArguments<Usage>], {}, TOpts & TGlobal>.
  - Update GetDotenvCli to mirror generics and override createCommand(name?)
    to return new GetDotenvCli<TOptions>(name).

- Plugin typing updates (Commander‑generic aware)
  - Extend definePlugin and PluginWithInstanceHelpers type parameters to include
    Commander generics (defaulted) so plugin setup/afterResolve receive a fully
    generic host without casts.
  - Ensure exported types preserve identity and remain ergonomic at call sites
    (no explicit generics required by default).

- Helper audit (avoid generics erasure)
  - Review all helpers that accept a command instance:
    - Keep CommandUnknownOpts only in read‑only helpers (no chaining), e.g.,
      readMergedOptions, cmd alias executor, batch actions.
    - Do not call .command()/.argument()/.option()/.addOption()/.action()
      on values typed as CommandUnknownOpts.
  - Where hooks require Commander.Command, adapt wrappers to accept the hook
    parameter and delegate to read‑only helpers without chaining.

- Built‑in plugins refactor (aws, batch, cmd, init, demo)
  - Use typed cli.ns('id') return to chain .description/.option/.argument.
  - Remove manual casts on opts/action parameters; rely on extra‑typings
    inference for .action((...args, opts, cmd) => …).
  - Keep behavior identical; adjust types only.

- Typecheck and tests
  - Run TypeScript typecheck and update tests to match inferred action/opts
    types (remove casts where no longer needed).
  - Fix any Commander type references in tests to align with extra‑typings
    (e.g., CommandUnknownOpts used only for read‑only traversal).

- Docs and templates
  - Update Authoring guides to reflect typed ns() and Commander‑generic
    inference (no casts needed in plugin actions).
  - Verify Shipped plugin docs/examples remain accurate after the refactor.
  - Confirm scaffolded templates continue to compile and use cli.ns('…')
    naturally without casts.

- Tooling and verification
  - Ensure verify-bundle still recognizes '@commander-js/extra-typings' as
    the canonical external Commander reference.
  - Run verify-types and verify-tarball; adjust checks only if public types
    move (should not be necessary beyond additive generics).

- Semver and migration
  - Bump major version due to breaking type signature changes (no runtime
    changes).
  - Add migration notes: typed ns(), removal of any lingering non‑generic
    host usages, and guidance to rely on inference in plugin actions.

- Release
  - Build, typecheck, lint, test, smoke, verify bundle/tarball.
  - Publish (pre‑release as needed), then stable.

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

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