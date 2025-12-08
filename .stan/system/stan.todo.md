# Development Plan

When updated: 2025-12-08T00:00:00Z

## Next up (near‑term, actionable)

- Built‑in plugins audit (aws, batch, cmd, init, demo)
  - Confirm typed cli.ns('id') is used where appropriate (cmd intentionally
    uses createCommand for help formatting; document rationale).
  - Remove any residual casts on opts/action parameters if inference suffices.

- Docs and templates
  - Update Authoring guides to reflect typed ns() and Commander‑generic
    inference (no casts needed in plugin actions).
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
- Helper audit (read‑only helpers & hooks):
  ensured CommandUnknownOpts is used only in read‑only traversal helpers
  (no Commander chaining), and hook wrappers delegate without erasing
  generics.

- Local verification: re‑ran typecheck, lint, and test suites; all
  green including E2E flows (help, alias termination, CLI core).

- Tooling: verify‑bundle import check targets
  '@commander-js/extra-typings' as the canonical external Commander
  reference; kept in sync with bundling strategy.