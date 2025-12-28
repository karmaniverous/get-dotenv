# Development Plan

## Next up (near‑term, actionable)

- Public API: export `shouldCapture` from `@karmaniverous/get-dotenv/cliHost` (and re-export from root), and make diagnostics helpers reachable from the root entrypoint for copy/paste-friendly examples.
- Interop: verify shared-chunk dist fixes cross-entrypoint plugin config (SMOZ).
- Deprecations: soft-deprecate the `z` re-export (JSDoc + a short Guides callout) and ensure docs/templates import `{ z }` from `zod`.
- Verify: Windows SSO login-on-demand (`aws --profile … --login-on-demand whoami`) from a fresh terminal with AWS CLI 2.x.
- Verification: run typecheck, lint, tests, verify:types, verify:package, verify:bundle, verify:tarball.

## Completed (recent)

- Docs: Getting Started — fix “Dynamic Processing” link to README “Dynamic variables (JS/TS)” anchor.
- Docs: Getting Started — remove mention of non-existent “demo” plugin in createCli defaults; clarify customization via custom host.
- Docs: ESM/CJS interop — replace outdated CJS require with dynamic import
  - README: replaced `require('@karmaniverous/get-dotenv/dist/index.cjs')` example
    (non-existent CJS bundle) with a correct dynamic import snippet for CommonJS.
  - Guides/Getting Started: added a short CommonJS (dynamic import) example under
    “Embed a CLI quickly”.

- Docs: authoring guides — add root helper and Node eval snippet
  - Lifecycle: added a concise, code‑backed subsection demonstrating getRootCommand for typed access to the true root; cross‑linked to the scaffolded hello plugin and other Guides.
  - Exec: added an early cross‑link to Shell execution behavior, plus a short example using maybePreserveNodeEvalArgv to preserve Node -e argv in shell‑off flows; cross‑linked to the template and shipped cmd plugin.
  - Note: README remains a legacy long file (>300 LOC). In a follow‑up turn, decompose README by moving detailed sections into Guides and trimming it below 300 LOC, keeping a concise overview and links.

- Docs: sync guides with implementation. Fixed guides/config.md allowed keys to match schema (removed top‑level operational keys; added plugins/requiredKeys; clarified JS/TS‑only dynamic and schema). Removed duplicated intro in guides/shell.md and kept canonical link to Authoring/exec. Updated guides/getting-started.md to import createCli from the /cli subpath for consistency with README examples. Intentionally avoided patching README due to the 300‑LOC hard gate; propose a future split if README needs edits.
- Batch/Cmd/Util/Env: exported interfaces for inline option objects
  - batch/parentInvoker: introduced BatchParentInvokerFlags and updated usage;
    batch/defaultCmdAction: added BatchCmdSubcommandOptions (empty) for clarity.
    Re-exported from plugins/batch barrel.
  - util/tokenize: added TokenizeOptions with TSDoc and updated signature;
    public via util barrel.
  - env/overlayEnv: added OverlayEnvOptionsBase and OverlayEnvOptionsWithProgrammatic
    to replace inline implementation arg typing. Implementation updated to accept
    the exported interfaces (function overloads remain unchanged). Public via env barrel.

- Cmd: export typed options for run helper
  - Added RunCmdWithContextOptions (with TSDoc) in src/plugins/cmd/types.ts
    to replace the inline options object used by runCmdWithContext.
  - Updated src/plugins/cmd/runner.ts to consume the exported interface.
  - Re-exported the new interface from src/plugins/cmd/index.ts (barrel-only).

- Types: replace inline option objects with exported interfaces across core/diagnostics/plugins
  - cliHost/exec: added RunCommandResultOptions and RunCommandOptions with TSDoc,
    updated runCommandResult/runCommand overloads to use them, and re-exported from
    the cliHost barrel.
  - diagnostics/trace: introduced TraceChildEnvOptions and refactored traceChildEnv
    signature; re-exported from diagnostics barrel.
  - plugins/init/plan: added PlanConfigCopiesOptions and PlanCliCopiesOptions and
    re-exported from plugins/init barrel.
  - plugins/aws/service: added ResolveAwsContextOptions in types.ts and updated resolver
    signature; re-exported from plugins/aws barrel.

- Batch: export typed option interfaces with TSDoc
  - Introduced BatchGlobPathsOptions and ExecShellCommandBatchOptions in
    src/plugins/batch/types.ts with full TSDoc to surface in TypeDoc output.
  - Updated src/plugins/batch/execShellCommandBatch.ts to consume exported
    interfaces instead of inline object types.
  - Re-exported the new types from src/plugins/batch/index.ts per barrel policy.

- Tests: replace dynamic partial mock with static mock (no dynamic imports)
  - Updated src/plugins/aws/index.test.ts to return a static mock for
    ../../cliHost/exec exporting shouldCapture and runCommand only. Removes
    dynamic importOriginal usage, fixes TS2698 and @typescript-eslint/no-unsafe-return,
    and preserves correct capture behavior for assertions.

- Tests: fix aws plugin mocks after adding shouldCapture
  - Updated src/plugins/aws/index.test.ts to use a partial mock for
    ../../cliHost/exec via importOriginal(), spreading actual exports and
    overriding runCommand only. This preserves shouldCapture and keeps tests
    robust to future exec exports.

- DRY cleanups: module loader, dynamic apply, batch argv, verify expectations, capture helper, root defaults helper
  - Config loader now reuses src/util/loadModuleDefault for JS/TS defaults,
    removing duplicated bundling/transpile logic in src/config/loader.ts.
  - Programmatic dynamic variables in the host now use applyDynamicMap,
    eliminating a local apply function in computeContext.ts.
  - Batch cmd subcommand preserves argv for node -e using the shared
    maybePreserveNodeEvalArgv helper, keeping string form otherwise.
  - Verification scripts share expected dist outputs and template lists via
    tools/\_expected.js to avoid drift.
  - Added shouldCapture helper in cliHost/exec.ts and reused in cmd runner and
    aws plugin.
  - Root defaults stacking (base < createCli < config) factored into a small
    helper inside rootHooks.ts, removing duplication across hooks.

- Requirements: unified root defaults via config.rootOptionDefaults with precedence
  - Precedence finalized: CLI flags > config.rootOptionDefaults > createCli rootOptionDefaults > baseRootOptionDefaults.
  - rootOptionDefaults mirrors createCli rootOptionDefaults (collapsed families); applies to both runtime and help‑time labels.
  - Programmatic defaults resolution unchanged; host/generator paths apply config overlays.

- Implement rootOptionDefaults support and defaults precedence
  - Added rootOptionDefaults to getDotenv config schemas (JSON/YAML/JS/TS).
  - Host now builds runtime defaults as: baseRootOptionDefaults < createCli rootOptionDefaults < config.rootOptionDefaults.
  - Help-time labels (-h) computed from the same unified defaults without borrowing toggles from ctx; side effects remain suppressed.
  - Updated templates:
    - JSON: moved load/log under rootOptionDefaults.
    - JS/TS: added rootOptionDefaults examples.
  - Tests:
    - Schema accepts rootOptionDefaults.
    - Loader precedence verified for packaged < project/public < project/local (merged).

- Fix lint + test path issues for root defaults work
  - Resolved @typescript-eslint/no-unnecessary-condition by coalescing before casts in rootHooks.ts and createCli.ts.
  - Removed unused type import in createCli.ts.
  - Corrected loader.test.ts to use absolute paths for packaged/project after chdir to project; fixed ENOENT.

- Final lint cleanup
  - Removed unnecessary nullish coalescing on rootDefaults in createCli.ts help-time defaults merge.

- Refactor configs to new format; remove redundant defaults
  - Updated all shipped templates (JSON/JS/TS/YAML) to use only non-default keys;
    removed redundant dotenvToken/privateToken/paths and rootOptionDefaults that
    did not alter baseRootOptionDefaults.
  - Simplified repository root getdotenv.config.json to {} since no overrides
    are required.

- Requirements: tighten config contract & visibility; CLI parity (redact)
  - Updated requirements to remove redundancy between rootOptionDefaults and top-level root toggles.
  - Added rootOptionVisibility to config with precedence (createCli < packaged/public < project/public < project/local); false hides a flag.
  - Clarified scripts as top-level only (not in CLI; not in rootOptionDefaults) and dynamic as top-level JS/TS-only.
  - Added CLI redact family (--redact/--redact-off) with config defaults in rootOptionDefaults.

- Design: rootOptionVisibility and redact toggles — decomposition plan before code
  - Long‑file scan (300‑LOC gate): src/cli/createCli.ts and src/cliHost/attachRootOptions.ts exceed the threshold.
  - Proposed split (requesting confirmation before implementation):
    - createCli.ts: extract (1) visibility application into cliHost/visibility.ts, (2) help‑time defaults/visibility wiring into cliHost/helpConfig.ts (adjacent to toHelpConfig), and (3) runner help‑path into cli/runner.help.ts to keep createCli.ts focused on composition/branding.
    - attachRootOptions.ts: extract family toggles into cliHost/options/families/\*.ts (shell.ts, load.ts, log.ts, exclude.ts, entropy.ts, redact.ts) and keep a thin builder that composes the families.
  - After approval: implement schema rootOptionVisibility, merge precedence in loader/host, add --redact/--redact-off flags via new redact.ts family, apply visibility at runtime (rootHooks) and help‑time (createCli help path) using the shared visibility.ts helper, and update tests/docs accordingly.

- Impl: visibility helper + schema visibility + redact flags
  - Added src/cliHost/visibility.ts to merge and apply root option visibility; reused in createCli help path.
  - Schema: introduced rootOptionVisibility in getDotenvConfig (raw/resolved).
  - Host/CLI: applied create-time visibility and merged config visibility for top-level -h; added --redact/--redact-off dynamic flags alongside existing diagnostics options.
  - Follow-ups (next turn): integrate visibility into root runtime hooks (optional), expand tests to cover visibility precedence and redact toggles, and update docs/templates per plan.

- Fix: type and lint for rootOptionVisibility and visibility helper
  - Schema: changed resolved type of rootOptionVisibility to Partial<Record<keyof RootOptionsShape, boolean>>.
  - Host: removed unsafe casts in createCli; rely on schema-typed boolean map.
  - Lint: replaced Boolean(v) with typed assignment in visibility.ts and tightened entry typing.

- Tests: visibility precedence and redact dynamic labels
  - Added src/cliHost/visibility.test.ts to cover mergeRootVisibility() and applyRootVisibility() hiding of long flags.
  - Added src/cliHost/help.dynamic.redact.test.ts to assert default labeling for --redact / --redact-off based on help-time config.

- Fix: redact help tests robust to wrapped output
  - Updated regex in help.dynamic.redact.test.ts to allow "(default)" on continuation lines produced by help wrapping.

- Docs: root visibility and redact examples
  - Updated README to document help-time `rootOptionVisibility` (precedence and example) and expanded redact diagnostics to include `--redact-off` and config defaults (`rootOptionDefaults.redact*`).
  - Added commented examples for `rootOptionDefaults` and `rootOptionVisibility` to JS/TS templates.

- Public API docs: visibility helper
  - Added JSDoc to src/cliHost/visibility.ts describing purpose, precedence, and usage for `mergeRootVisibility` and `applyRootVisibility`.

- E2E: top-level -h includes redact flags
  - Hardened root help test to assert presence of `--redact` and `--redact-off` in top-level help output.

- Config contract (breaking): strict schema + scripts via config (no CLI pass-through)
  - Schema tightened (JSON/YAML/JS/TS): prohibited top‑level operational keys (dotenvToken, privateToken, paths, loadProcess, log, shell). Authors must use `rootOptionDefaults` for those.
  - Retained only: `rootOptionDefaults`, `rootOptionVisibility`, `scripts`, `vars`, `envVars`, `dynamic` (JS/TS only), `schema` (JS/TS only), `plugins`, `requiredKeys`.
  - Loader relies solely on schema for enforcement; no extra rejection logic added for top‑level operational keys.
  - Removed hidden `--scripts` CLI option; injected merged scripts from config sources into the root merged options bag (packaged/public < project/public < project/local).
  - Updated packaged `getdotenv.config.json` to `{}` to conform to the new schema.
  - Updated schema tests to drop top‑level paths normalization checks.

- Fix typecheck: overlayEnv union narrowing — avoid destructuring `programmaticVars` from a union and use an `"in"` guard before applying programmatic vars (no behavior change).

- Refactor: decompose `GetDotenvCli.ts` and export option interfaces
  - Extracted `DotenvExpandAllOptions` in `src/dotenv/dotenvExpand.ts`.
  - Moved `GetDotenvCliCtx` and `BrandOptions` to `src/cliHost/types.ts`.
  - Moved `ResolvedHelpConfig` to `src/cliHost/helpConfig.ts`.
  - Defined `ResolveAndLoadOptions` in `src/cliHost/contracts.ts`.
  - Updated `GetDotenvCli.ts` to consume exported types and reduce LOC (~20 lines removed).
  - Updated `src/cliHost/index.ts` exports to expose new interfaces.
  - This completes the task of replacing inline option objects with explicitly defined, exported interfaces across the codebase.

  - Refactor: simplify `ResolvedHelpConfig` usage in `contracts.ts`, `definePlugin.ts`, `GetDotenvCli.ts`
    - Removed redundant `& { plugins: ... }` intersection in `createDynamicOption` and `createPluginDynamicOption` signatures.
    - Replaced inline types with `ResolvedHelpConfig` in `definePlugin.ts` implementation.
    - Cleaned up `GetDotenvCli.ts` implementation to match.

  - Refactor: resolve remaining inline option interfaces
    - Updated `resolveAndLoad` in `src/cliHost/GetDotenvCli.ts` to use `ResolveAndLoadOptions`.
    - Extracted `ExecNormalizedOptions` in `src/cliHost/exec.ts` and updated `runCommand` overloads.
    - Extracted `CmdOptionAlias` in `src/plugins/cmd/types.ts`.
    - Extracted `ScriptDef` in `src/cliHost/types.ts` and exported it via barrel.
    - Replaced all corresponding inline types with the new interfaces.

  - Refactor: replace inline plugin composition types with interfaces
    - Extracted `PluginNamespaceOverride` and `PluginChildEntry` in `src/cliHost/contracts.ts`.
    - Extracted `PluginFlattenedEntry` in `src/cliHost/paths.ts`.
    - Updated `GetDotenvCliPlugin` interface and `GetDotenvCli` class to use new types.
    - Updated `definePlugin`, `computeContext`, and `registerPlugin` implementations.
    - Exported new interfaces via `src/cliHost/index.ts`.
    - This eliminates inline `{ plugin, override }` and `{ plugin, path }` object types across the host.

  - Refactor: convert remaining type aliases to interfaces
    - Converted `RootOptionsShape` and `GetDotenvCliCtx` in `src/cliHost/types.ts`.
    - Converted `EntropyOptions` in `src/diagnostics/entropy.ts` and `RedactOptions` in `src/diagnostics/redact.ts`.
    - Converted `CmdPluginOptions` in `src/plugins/cmd/types.ts` and `BatchPluginOptions` in `src/plugins/batch/types.ts`.
    - Converted `ConfigFile` and `ResolvedConfigSources` in `src/config/loader.ts`.
    - Extracted `ResolveCliOptionsResult` in `src/cliHost/resolveCliOptions.ts` and exported it via barrel.

  - Refactor: convert remaining inline/type aliases to interfaces
    - Converted `GetDotenvConfig` type alias to interface in `src/core/GetDotenvOptions.ts`.
    - Converted `PluginWithInstanceHelpers` intersection type to interface extending `GetDotenvCliPlugin` in `src/cliHost/contracts.ts`.
    - Extracted `CopyOperation` interface in `src/plugins/init/plan.ts` and updated `src/plugins/init/index.ts`.

- Docs: bring README/guides in sync with implementation
  - Config guide: add `rootOptionDefaults` and `rootOptionVisibility`, clarify JSON/YAML top‑level restrictions, and link to README visibility section.
  - Shell guide: fix broken link to “Executing Shell Commands” (now `./authoring/exec.md`).
  - Authoring exec guide: fix example to capture the plugin instance before calling `plugin.readConfig(cli)`.
  - Shipped aws guide: replace deprecated `id` with `ns` in the whoami child plugin example.

- Docs: full audit pass — propose README decomposition (no content changes applied)
  - Long‑file gate: README.md currently exceeds the 300‑LOC threshold. Per policy, propose a split before editing.
  - Plan: keep README focused (badges, short positioning, Requirements, Quick Start, Getting Started pointers, API link, and “How to embed CLI”). Move deeper material into Guides:
    - Dynamic Processing → reference and augment in Guides (add anchor links where needed).
    - Shell behavior and quoting → authoritative in guides/shell.md (README links only).
    - Batch command details → guides/shipped/batch.md (README links only).
    - Authoring/plugins content → guides/authoring/_.md and guides/shipped/_.md (README links only).
  - Target size: < 250 lines. Cross‑link to specific guide anchors where appropriate. Proceed after approval.

- Docs: Decompose README to concise overview with cross‑links
  - Trimmed README.md to a sub‑250‑line overview and replaced deep sections with links to Guides
  - Preserved Quick Start (CLI/programmatic/embed), Requirements, Installation, API, Changelog, License; added proper relative Markdown links to guides/

- Lint: fix Vitest rules in tests (no-standalone-expect / no-conditional-expect)
  - Rewrote dynamic test selection to explicit if/else with it or it.skip in E2E tests.
  - Removed placeholder “skip” tests with conditional expects and refactored schema tests to assert unconditionally on collected issues.

- Docs: authoring — document dotenv-style expansion for plugin flag values (ctx-aware) with links to shipped cmd alias expansion and root argParser usage.
- Docs/templates/API: align mount semantics; export shouldCapture; deprecate z re-export; fix createCli examples.
- Docs: batch guide — focus on options, usage, and host integration (no plugin authoring).

- Plugins: aws/whoami — refactor into a “bucket of subcommands” example (`index.ts` + `defaultAction.ts` + `really.ts`).

- Lint: fix whoami/really test mocks for ESLint.

- AWS: apply aws flags to nested subcommands (region/profile).

- Lint: fix aws subcommand flags test async mocks.

- Fix: aws whoami SSO creds on older AWS CLI (support non-json export-credentials formats; detect legacy sso_start_url for login-on-demand; set AWS_PROFILE/AWS_SDK_LOAD_CONFIG for AWS SDK v3)

- Lint: remove require-await violations in aws service test mocks (return Promise explicitly instead of `async` with no `await`)
- Amendment: AWS SSO login-on-demand now runs `aws sso login` with no timeout, prefers `export-credentials --format process`, makes profile resolution win over ambient env creds, and ensures profile vs static creds are mutually exclusive in `process.env`.
- Plugins: refactor aws/batch/cmd/init internals to a consistent attach-module layout (defaultAction.ts, *Action.ts, *Hook.ts) with plugin-prefixed `attach*` function names.

- Plugins: use typed `.action((...args: [...Args, Opts, this]))` wiring by returning the `Command` from `attach*Options()` (avoids variadic `unknown[]` handlers in aws/init default actions).
- Fix: ensure `attachAwsOptions()` does not declare a return type of `unknown`, otherwise `AwsCommand = ReturnType<typeof attachAwsOptions>` becomes `unknown` and breaks typed `.action()` (typecheck + lint).
- Plugins/templates: extract options modules for cmd/batch/whoami; keep plugin descriptions in index files; refactor template hello plugin to the same attach\* wiring pattern.

- Init: scaffold hello as folder template; update tests and expected tarball templates.
- Templates: add hello --loud-off and tests (no dist copy).
- Fix: template hello typing + init hello file list
- Fix: stabilize E2E output-path test
- Docs: authoring lifecycle guide — fix createCli usage (no .run) and document recommended file structure.
- Docs: authoring lifecycle guide — match plugin config Zod pattern and inferred types.
- Docs: align capture wording (stdout-only re-emit), clarify shell-off tokenization/argv guidance, and fix aws guide credential precedence + host wiring example to match current implementation.
- Docs: init guide — update generated files list (folder-based hello plugin).
- Docs: align shell/scripts/batch examples with current CLI behavior (cmd default subcommand, list mode, and object-form script shell semantics).- Docs: fix remaining config/help drift (validation timing, scripts shape, and no `help <cmd>` subcommand).

- Docs: fix CRLF artifacts in shell/diagnostics docs and document batch list-mode token precedence to match implementation.
- Amendment: a prior Completed entry near the end appears to have two bullets merged onto one line; treat it as two separate bullets (“Docs: align shell/scripts/batch…” and “Docs: fix remaining config/help drift…”).
- Fix: TypeDoc builds now use tsconfig.base.json and tsconfig.json excludes docs/\*\* to prevent stale docs TS files (e.g., docs/media/index.ts) from breaking docs/typecheck.
- Docs: add guides/stan-assistant-guide.md for STAN assistants
- CLI host: add groupPlugins() namespace helper
- Docs: document groupPlugins() in Guides
- Docs: add missing TypeDoc comments to fix warnings
- Docs: add missing TypeDoc comments to satisfy typedoc validation
- Docs: eliminate TypeDoc warnings in docs run (schemas/types)
- Docs: fix remaining TypeDoc schema/type warnings
- Build: switch Rollup ESM outputs to a single multi-entry graph with shared chunks so subpath entrypoints (`/cli`, `/cliHost`, `/plugins`) share internal singleton identity (fixes plugin.readConfig crash across entrypoints).
