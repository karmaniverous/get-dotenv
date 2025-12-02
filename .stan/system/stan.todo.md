# Development Plan

When updated: 2025-10-19T00:00:00Z

## Next up (near‑term, actionable)

- Remove generated CLI completely (code/exports/tests/docs)
  - Delete src/generateGetDotenvCli/\*\* and all imports/exports from index/rollup/types.
  - Remove generator tests; ensure no rollup/type bundles reference it.
  - Scrub docs: remove guides/generated-cli.md and all references across README and guides (no migration notes).

- Move and type attachRootOptions (host-only)
  - Move builder into cliHost (e.g., src/cliHost/attachRootOptions.ts).
  - Type program: GetDotenvCli; remove duck-typed fallbacks.
  - Use dynamicOption/createDynamicOption for any flag that displays defaults.

- Adopt dynamic help for all default-displaying flags
  - Root: shell/shell-off, load-process/on-off, exclude\* families, log/on-off, entropy-warn/on-off.
  - Plugins: batch defaults (pkg-cwd, root-path, globs) from merged/interpolated plugin config; keep cmd/aws static unless showing defaults.
  - Add tests for -h vs "help <cmd>" parity and default labels; update E2E help assertions.

- Build outputs: sanity‑check Rollup tree‑shaking for the non‑type Option import across ESM/CJS bundles to ensure no accidental retention of unused code in consumers.
- Dynamic help: implement and adopt Commander‑compatible APIs
  - Implement `dynamicOption(flags, (config) => string, parser?, defaultValue?)` on the GetDotenvCli subclass; compute a read‑only ResolvedConfig for help (`-h` and `help <cmd>`), with overlays and dynamic enabled, no logging, and `loadProcess=false`; evaluate description functions before printing help; ensure createCommand() returns the subclass so subcommands chain `dynamicOption(...)`.
  - Implement `createDynamicOption(flags, (config) => string, parser?, defaultValue?)` returning an Option carrying dynamic metadata; primarily for cases that build then add with `addOption`.
  - Refactor root options (attachRootOptions) to use `dynamicOption(...)` for flags that display defaults (shell, loadProcess, exclude\* families) so root and plugin defaults render from the same resolved source of truth.
  - Refactor included plugins (batch/cmd/aws/init and demo where relevant) to use `dynamicOption(...)` for any options that display effective defaults (e.g., batch: pkg-cwd, root-path, globs, shell tag for `--command`); keep purely behavioral flags on native `.option(...)`.
  - Tests:
    - Ensure top‑level `-h` renders dynamic defaults (string and boolean cases) and returns without `process.exit`.
    - Ensure `help <cmd>` renders the same text after preSubcommand resolution.
    - Confirm dynamic evaluation uses overlays + dynamic and does not write to `process.env`.

- Documentation updates (host and guides)
  - Authoring Plugins: add a “Dynamic option descriptions” section with examples for `dynamicOption` and `createDynamicOption`, including root vs plugin defaults and boolean/string patterns.
  - Config Files & Overlays: add a new “Plugin config” subsection describing location (plugins.<id>), interpolation timing against `{ ...dotenv, ...process.env }`, privacy/source precedence, and how those resolved values surface in `dynamicOption` descriptions.
  - Shell/CLI guides: note that root flags and plugin flags display help defaults derived from the same resolved config and that top‑level `-h` evaluates dynamic safely (no env mutation).
  - Add a brief before/after docs snippet demonstrating dynamic default rendering in help (e.g., shell/load‑process ON/OFF tags).
  - Remove any and all mentions of a “Generated CLI” across docs (no migration notes).

- Tests and CI updates (post-removal)
  - Drop generator runtime tests; ensure coverage thresholds remain meaningful.
  - Keep existing smoke/E2E stable; adjust expected help strings for dynamic defaults where necessary.

- Replace CLI entry with get-dotenv host
  - Create a GetDotenvCli-based host in src/cli/index.ts (or src/cli/host.ts and re-export).
  - Branding: “smoz vX.Y.Z”; global flags: -e/--env, --strict, --trace, -V/--verbose.
  - Remove Commander wiring; no fallback path.

- Install and wire plugins in the host
  - Always install get-dotenv AWS base plugin (inert unless configured).
  - Install smoz plugins: init, add, register, openapi, dev (thin wrappers over runInit/runAdd/runRegister/runOpenapi/runDev).
  - Expose get-dotenv cmd and batch commands alongside smoz commands.

- Validation and diagnostics posture
  - Host-level validation: Zod (JS/TS) or requiredKeys (JSON/YAML) once per invocation.
  - Warn by default; fail with --strict.
  - In verbose/trace, print layered trace with masking and entropy warnings (once per key).

- Adopt spawn-env normalization everywhere
  - Use get-dotenv’s buildSpawnEnv(base, ctx.dotenv) for:
    - tsx inline server
    - serverless offline
    - serverless package/deploy hooks
    - prettier/typedoc/other child tools
  - Log the normalized env snapshot in verbose mode (masked).

- Stage resolution (dev) implementation
  - Precedence: --stage > plugins.smoz.stage (interpolated) > process.env.STAGE > default inference (first non-”default” stage; else “dev”).
  - Do not bind -e to stage implicitly; document plugins.smoz.stage: "${ENV:dev}" as the recommended opt-in.
  - Pass final stage to children via spawn-env (ensure STAGE present for serverless/offline).

- Expose cmd and batch
  - cmd: honor shell semantics from get-dotenv; ensure quoting guidance documented (single quotes to avoid outer-shell expansion).
  - batch: implement flags `--concurrency <n>` (default 1) and `--live`; verify buffered capture and end-of-run summary paths; keep logs consistent with get-dotenv.

- Remove deprecated Zod usage
  - Replace any lingering z.any() placeholders in templates/docs with z.unknown().
  - Use .catchall(z.unknown()) instead of .passthrough() in examples/doc snippets.

- Serverless STAGE simplification (follow-on)
  - Inject STAGE from provider.stage/provider.environment.
  - Remove STAGE from stage.params/schema in the app fixture and template.
  - Update tests/templates/docs accordingly.

- Tests and CI updates
  - Register/openapi/package outputs remain byte-for-byte identical.
  - Dev: stage precedence matrix; inline/offline spawn-env normalization; Windows CI smoke.
  - Add cmd/batch smoke tests (quote handling and env propagation).
  - Verify help header branding and flags (-e/--strict/--trace/-V).
  - Reduce remaining test noise: optionally gate help printing under tests (suppress outputHelp when GETDOTENV_TEST=1 or GETDOTENV_STDIO=pipe) or refactor help‑flow tests to assert helpInformation() instead of printing.
  - Investigate occasional timeout in interop/createCli.esm.test.ts on Windows; consider bumping that test’s timeout to 20s or micro‑optimizing the top‑level help path.

- Documentation updates
  - CLI: clarify host-based design; new commands (cmd/batch); global flags; getdotenv.config.\* surfaces.
  - Dev guide: stage precedence; recommend plugins.smoz.stage mapping; strict/diagnostics notes.
  - Troubleshooting: add safe tracing and quoting recipes for cmd; clarify Windows path hygiene is handled by spawn-env.
  - Config Files & Overlays: expand with a “Plugin config” section (location, interpolation timing, precedence) and examples used by dynamic help.
  - Remove any outdated references to generator paths from all guides/README.

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

- Dynamic help (phase 1): added GetDotenvCli dynamicOption/createDynamicOption, help-time evaluator, and createCommand override so subcommands are GetDotenvCli instances.
- Help rendering: top-level "-h/--help" now resolves a read-only config (no logs, loadProcess=false) and evaluates dynamic descriptions before printing; "help <cmd>" path refreshes dynamic text after preSubcommand resolution.
- Root options (start): refactored shell/shell-off and load-process toggles in attachRootOptions to use dynamic descriptions when available (falls back to static when dynamicOption is absent).
- passOptions: wired dynamic evaluation in preSubcommand/preAction so plugin/root help reflects effective defaults.
- Follow-ups left in Next up:
  - Migrate remaining root flags (exclude\*, entropy-warn) to dynamicOption.
  - Adopt dynamicOption in included plugins where defaults are displayed; add tests for -h vs "help <cmd>" parity and default rendering; author docs per plan.
- Tests: suppress console output for passing tests; only show stdout/stderr when a test fails (vitest onConsoleLog filter). Also fixed Option import to a value (not type-only) and replaced inline import() type annotations to satisfy lint.

- Fix: eliminate Commander option conflicts from dynamic root flags by returning dynamic Options directly (no pre‑add + placeholder). Resolved duplicate '-s, --shell' and related toggles; unit/E2E flows proceed.
- Fix: Vitest 3 typing — updated onConsoleLog to a typed 2‑arg handler and accessed optional task via arguments[2]; maintains “logs only on failure” behavior.
- Lint: suppressed false‑positive @typescript-eslint/no-deprecated in GetDotenvCli tagAppOptions where we temporarily wrap Command.option for tagging.

- Lint: vitest.config — rename param to "\_log" and suppress prefer-rest-params at the single “arguments” usage to keep type compatibility with Vitest while satisfying ESLint.

- Demo plugin: gate afterResolve breadcrumb behind GETDOTENV_DEBUG to keep tests
  and smoke runs quiet by default; enable with GETDOTENV_DEBUG=1 when needed.
- Root help (dynamic): migrated -l/--log and --entropy-warn toggles to dynamicOption,
  showing effective defaults from resolved config (fallback to static when unavailable).
- Help path perf/stability: top-level "-h/--help" now resolves config with
- Help path perf/stability: top-level "-h/--help" now resolves config with
  runAfterResolve=false to skip plugin afterResolve hooks during help rendering,
  preventing long-running side-effects and fixing help-time test timeouts.

- Generator removal follow-through: replaced lingering imports from
  generateGetDotenvCli/\* with cliCore equivalents across host, options,
  schema, and cmd plugin; fixed host attachRootOptions call site typing.
- Lint hygiene: removed unused destructured defaults in attachRootOptions and
  hardened local config JSON parsing in GetDotenvOptions to satisfy strict
  no-unsafe-\* rules.
- Docs: scrubbed README link to deprecated Generated CLI guide.

- Tests: suppress help output under tests
  - In createCli().run(['-h']), use helpInformation() instead of outputHelp()
    when GETDOTENV_TEST/VITEST_WORKER_ID is set to keep passing test logs quiet.

- Tests: allow E2E to capture help
  - Refined help suppression to print when GETDOTENV_STDIO=pipe, fixing the E2E "displays cli help" assertion while keeping interop/unit runs quiet.
- Batch plugin dynamic help
  - Implemented dynamicOption() for pkg-cwd/root-path/globs to display effective defaults from plugins.batch config.
  - Added unit test verifying dynamic defaults appear in "help batch".