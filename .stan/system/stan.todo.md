# Development Plan — get-dotenv

When updated: 2025-09-17T00:25:00Z
NOTE: Update timestamp on commit.

## Next up- Step C — Batch plugin - Port batch subcommand into src/plugins/batch (no behavior changes). - Wire the shipped CLI internally to use batch plugin to maintain parity. - Plan exports for plugins (subpath export), to be added in a later code change.
- Tests: parity with current behavior (list, cwd, shell resolution, ignore-errors).- Step D — Config loader (formats & env overlays) - Loader features (for the new host first):
  - Discover packaged root config; consumer repo global + .local.
  - Support JSON/YAML; JS/TS via direct import → esbuild → transpile fallback; clear error guidance.
- (Host continues) Wire CLI option parsing/validation against schemas (strict).
- Config-provided env sources:
  - vars (global, public) and envVars (env-specific, public) in config.
  - JS/TS config: allow dynamic map (GetDotenvDynamic). - Env overlay engine:
  - Apply precedence axes: kind (dynamic > env > global) > privacy (local > public) > source (config > file).
  - Programmatic dynamic sits above all dynamics.
  - Preserve multi-path file cascade order per existing behavior.
- Tests: loader precedence; overlay combinations; dynamic ordering; progressive expansion.

- Step E — Legacy parity safeguards
  - Ensure existing CLI and generator behavior unchanged under warn-mode validation.
  - Add a feature flag (future) to opt legacy into full loader + strict validation after stabilization.

- Step F — Docs
  - README: dynamic TS guidance (install esbuild; simple fallback note).
  - README: “Build your own CLI with plugins” quickstart; ctx (dotenv) usage; subprocess env passing.
  - New guide: plugin authoring (definePlugin, setup/afterResolve, .use(), namespacing).

- Step G — Exports and release notes
  - Plan subpath exports for plugins (e.g., "./plugins/batch") and for the host (./cliHost).
  - Non-breaking release: introduce new host and plugins as additive; legacy stays stable.
  - Document validation modes (warn legacy; strict host); migration notes for opting-in.

## Completed (recent)

- Step A — Schemas and defaults (tests; no behavior change)
  - Added unit tests for:
    - getDotenvOptions (RAW) valid/invalid shapes.
    - getDotenvCliOptions (RAW) valid/invalid shapes.
    - getDotenvCliGenerateOptions (RAW) valid/invalid shapes.
  - Validated packaged getdotenv.config.json passes the CLI schema.
  - No wiring changes to legacy flows (validation remains staged for new host).
- Lint: remove unnecessary async from schema generator options test to satisfy
  @typescript-eslint/require-await.
- Step B (skeleton): Introduce plugin-first host and helpers
  - Created src/cliHost/GetDotenvCli.ts with:
    - resolveAndLoad → strict options getDotenv → ctx; getCtx accessor.
    - ns helper; plugin registration/install; parent → children afterResolve.
  - Created src/cliHost/definePlugin.ts for composable plugins (.use()).
  - Tests: context lifecycle, plugin afterResolve order, ns helper.
  - Legacy CLI/generator remain unchanged.
- Step B (fixes): complete host tests and TSDoc example
  - Fixed truncated GetDotenvCli.test.ts (parent/child composition and ns test).
  - Rewrote TSDoc example in definePlugin.ts using a fenced code block to satisfy
    tsdoc/syntax.
- Step B (strict validation + docs warning)
  - Host now validates resolved options with Zod in resolveAndLoad (strict mode).
  - Added negative test asserting rejection of invalid option shapes.
  - Marked internal DefineSpec type as @internal to silence Typedoc warning
    about a non-exported referenced type.
- Step B (fix): exactOptionalPropertyTypes + ctx storage
  - Cast Zod-validated options to satisfy exactOptionalPropertyTypes when
    invoking getDotenv and storing optionsResolved in ctx.
  - Fixed context assignment line (was commented inadvertently), so getCtx()
    returns the current invocation context.
- Step C — Batch plugin (skeleton + parity tests)
  - Added src/plugins/batch (plugin) registering "batch" with flags:
    --pkg-cwd, --root-path, --globs, --command, --list, --ignore-errors.
  - Reuses existing resolveCommand/resolveShell and execShellCommandBatch for behavior parity.
  - Tests (mocks executor): list mode, shell resolution (script override),
    pkg-cwd propagation, ignore-errors propagation.
  - Wiring the shipped CLI to use the plugin remains as a follow-up (no behavior change).
- Step C — Batch plugin fixes
  - Register plugins immediately on use() so subcommands/options exist before parsing.
  - Adjusted execShellCommandBatch calls to satisfy exactOptionalPropertyTypes
    (omit undefined-valued props).
  - Test mocks/typings updated to avoid tuple spreads and require-await lint.
- Step C (fixes): host + tests + lint
  - Root CLI now calls enablePositionalOptions() to satisfy Commander’s requirement
    for subcommands using passThroughOptions.
  - Batch plugin tests: typed execMock with a single-arg signature and use non-null
    assertion on mock.calls to avoid unsafe casts; fixes TS errors and build/typedoc noise.
  - Lint: add no-op await in install() to satisfy @typescript-eslint/require-await.
- Step C (plugin wiring + tests)
  - Switch batch plugin from preSubcommand hook to an action handler so it runs
    on direct invocation (no subcommand required); preserves legacy behavior.
  - Update tests to type vi.fn using a function signature and remove non-null assertions
    on mock.calls; resolves lint/typecheck errors.
- Step D — Config loader (JSON/YAML) and overlays
  - Added schemas at src/schema/getDotenvConfig.ts (RAW/Resolved) with normalization.
  - Implemented loader at src/config/loader.ts to discover packaged + project configs (JSON/YAML),
    validate, and normalize; rejects JS/TS and dynamic in JSON/YAML with clear errors.
  - Implemented overlay engine at src/env/overlay.ts applying axes:
    kind (env > global) > privacy (local > public) > source (project > packaged) > base.
    Programmatic explicit vars applied last; progressive expansion preserved.
  - Tests added for schemas, loader discovery and parsing, and overlay precedence/expansion.
  - Host integration will be guarded by a flag in a follow-up to preserve legacy behavior.
- Step D (lint fixes)
  - Remove unused type import from src/config/loader.ts to satisfy no-unused-vars.
  - Escape “>” in TSDoc block in src/env/overlay.ts to satisfy tsdoc/syntax.
- Step D (JS/TS config + host integration flag)
  - JS/TS config support in loader: .js/.mjs/.cjs via direct import; .ts/.mts/.cts via
    direct import → esbuild → transpile fallback. Dynamic allowed for JS/TS configs.
  - Host guarded integration (useConfigLoader flag added to programmatic schema):
    - Base via getDotenv with excludeDynamic and without programmatic vars.
    - Overlay with config sources (packaged → project public → project local), then apply
      dynamic layers in order: programmatic dynamic > config dynamic (packaged → project public
      → project local) > file dynamicPath.
    - Write outputPath (multiline quoting), log to logger when enabled, and merge into process.env
      when loadProcess is true.
  - Legacy behavior unchanged by default; the flag is off unless explicitly set.
  - Note: loadDynamicFromPath-style logic is duplicated locally in host; plan to factor into
    a shared util in a later refactor.
- Step D (fixes: types + lint)
  - Host: omit programmaticVars in overlayEnv call when undefined to satisfy
    exactOptionalPropertyTypes.
  - Loader: remove unused local variable to satisfy no-unused-vars.
- Step D (fix): loader abs var
  - Restore `const abs = path.resolve(filePath);` (was inadvertently part of a
    comment), resolving TS2304 and the follow-on ESLint no-unsafe-argument at
    the JS/TS config load site.
- Step D (subpaths + refactor + demo CLI)
  - Add subpath exports and build outputs:
    - ./cliHost (GetDotenvCli, definePlugin)
    - ./plugins/batch (batchPlugin)
    - ./config (config loader helpers)
    - ./env/overlay (overlayEnv)
  - Refactor dynamic module loading into src/util/loadModuleDefault.ts and use it
    in getDotenv and host file dynamicPath loader (shared behavior).
  - Add host-only CLI example at src/cli/getdotenv-host (not in package bin) to
    demonstrate host usage with the config loader enabled.
  - Extend rollup config to produce ESM/CJS and .d.ts outputs for the new subpaths.
  - Note: knip still flags yaml/zod as unused from the main entry; subpaths are now
    public exports and can be referenced downstream.
- Step D (fix): Host integration typing
  - Add `useConfigLoader?: boolean` to `GetDotenvOptions` so the demo
    host can pass `{ useConfigLoader: true }` to `resolveAndLoad`
    without TS2353. Clears typecheck/typedoc/build warnings tied to
    this flag.
- Step D — Host CLI flag for config loader
  - Add `--use-config-loader` to the demo host CLI (`getdotenv-host`).
  - Pre-resolve the dotenv context with the flag so batch subcommands run
    inside the overlaid environment when enabled.
  - Default remains OFF; behavior unchanged unless the flag is provided.