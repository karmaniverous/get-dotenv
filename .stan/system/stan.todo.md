# Development Plan — get-dotenv

When updated: 2025-09-16T18:45:00Z
NOTE: Update timestamp on commit.

## Next up- Step B — Plugin host (GetDotenvCli extends Command)

- Implement class with:
  - preSubcommand lifecycle to resolve options (Zod) and call getDotenv.
  - Context creation { optionsResolved, dotenv, plugins? }, optional process.env merge.
  - Accessor cli.getCtx(); Symbol-keyed storage on root.
  - Namespacing helper cli.ns('aws') for mounting subcommands.
- Add definePlugin helper with .use() composition; install order parent → children for setup and afterResolve.
- Tests: context lifecycle; nested commands; composition order; subprocess env passing.

- Step C — Batch plugin
  - Port batch subcommand into src/plugins/batch (no behavior changes).
  - Wire the shipped CLI internally to use batch plugin to maintain parity.
  - Plan exports for plugins (subpath export), to be added in a later code change.
  - Tests: parity with current behavior (list, cwd, shell resolution, ignore-errors).

- Step D — Config loader (formats & env overlays)
  - Loader features (for the new host first):
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
