# Development Plan — get-dotenv

When updated: 2025-09-18T23:20:00Z
NOTE: Update timestamp on commit.

## Next up- Optional programmatic safeties (stage, do not implement yet)

- Consider `--cmd-file <path>` to avoid outer-shell interpolation entirely.
- Consider env-backed alias `GETDOTENV_CMD` if alias flag is omitted.- Optional programmatic safeties (stage, do not implement yet)- Consider `--cmd-file <path>` to avoid outer-shell interpolation entirely.
- Consider env-backed alias `GETDOTENV_CMD` if alias flag is omitted.
## Completed (recent)

- Capture toggle for child process stdio
  - Implemented --capture flag and honored GETDOTENV_STDIO=pipe to switch
    child process stdio from 'inherit' to 'pipe' in cmd and batch execution.
  - When captured, the CLI re-emits child stdout after completion so test
    harnesses capture deterministic output.
  - Fixed execa Option.env typing by using NodeJS.ProcessEnv and removed
    non-null assertions in tokenizers (use charAt / explicit guards).
  - Updated E2E core CLI tests to set GETDOTENV_STDIO=pipe where stdout
    assertions are made (Windows-friendly).
  - No behavior change for normal users by default (still streams to terminal
    when --capture is not set).

- Alias (--cmd) capture and prompt exit on Windows
  - Parent alias path now returns the child process exit code and explicitly
    exits the CLI after completion. This prevents hangs/timeouts observed in
    Windows E2E alias flows when GETDOTENV_STDIO=pipe is used.
  - Behavior of subcommand flows (cmd ...) is unchanged; alias path is intended
    for ergonomic npm-run usage and now terminates deterministically.

- Batch list bridging with default subcommand
  - In the batch default 'cmd' subcommand, honor the parent -l/--list flag even
    when positional tokens are present by treating tokens as additional globs and
    running list mode (merging into -g). Prevents accidental execution of    "partial -l" on Windows when the -l flag appears after positional tokens.

- Shell-off execution (cmd + batch)
  - For --shell-off and script-level shell=false, execute using
    execa(file, args) with a simple quoted-token parser instead of
    execaCommand. Prevents timeouts and ensures node -e commands run
    consistently across platforms.- Batch list globs merge (no variadic greediness)
  - Keep -g/--globs as a single string to avoid swallowing the 'cmd'
    subcommand; when list mode is used with extra positional tokens,
    merge them into globs so -g full partial -l behaves as intended.
- Cmd plugin: robust variadic arg handling
  - Switched default cmd subcommand action to accept `commandParts`
    parameter and guard safely when invoked with no args. Fixes
    “Cannot read properties of undefined (reading 'length')” and prevents default-subcommand crashes when only the parent alias is used.
- Batch plugin: variadic globs
  - Made `-g, --globs` variadic and normalized to a single string,
    preventing stray tokens (e.g., `partial`) from being captured as a
    command in list-only mode; fixes “partial -l” misparse.
- Cmd plugin: accept positional tokens
  - Declared variadic positional argument `[command...]` on the `cmd`
    subcommand to eliminate Commander “too many arguments for 'cmd'” errors seen in E2E (alias and subcommand flows).
- E2E CLI core coverage (options, cmd, batch)
  - Validated env/vars/output/exclusion and cmd alias/subcommand with
    --shell-off for portability. Covered batch list and a simple exec across a target directory.
- E2E quoting tests (platform-guarded)
  - POSIX (/bin/bash): unquoted and double-quoted `$APP_SETTING` expand; single-quoted is literal.
  - PowerShell (powershell.exe): double-quoted `$env:APP_SETTING` interpolates; single-quoted is literal. Tests are skipped on non-matching platforms.- Batch services: TS narrowing for exec command
  - Narrow execaCommand invocation with a typeof guard and render the
    header command via a safe string label to satisfy typecheck and ESLint template restrictions.
- Batch services: list-only path in execShellCommandBatch
  - Allow list mode to run without a command; align error guidance to
    “No command provided. Use --command or --list.” and label header
    as “CMD: (list only)” during listing.- Batch plugin: resolve scripts/shell from merged root CLI options
  - When plugin opts/config do not provide scripts/shell, fall back to the
    merged GetDotenv CLI options attached by passOptions. This enables
    packaged defaults like "git-status" to resolve without per-plugin config.- Lint: batch default-subcommand unused param
  - Renamed the unused action parameter to \_thisCommand to satisfy
    @typescript-eslint/no-unused-vars.

- Batch cmd subcommand variadic capture
  - Default subcommand now accepts `(commandParts, _opts, thisCommand)` and uses
    the variadic list to build the command string. Prevents empty-args path and
    false “No command provided” exits when using `batch <positional>` flows.- Root flags: conditional legacy command flag
  - Replaced invalid spread in attachRootOptions with a simple conditional. The
    includeCommandOption toggle is temporary and will be removed once -c/--cmd
    is standardized across surfaces.
- Batch parent positional args
  - Declared `batch` parent `.argument([command...])` and updated its action to
    accept variadic `commandParts`. Now `getdotenv batch <args…>` executes the
    command without requiring an explicit `cmd` token.
- Shipped CLI cmd alias standardization
  - Enabled the cmd plugin’s parent alias `-c, --cmd <command...>` and removed
    the legacy root `-c, --command` flag via `attachRootOptions(..., { includeCommandOption: false })`.
  - Requirements updated: plugin-first CLI may change; only the legacy generated
    CLI is held to backward compatibility.
- Batch default cmd subcommand (Commander args capture)
  - Fixed action handler signature to accept the variadic `[command...]`
    argument list, ensuring `getdotenv batch … cmd <args…>` executes.
  - Previously, the handler received options instead of the Command
    instance, saw zero positional args, and emitted “No command provided”.
  - Added a unit test to cover the positional `cmd` subcommand flow.
- Cmd plugin: fix ESLint no-unsafe-assignment by typing opts() usage
  (CommandWithOptions<GetDotenvCliOptions>) and reading the alias option
  via a Record<string, unknown> view. No behavior change.- Packaging verification (dry-run)
  - Added tools/verify-tarball.mjs to assert npm pack --dry-run includes
    dist outputs and templates (config and CLI skeleton).
  - Added npm scripts: verify:tarball and pack:dry; wired verify:tarball into
    release-it after:init hooks following build and verify:package.
- knip configuration refinement
  - Broadened analysis scope to include subpath entry points and src/\*_/_.ts
    in knip.json, eliminating false “unused dependencies” (commander, yaml, zod).
- knip configuration polish
  - Added demo host CLI to entry to avoid “Unused files”.
  - Disabled duplicates rule to silence intentional Raw/Resolved alias exports
    in schema modules.
  - Emptied ignoreDependencies per config hints.

- Cmd/batch polish for TS/lint/test
  - Batch default-subcommand: safe logger invocation to satisfy TS2722 when emitting “No command provided” (exact-optional logger). - Cmd plugin: typed parent/thisCommand opts to remove unsafe-any and satisfy strict typing; no behavior changes.
  - Alias conflict test: add “--” before subcommand to prevent the variadic
    alias from swallowing “cmd”, ensuring conflict path is exercised.
- Cmd alias TS/lint fixes and batch default-subcommand bridging
  - Fixed TypeScript issues in cmd plugin (logger invocation narrowing and
    env-bag typing) and unsafe-any lint with typed opts/env-bag casts. - Adjusted cmd alias tests to use a non-conflicting long flag (`--cmd`) to
    avoid root `-c` collision.
  - Bridged batch default `cmd` subcommand to execute list/--command paths when
    invoked implicitly with no positional args so E2E tests pass.
- Cmd plugin: parent-attached option alias and root preAction support
  - Added optional parent-level alias (`-c, --cmd <command...>`) in cmd plugin.
  - Implemented root `preAction` in passOptions to merge options and compute context for no-subcommand flows (alias path).
  - E2E tests: alias execution (variadic join), dotenv expansion on alias, and
    conflict with `cmd` subcommand.
  - Requirements/README updated: npm-run routing rationale; quoting guidance;
    alias semantics and conflict behavior; scripts/shell precedence unchanged.

- Batch default cmd positional-args fix (Commander v14)
  - Default subcommand now captures the parent “batch” command in a closure and
    reads flags via batchCmd.opts() instead of relying on thisCommand.parent. - Added an early return when no positional args are supplied so `batch --list`
    and `batch --command` paths are handled exclusively by the parent action.
  - Tests in src/plugins/batch/index.test.ts no longer throw “unable to resolve batch command”.

- CLI log duplication fix
  - Suppressed logging/effects in the base getDotenv step inside the config
    loader path (computeContext and resolveWithLoader). With `-l`, logging now occurs exactly once after overlays/dynamics are applied.

- CLI log duplication fix
  - Suppressed logging/effects in the base getDotenv step inside the config
    loader path (computeContext and resolveWithLoader). With `-l`, logging now
    occurs exactly once after overlays/dynamics are applied.

- Batch default cmd positional-args
  - Declared a variadic positional argument on the batch default `cmd`
    subcommand and resolved scripts/shell via plugin opts/config. Fixes
    “too many arguments for 'cmd'” and preserves type safety.

- CLI macros: chainable attachRootOptions/passOptions
  - Added adapter-layer augmentation (src/cliCore/enhanceGetDotenvCli.ts) that decorates GetDotenvCli with fluent attachRootOptions() and passOptions() methods without coupling the host to cliCore. Shipped CLI now uses the
    chainable style.

- CLI default command via plugin
  - Implemented cmd as a plugin and mounted it as the default command in the
    shipped CLI. Root-only invocations with flags now resolve context and no-op when no positional args are supplied (preSubcommand runs; cmd returns).

- API hardening: resolveCliOptions
  - Accept `unknown` for `rawCliOptions` and perform the single cast inside
    the normalizer. Eliminates call-site casts (e.g., preSubcommandHook) and avoids lint “auto-fix undo” loops.
- Final type/lint cleanup
  - Cast opts() to Partial<T> in preSubcommandHook and pass defaults directly (no nullish coalescing).
  - Removed unused ScriptsTable import in batch resolve module.
- Post-generics stabilization (parser/typing/lint)
  - Fixed preSubcommandHook opts() syntax; cast opts() to Partial<T>.
  - Dropped unnecessary generic from getDotenvCliOptions2Options; accept RootOptionsShape. - Removed unnecessary rawCliOptions ?? {} in resolveCliOptions.
  - Widened neutral batch Scripts acceptance via local alias to allow explicit undefined for shell.
  - Removed unused Command imports in CLI entrypoints.
  - Lint clean across modified modules.

- Finish generics pass and fix type/lint issues
  - Genericized getDotenvCliOptions2Options<T extends RootOptionsShape>, preserving exactOptionalPropertyTypes by omitting undefined keys.
  - Completed preSubcommandHook generics; fixed OptionValues typing; removed Record cast via typed omitLogger helper. - Made host class and computeContext generic:
    - GetDotenvCli<TOptions extends GetDotenvOptions>.
    - computeContext<TOptions> returns GetDotenvCliCtx<TOptions>.
  - Updated shipped CLI and demo host:
    - Use typed resolveCliOptions<GetDotenvCliOptions>.
    - Remove unsafe casts; use CommandWithOptions<T>.
    - Removed unnecessary generic arg on attachRootOptions.
  - Batch services:
    - Fixed Scripts alias to use default ScriptsTable (optional shell already implies undefined).
    - Removed unnecessary generic parameter from execShellCommandBatch to satisfy lint.
  - Lint fixes:
    - attachRootOptions: removed unused generic and non-null assertions.
    - resolveCliOptions: removed unused helper.
    - flagUtils: escaped remaining '>' in TSDoc example.

- Refactor — break down GetDotenvCli (long file)

- Extracted context computation (options → overlays/dynamics → plugin config
  merge/validation) to src/cliHost/computeContext.ts.
- Slimmed src/cliHost/GetDotenvCli.ts to lifecycle wiring and delegation.
- Fixes — typing, lint, and test stability
  - Widened neutral batch Scripts type to accept `shell?: string | boolean | undefined`
    for exact-optional compatibility with plugin config; removes TS2345 errors. - Cleaned GetDotenvCli plugin-config merge (no-var → let; removed unnecessary
    optional chaining on non-nullish values).
  - Increased timeouts for esbuild-related dynamic.ts tests to reduce flakiness.

- Step C/D — Batch services extraction and plugin config plumbing
  - Extracted neutral batch services under src/services/batch (resolve + exec),
    re-exported from legacy generator paths to avoid cycles while preserving behavior. - Batch plugin now consumes services directly and declares a Zod config schema;
    supports defaults from config-loader (packaged → project public → project local)
    with programmatic options and CLI flags taking precedence at runtime.
  - Host merges per-plugin config under guarded loader path, validates slices
    using plugin-declared schemas, and exposes them as ctx.pluginConfigs.
- Shipped CLI rebase (breaking, planned major)
  - Rewired src/cli/getdotenv to the plugin-first host and mounted the batch plugin.
  - Guarded --use-config-loader flag supported; eager context resolution ensures
    subcommands run with overlaid env when enabled.
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
  - Tests: loader precedence; overlay combinations; dynamic ordering; progressive expansion.
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
    - Write outputPath (multiline quoting), log to logger when enabled, and merge into `process.env`
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
- Tests — stabilize dynamic TS fallback error path
  - Increase timeout for "throws a clear error when both esbuild and
    typescript are unavailable" to avoid intermittent CI timeouts on
    slower environments. No behavior changes.
- Step D — Legacy CLI guarded config loader flag
  - Add `--use-config-loader` to the shipped CLI help and wire the
    preSubcommand hook to use the config loader/overlay path when the
    flag is set. Default remains OFF; legacy behavior unchanged unless
    explicitly enabled.
  - Factor shared resolution into `src/config/resolveWithLoader.ts` and
    reuse in both the host and the shipped CLI.
- Lint: TSDoc escape fix
  - Escape ">" in TSDoc for resolveWithLoader to satisfy tsdoc/syntax
    (no code behavior changes).
- Docs: reflect guarded config loader flag in README
  - Add --use-config-loader line to the CLI help section so the README
    matches the current CLI options.
  - Add ./guides/config.md describing discovery, formats, privacy, overlay
    precedence, and dynamic ordering for the guarded path.
  - Add ./guides/plugins.md covering the GetDotenvCli host quickstart,
    plugin composition, afterResolve lifecycle, and subprocess env advice.
  - Update typedoc.json projectDocuments and README links so the new
    guides are published and discoverable.
- Init scaffolding (plugin + templates + wiring)
  - Implemented src/plugins/init with guarded collision flow (o/e/s; O/E/S),
    --force/--yes precedence, and non-TTY treated as --yes.
  - Added templates matrix:
    - Config public/local for json and yaml; JS/TS dynamic examples included.
    - Host CLI skeleton (TS) with hello plugin; **CLI_NAME** token substitution.
  - Tests: sandboxed writes under .tsbuild/, idempotence with --yes (skip),
    JSON + TS config content expectations, CLI skeleton token substitution.
  - Mounted init in shipped CLI and exported ./plugins/init; updated rollup
    outputs (ESM/CJS + .d.ts) and package.files to include templates.
- Init scaffolding (stabilization & tests passing)
  - Stabilized action handler by capturing the subcommand instance and using
    cmd.opts() directly (no reliance on trailing action param).
  - Introduced CopySpec optional `subs` typing and tightened return types;
    added targeted eslint-disable pragmas for deliberate while(true) and
    validation checks.
  - Excluded templates/\*\* from TypeScript and ESLint to avoid diagnostics on
    scaffold-only files; maintained publication via package.files.
  - All init plugin tests now pass; typecheck/lint/build remain green across
    root and subpaths.
- Docs — scaffolding
  - Added README “Scaffold” section with examples for config CLI scaffolds and
    collision flow behavior (non-interactive defaults, --force precedence,
    **CLI_NAME** token substitution).
- Init scaffolding — non-interactive detection and precedence
  - Treat non-interactive when stdin/stdout are not TTY OR when CI-like env vars
    are present: CI, GITHUB_ACTIONS, BUILDKITE, TEAMCITY_VERSION, TF_BUILD.
  - Preserve precedence: --force > --yes > auto-detect(non-interactive => Skip All).
  - Implemented in init plugin; added tests for force precedence and CI auto-skip.
  - Docs updated (README and guides/plugins.md) to clarify detection and precedence.
  - Behavior remains backward-compatible; interactive prompts unchanged when TTY
    and no CI signals are present.
- Dynamic TS cache hygiene
  - Implemented cleanup of compiled dynamic cache files under
    .tsbuild/getdotenv-dynamic in loadModuleDefault(), keeping the most recent
    two per source (configurable via GETDOTENV_CACHE_KEEP).
  - Prevents unbounded accumulation of files like
    dynamic.fallback.error.ts.<hash>.mjs over repeated runs.
- Init scaffolding — token substitution coverage tests
  - Added assertions to verify **CLI_NAME** replacement in both CLI skeleton
    files (index.ts and plugins/hello.ts) for JSON and TS scaffold cases. - Ensures future template edits preserve token substitution behavior.

* - Init scaffolding — template expansion
* - Added env-aware dynamic examples (ENV_TAG) to JS/TS config templates to
* demonstrate the dynamic function env parameter.
  +- Packaging verification
* - Added tools/verify-package.mjs and npm script "verify:package".
* - Wired verify step into release-it after:init (post-build) to sanity-check
* "files" entries, subpath exports, and dist outputs when present.
