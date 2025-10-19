# Development Plan — get-dotenv

When updated: 2025-10-19T00:00:00Z
NOTE: Update timestamp on commit.

## Next up

### Interop amendment implementation (phase 1: foundations)

- Global interpolation helper and pass
  - Implement `interpolateDeep(obj, envRef)` (strings only; non-strings preserved).
  - Add Phase C global deep‑interpolation over CLI/config string options, explicitly excluding bootstrap keys used to compose `ctx.dotenv`.
  - Env precedence for Phase C: `{ ...process.env, ...ctx.dotenv }` with ctx taking precedence.
  - Unit tests: nested objects, arrays untouched, unknown semantics (embedded/isolated/default), bootstrap exclusion.

- Progressive per-plugin interpolation and validation
  - Before each plugin’s `afterResolve`, deep‑interpolate that plugin’s config slice (strings only) against `{ ...ctx.dotenv, ...process.env }` with process.env precedence.
  - Validate the interpolated slice (Zod where available) pre‑`afterResolve`; plumb errors as warnings by default and as fatal under `--strict`.
  - Ensure parent → children ordering; children “see” upstream env additions (e.g., AWS credentials).
  - Unit tests: parent sets env; child sees value; precedence and ordering; validation surfaces.

- Validation surfaces
  - JSON/YAML: support `requiredKeys: string[]` evaluated against final env.
  - JS/TS: support exported Zod schema; validate against final env; do not coerce by default.
  - CLI flag: `--strict` (not `--strict-env`) causes validation failures to exit non‑zero; default is warn-only.
  - Config mirror: `strict: boolean`.
  - Docs: add “Validation” section (JSON/YAML + JS/TS), CLI flag, and examples.

### Interop amendment implementation (phase 2: diagnostics and helpers)

- Redaction & entropy warnings
  - Implement `--redact` masking in `--trace` and `-l/--log` (default patterns + custom).
  - Implement entropy warnings with gating (min length; printable ASCII), Shannon bits/char threshold (default 3.8), once-per-key-per-run, with whitelist support.
  - CLI flags: `--entropy-warn` / `--no-entropy-warn`, `--entropy-threshold`, `--entropy-min-length`, `--entropy-whitelist`.
  - Config mirrors for all tunables.
  - Unit tests: mask sets; overlap/custom patterns; entropy gating and thresholds; once-per-key enforcement.

- Spawn environment normalization
  - Export `buildSpawnEnv(baseEnv)` that drops undefineds and normalizes TMP/HOME keys where helpful.
  - Adopt in cmd, batch, and aws forwarders.
  - Unit tests: shape preservation, undefined drops, cross-platform conditionals tolerated.

### Interop amendment implementation (phase 3: UX and docs polish)

- CLI help ordering
  - Ensure options with short aliases list before long-form-only flags; confirm `--strict` appears after short-aliased options in help.
  - Unit test: help capture & ordering assertions (host and generated CLI).

- Documentation
  - Requirements updated (this commit).
  - Add “Interpolation model” section to the Config and Plugin-first host guides.
  - Add “Validation” section (requiredKeys, Zod, `--strict`) with examples.
  - Expand “Diagnostics” docs: masking and entropy warnings (flags, defaults, gating).
  - Note explicit non-goal: no core key alias feature (use interpolation/dynamic).

- Back-compat and generator
  - Confirm the generated CLI retains `-c, --command` behavior unchanged.
  - Ensure new features are additive and disabled by default (where applicable).
  - Add release notes and migration guidance (no action required for existing users).

### Release checklist

- Lint, typecheck, unit + E2E (POSIX/Windows), smoke, build, verify:package, verify:tarball.
- Bump minor version; publish; tag; update changelog.
- Announce new features (validation, interpolation, diagnostics) with examples.

## Completed (recent)

- Shipped CLI branding and docs
  - Shipped CLI now calls `brand({ importMetaUrl })`, so `getdotenv vX.Y.Z`
    appears at the top of `-h` output. Version is resolved from the package
    nearest to the CLI source.
  - `GetDotenvCli.brand()` now defaults the help header to `<name> v<version>`
    when no explicit `helpHeader` is provided and a version was resolved.
  - Added “Branding the host CLI” guide section (how to call `brand` and what it
    prints) and “Adding app/root options and consuming them from a plugin”
    (using `tagAppOptions`, `passOptions`, and `readMergedOptions`).

- CI unblock: alias guard and help typing
  - Cmd alias: added aliasHandled guard in plugins/cmd/alias.ts to ensure
    alias-only invocations execute once when both preAction and preSubcommand fire. Fixes ReferenceError and stabilizes Windows alias E2E termination.
  - Help customization (host): visibleOptions now returns Option[] and filters
    on \_\_group === 'base'. afterAll handler now receives AddHelpTextContext
    and uses ctx.command for rendering. Removed unnecessary String() calls in
    option group rendering.
  - Patched Command.option wrappers annotated with this: Command in both
    src/cliCore/attachRootOptions.ts and src/cliHost/GetDotenvCli.ts to resolve
    TS2683 (“this implicitly has type any”).

- Grouped help and branding (host-only)
  - attachRootOptions now tags base options as 'base' (temporary wrappers).
  - cmd plugin alias tags the parent option as 'plugin:cmd'.
  - Host configures help to show Base options in the default section and renders
    App/Plugin sections after help with stable titles.
  - Added GetDotenvCli.tagAppOptions(cb) so downstream apps can tag their own
    root options as 'app' during a callback.

- Host decoupling from generator + lint fix
  - Moved GetDotenvCliOptions and Scripts types into cliCore
    (src/cliCore/GetDotenvCliOptions.ts) so the host has no dependency
    on the generator module. Re-export shim retained under generateGetDotenvCli.

- Docs formatting
  - Unwrapped manually wrapped paragraphs and bullet items in guides/cascade.md and guides/generated-cli.md per project formatting policy.

- Generator CLI fixes and tests
  - Added `[command...]` to both generator `cmd` commands (root + batch default).
  - Runtime tests validate normalized default shell, env expansion under `--command`,
    scripts and shell overrides, no-op on empty positional form, and `--command` conflict handling.

- Lint and test stability
  - Fixed @typescript-eslint/no-unnecessary-condition in getDotenvCliOptions2Options by widening input acceptance (vars map; paths array).

- Engines & smoke validation
  - Documented Node >= 20; validated default shell normalization via smoke suite.

- Plugins documentation
  - Added Plugins index and child pages (aws, batch, cmd, init, demo) with details and examples.

- Packaging and verification resiliency
  - verify-tarball robust fallbacks (files-field; npm-packlist) with diagnostics.
  - verify-package sanity checks for dist outputs/templates and exports coverage.

- Compatibility & stability
  - getDotenvCliOptions2Options tolerates object `vars` and array `paths` in config.

- ESLint / Vitest plugin migration
  - Adopted @vitest/eslint-plugin; updated eslint config.

- Zod v4 migration
  - Updated all z.record usages to v4 signatures; replaced deprecated types.

- Coverage tuning
  - Collected only src/\*_/_.ts; excluded caches/build artifacts/templates/tools/tests/config files.

- Interop amendment synthesized into requirements
  - Consolidated SMOZ × getdotenv interop determinations into the requirements:
    validation (`requiredKeys`, Zod, `--strict`), interpolation model (global + progressive),
    redaction and entropy warnings, explicit non-goal for key aliases, spawn env normalization helper,
    and help ordering policy.
