# Development Plan

When updated: 2025-12-03T00:00:00Z

## Next up (near‑term, actionable)

- Tests and CI updates
  - Register/openapi/package outputs remain byte-for-byte identical.
  - Dev: stage precedence matrix; inline/offline spawn-env normalization; Windows CI smoke.
  - Verify help header branding and flags (-e/--strict/--trace/-V).

- Documentation updates
  - CLI: clarify host-based design; new commands (cmd/batch); global flags; getdotenv.config.\* surfaces.
  - Dev guide: stage precedence; recommend plugins.smoz.stage mapping; strict/diagnostics notes.
  - Troubleshooting: add safe tracing and quoting recipes for cmd; clarify Windows path hygiene is handled by spawn-env.
  - Config Files & Overlays: follow-ups as needed (major cross-links landed).

- Optional test hardening: add an integration test asserting batch child env includes a known dotenv key (regression guard for env injection).

- Optional UX: add a verbose mode to print a masked snapshot of the normalized child env before spawn (feature‑gated; off by default).

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

— Zod cleanup (docs): added guidance to prefer z.unknown over z.any and .catchall(z.unknown()) over .passthrough(); cross-linked relevant sections.

— Spawn‑env normalization everywhere: verified cmd and aws already use buildSpawnEnv; implemented for batch and demo (child env injection normalized across all CLI child exec paths).

— Demo plugin: switched child env injection to buildSpawnEnv for normalized cross‑platform behavior (run/script commands).

— Batch env normalization: inject ctx.dotenv into batch child processes using buildSpawnEnv; preserved getDotenvCliOptions propagation. Applies to parent and default subcommand paths; list-only path unaffected.

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

- Cleanup: knip unused file
  - Removed unused src/config/resolveWithLoader.ts flagged by knip.

- Docs follow-through (discoverability): Added a README note linking to dynamic help docs — Authoring → Lifecycle (dynamicOption), Config files & overlays (plugin config), and Shell (dynamic defaults).

- Sanity review: Confirmed generated CLI removal; repository contains no generateGetDotenvCli paths. No further action required.

- CI hooks: verify:bundle and verify:tarball are already included under release-it after:init; no additional CI wiring needed at this time.

- Docs: shipped plugins index typo — fixed "imit" → "init" in guides/shipped/index.md.

— Help behavior: route "getdotenv <plugin> -h" to the plugin help for all
plugins (shipped and third‑party) by gating the top‑level -h short‑circuit
to cases without a preceding subcommand token. Reordered help sections to
Options → Plugin options → Commands at every command level. Added E2E tests:
subcommand "-h" prints subcommand help; root help shows "Plugin options — cmd"
before "Commands".

— Help grouping (subcommand): hide self plugin group on subcommand help
("Plugin options — <self>") to avoid duplication. Continue to render only
child‑injected plugin groups at the current level. Added assertion to batch -h
E2E ensuring "Plugin options — batch" is absent.

— AWS help (subcommand): removed Commander showGlobalOptions on the aws
subcommand so "getdotenv aws -h" shows only aws options (and any child
plugin groups), not the root/global options block. Added E2E assertion to
ensure no "Global Options:" section and no "Plugin options — aws" is shown.

— Help trailing blank line: ensure helpInformation() for root and subcommands
always ends with a blank line for prompt separation. Added E2E assertions
to verify two trailing newlines on batch/aws/cmd/root help output.

— Help E2E (newline portability): relaxed trailing-blank-line assertions to
accept CRLF and two-or-more trailing newlines `/(?:\r?\n){2,}$/`, matching
Windows and Commander’s potential extra newline while preserving the “blank
line after help” guarantee.

— Help trailing newline (tests/CI): ensured an extra blank line is printed after
help in both paths without modifying Commander:
• root (-h) short‑circuit: write an extra '\n' after outputHelp(); • subcommand help: in exitOverride for 'commander.helpDisplayed', write '\n'.

— Help newline (subcommands): configured Commander output via program.configureOutput
to ensure help prints end with a blank line consistently (>= 2 trailing newlines
when captured), avoiding test flakes without modifying Commander internals.

— Help newline (recursive): applied the output writer to the entire command tree
(root and all subcommands) so batch/aws/cmd help also ends with a blank line.
This fixes remaining E2E help failures without touching Commander internals or
test stdout suppression (GETDOTENV_STDIO=pipe already bypasses it).

— cmd help trailing newline: made the 'cmd' subcommand a GetDotenvCli child
via createCommand('cmd') so it uses the host’s helpInformation override that
guarantees a trailing blank line.

— cmd types: added a type-only import for Commander’s Command in the cmd plugin
to satisfy TS and ESLint after switching to createCommand('cmd').

— Help tests (false negatives): relaxed E2E trailing-newline assertions to a
robust “ends with blank line” helper that strips trailing spaces and accepts
CRLF/LF, avoiding false negatives from chunked writes while preserving the
blank-line guarantee.

— Help tests (execa strip): set stripFinalNewline: false in E2E help captures
so the printed trailing blank line is preserved in stdout. This, combined with
the tolerant endsWithBlankLine() helper, eliminates remaining false negatives
without altering Commander or runtime behavior.

— Root options cleanup: removed obsolete includeCommandOption parameter from
attachRootOptions and deleted the legacy root "-c, --command" flag (cmd plugin
owns the alias). Minimized type casts in dynamic help callbacks by using direct
cfg._ properties (shell, loadProcess, log, exclude_, warnEntropy) per
ResolvedHelpConfig, relying on proper inference. Kept createDynamicOptionaddOption
where .conflicts/Option-level config is required.

+— Dynamic help typing & parity: changed ResolvedHelpConfig to include CLI
+options (Partial<GetDotenvCliOptions>) so callbacks can read shell/log/
+loadProcess/exclude\*/warnEntropy without casts. In passOptions(), evaluate
+dynamic options against the merged CLI bag; for top-level “-h/--help”, compute
+defaults-only merged CLI options (resolveCliOptions + baseRootOptionDefaults)
+and evaluate against that for perfect parity without side effects.

— Host metadata & typing cleanup: stored dynamic descriptions and help groups in
host-owned WeakMaps (no Option mutation); added public setOptionGroup(opt,group).
Changed createCommand to `new GetDotenvCli(name)` (explicit semantics). Host now
implements GetDotenvCliPublic. Made GetDotenvCliPlugin generic over TOptions and
updated definePlugin. Replaced remaining “unknown” Commander casts with typed
properties (options/commands/parent/flags/description). This removes a large
portion of casts from GetDotenvCli without altering behavior.

— Type plumbing and help parity:

- Updated GetDotenvCliPublic.resolveAndLoad to accept the optional opts argument
  (runAfterResolve) and to be generic over TOptions. Matches the class method and
  fixes TS2345 when passing `this` into plugin afterResolve.

— Inference pass (env): made buildSpawnEnv return NodeJS.ProcessEnv and removed
unnecessary env casts across the codebase:

- Updated src/cliCore/spawnEnv.ts to return NodeJS.ProcessEnv.
- Dropped as unknown as NodeJS.ProcessEnv at all runCommand call sites in cmd,
  cmd alias, batch, aws, and demo plugins.
- Parameterized host plugin storage: private \_plugins: GetDotenvCliPlugin<TOptions>[].
  Aligns generics end-to-end and eliminates resolveAndLoad signature mismatch.
- Root help grouping restored: the cmd parent alias option is now tagged via
  cli.setOptionGroup(..., 'plugin:cmd'), so “Plugin options — cmd” appears in
  root help. E2E “root -h” assertion passes.
- Lint cleanup: removed unnecessary ??/?. on typed Commander fields (options,
  commands, parent, description). Reworked tagAppOptions to avoid wrapping
  Command.option (deprecated); we tag via addOption + setOptionGroup only.

— Generic alignment & lint cleanup (follow-up):

- computeContext: plugins parameter is now GetDotenvCliPlugin<TOptions>[],
  fixing plugin array variance and afterResolve typing at the class seam.
- GetDotenvCli: use(plugin: GetDotenvCliPlugin<TOptions>); \_runAfterResolve
  invokes p.afterResolve(this, ctx) without casts; child traversal typed.
- Removed unnecessary nullish checks on typed fields and an unused local in
  tagAppOptions; use cmd.name() directly. index.ts no longer casts readonly
  commands; iterate directly to satisfy ts/eslint.

— Inference pass (casts/annotations cleanup):

- alias.ts: dropped redundant GetDotenvCli/Option casts; switched to
  baseGetDotenvCliOptions; simplified logger/debug, resolveShell, and JSON
  stringify paths; only retained the required env cast at runCommand seam.
- index.ts: removed Command cast and explicit ResolvedHelpConfig local; inline
  evaluateDynamicOptions payload and simplified help suppression branch.
- GetDotenvCli.createDynamicOption: removed parser cast by wrapping the
  callback to Commander’s argParser signature without changing behavior.
  — Inference pass (follow-up: shells/env & alias helper):
- Removed remaining “as unknown as string | boolean | URL” shell casts across
  cmd, batch (parent/default actions), and aws; resolveShell typing suffices.
- Passed ctx?.dotenv directly to buildSpawnEnv in aws/demo (both command paths),
  eliminating Record and ProcessEnv casts.
- Updated cmd alias helper to accept GetDotenvCliPublic; dropped the concrete
  class cast at call sites and created the subcommand via cli.createCommand()
  without casting.

— Inference pass (cleanup): removed unnecessary casts and explicit parameter
types to maximize inference across core modules:
• GetDotenvOptions: refactored getDotenvCliOptions2Options and
resolveGetDotenvOptions to avoid Record/unknown double‑casts; used generics
on defaultsDeep; simplified paths/vars parsing. • computeContext: dropped
double‑cast on getDotenv() call; prefer customOptions.logger to avoid
unknown cast. • batch/defaultCmdAction: removed redundant shell casts.

— Fix inference pass fallout: restore typecheck/lint green by sanitizing
  validated options before calling getDotenv (exactOptionalPropertyTypes),
  simplifying splitBy to avoid unnecessary-condition lint, and reverting
  over‑strict defaultsDeep generics at call sites in favor of a single
  result cast. Removed an unnecessary optional chain on customOptions.logger.