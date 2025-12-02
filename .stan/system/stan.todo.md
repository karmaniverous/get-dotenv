# Development Plan

When updated: 2025-10-19T00:00:00Z

## Next up (near‑term, actionable)

- Remove generated CLI completely (code/exports/tests/docs)
  - Delete src/generateGetDotenvCli/\*\* and all imports/exports from index/rollup/types.
  - Remove generator tests; ensure no rollup/type bundles reference it.
  - Scrub docs: remove guides/generated-cli.md and all references across README and guides (no migration notes).

- Build outputs: sanity‑check Rollup tree‑shaking for the non‑type Option import across ESM/CJS bundles to ensure no accidental retention of unused code in consumers.

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

- Dynamic help typing & grouping
  - createDynamicOption/dynamicOption now accept a generic plugin-slice type, enabling inference in callbacks (no casts).
  - ResolvedHelpConfig is Partial<GetDotenvOptions> for help-time evaluation.
  - Tagged batch options into 'plugin:batch' for grouped help rendering under subcommand help.

- Type inference & tests
  - Removed explicit casts in batch dynamic callbacks via generic dynamicOption; cfg typed automatically.
  - Root help asserted in dynamic help test (grouped plugin options appended).
  - Increased ESM interop help test timeout to 20s.

- Batch dynamic help (refactor)
  - Simplified --root-path and --globs dynamic help callbacks to use optional
    chaining with concise fallbacks (cfg.plugins.batch?.rootPath || './', globs || '\*').

- Help (plugin groups in root)
  - Root help now recursively collects options from subcommands and appends
    grouped “Plugin options — <id>” sections, so batch/cmd plugin flags render in root help.

- Help behavior tweak
  - Reverted recursive display of plugin options in root help; plugin flags
    remain visible in their subcommand help (e.g., "getdotenv batch -h").

- Help visibility (root vs subcommand)
  - Root help now filters Options to base-only (no plugin groups).
  - Subcommand help shows all options, so plugin flags appear under the subcommand’s
    Options section (e.g., batch dynamic defaults visible in "help batch").

- Root dynamic help tests
  - Added unit test verifying default labels for shell-off, load-process-off, and log-off appear in root help.

- Root dynamic help tests (follow-up)
  - Fixed typecheck by typing the evaluation bag as ResolvedHelpConfig in the test.

- Root dynamic help tests (follow-up 2)
  - Resolved TS2353 by constructing the config bag and casting via unknown to ResolvedHelpConfig.

- Docs: dynamic option descriptions
  - Added a “Dynamic option descriptions” section with examples for dynamicOption and createDynamicOption in Authoring → Lifecycle.

- Docs: plugin config
  - Added a “Plugin config” subsection to Config files & overlays (location, precedence, interpolation timing, dynamic help visibility).

- Docs: shell dynamic defaults
  - Documented dynamic help defaults in Shell guide with concise excerpts for root and batch flags.

- Build outputs: bundle sanity check
  - Added tools/verify-bundle-imports.js and wired "verify:bundle" to assert
    Commander remains external in dist ESM/CJS outputs.
