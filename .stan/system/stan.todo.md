# Development Plan — get-dotenv

When updated: 2025-09-16T16:30:00Z
NOTE: Update timestamp on commit.

## Next up

- Step B — Plugin host (GetDotenvCli extends Command)
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
  - Config-provided env sources:
    - vars (global, public) and envVars (env-specific, public) in config.
    - JS/TS config: allow dynamic map (GetDotenvDynamic).
  - Env overlay engine:
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
