# Development Plan

When updated: 2025-12-07T00:00:00Z

## Next up (near‑term, actionable)

- CI confirmation
  - Re-run typecheck and full test suite in CI to confirm green after the final
    alias compat-cast patch.

- Docs polish
  - Replace the local tsdoc/syntax disable with a wording tweak if a cleaner
    fix is found.

- Release preparation
  - Update CHANGELOG.md (npm run changelog) and bump version.
  - Verify bundle/tarball (npm run verify:bundle, verify:tarball) and run smoke.
  - Publish (pre-release if needed, then stable).

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

- Lint cleanup: unnecessary generics and unused imports
  - GetDotenvCli: removed TPlugins generics from createDynamicOption overloads
    and dynamicOption signature; retained TValue parser inference; simplified
    implementation to avoid generic cast.
  - computeContext: removed unused ZodError/ZodType imports to satisfy lints.
- Typecheck/lint: dynamic option overloads and Zod v4 generics
  - GetDotenvCli: reordered createDynamicOption overloads (base first) and
    added TPlugins generic to typed-parser overload to restore 2‑arg calls and
    preserve plugin typing for 4‑arg parser forms.
  - computeContext/definePlugin: updated ZodObject typing for Zod v4 (removed
    legacy multi‑generic), replaced ZodTypeAny with ZodType, and localized
    ESLint suppressions around safeParse error handling to satisfy
    no‑unsafe‑\* rules without broad disables. Added file‑level tsdoc/syntax
    suppression for the example block in definePlugin.
- Requirements/doc: typed env, config builder, Zod canonical options, loader flag removal
  - Updated stan.requirements.md to document:
    - ESM-only distribution and exports.
    - Canonical options types derived from Zod schemas.
    - Typed config builder for JS/TS configs (defineGetDotenvConfig).
    - Optional typed getDotenv<Vars>() env shape and explicit removal of useConfigLoader.

- Fix typecheck/lints (schema-derived overlays and resolver generics)
  - Use RootOptionsShape & ScriptsTable in resolveCliOptions call sites (cliHost, index, cmd alias).
  - Cast merged bags to GetDotenvCliOptions where needed for downstream DX (logger/trace/capture/etc.).
  - Add scripts type guard in cmd alias; import ScriptsTable; remove unsafe casts. Escape TSDoc angle brackets.

- Fix typecheck/lints (schema-derived overlays and resolver generics)
  - Use RootOptionsShape & ScriptsTable in resolveCliOptions call sites (cliHost, index, cmd alias).
  - Cast merged bags to GetDotenvCliOptions where needed for downstream DX (logger/trace/capture/etc.).
  - Add scripts type guard in cmd alias; import ScriptsTable; remove unsafe casts. Escape TSDoc angle brackets.
  - Follow-up: compat casts and TSDoc cleanup
  - Cast to RootOptionsShapeCompat at getDotenvCliOptions2Options boundaries in
    cliHost and cmd alias to satisfy exactOptionalPropertyTypes.
  - Widen readonly defaults via unknown when passing baseRootOptionDefaults into
    resolveCliOptions generics (help-time path).
  - Escape "\<alias\> v\<version\>" in TSDoc; locally disable tsdoc/syntax in cliCore/GetDotenvCliOptions.ts.

- Alias converter boundary: compat cast
  - plugins/cmd/alias.ts: import RootOptionsShapeCompat and cast mergedBag to
    RootOptionsShapeCompat when calling getDotenvCliOptions2Options.

- Helpers for inference polish (omitUndefined/toHelpConfig)
  - Added util/omitUndefined (omitUndefined and omitUndefinedRecord) and refactored
    computeContext/resolveGetDotenvOptions to use them (replacing ad‑hoc Object.entries
    filters for exactOptionalPropertyTypes).
  - Added cliHost/helpConfig.toHelpConfig and updated host hooks and createCli()
    help path to centralize help‑bag construction for dynamic option evaluation,
    reducing inline casts while keeping types precise.

- Typecheck/lint follow‑through (omitUndefined boundary & unused import)
  - Made Zod-parse boundary explicit in computeContext so omitUndefined preserves
    the GetDotenvOptions overlay; removed an unused type import in cliHost/index.ts.

- Converter & aws help DX polish
  - Use omitUndefinedRecord in getDotenvCliOptions2Options to drop undefined
    vars consistently at the boundary.
  - Switch aws plugin flags to plugin.createPluginDynamicOption so help shows effective defaults.

- AWS plugin: remove set-env option; unconditional env writes + typing DX
  - Removed --set-env/--no-set-env and the setEnv config key. The plugin now
    always writes AWS_REGION (+ AWS_DEFAULT_REGION if unset) and credentials to
    process.env in both afterResolve and the aws subcommand action.
  - Docs updated to remove setEnv references and reflect unconditional behavior.
  - Improved plugin DX: createPluginDynamicOption now defaults its type
    parameter to the plugin’s TConfig, so call sites no longer need to
    specify the generic (in aws and other plugins).
- Lint: suppress no-unnecessary-type-parameters in definePlugin (file-level) to allow generic-default DX without false positives.

- Plugin DX: remove base-interface helpers to prevent poor inference
  - Dropped readConfig/createPluginDynamicOption from GetDotenvCliPlugin; the
    instance-bound helpers remain on plugins returned by definePlugin and
    default to the plugin’s TConfig, enabling “no explicit type params.”
  - AWS types: removed duplicate AwsPluginConfigResolved; single exported type now.

- AWS plugin defaults and ctx mirror hardening
  - Removed add-ctx flag and behavior; the plugin now always publishes only
    non‑sensitive metadata (profile, region) under ctx.plugins.aws.
  - Tied set-env effective default to the root --load-process (when unset);
    help text clarifies “(default: follows --load-process)”.
  - Updated guides/shipped/aws.md to reflect the new behavior and safer mirroring.
- Typecheck: fix duplicate 'desc' param in definePlugin.createPluginDynamicOption implementation (TS2300/TS2322).

- Plugin config defaults & non-optional readConfig
- - Host: materialize plugin config defaults by validating {} when no slice is
- present (schema-safe); store per-instance config for all plugins ({} when
- no schema).
- - API: readConfig(cli) now returns a concrete object (never undefined) and
- throws a friendly error if called before resolveAndLoad().
- - Dynamic option callbacks receive a non-optional pluginCfg; always a concrete
- object.
- - Updated shipped plugins and the hello template to use schema defaults only
- and remove redundant “?? {}”. Docs updated to reflect the new DX.

- Fixes: non-optional plugin cfg type & redundant coalesce
  - definePlugin.createPluginDynamicOption: make desc callback's pluginCfg
    parameter non-optional to align with public type; resolves TS2322.
  - Remove redundant “?? {}” after readConfig in aws and batch to satisfy
    @typescript-eslint/no-unnecessary-condition.

- Plugin config DX: strict default schema + readonly surfaces + barrels
  - definePlugin now injects a strict empty Zod object schema
    (z.object({}).strict()) when no configSchema is provided, so “no-config”
    plugins fail fast on unknown keys and still receive {} at runtime.
  - readConfig(cli) returns Readonly<TConfig>; plugin-bound dynamic option
    callbacks receive pluginCfg: Readonly<TConfig>. WeakMap continues to
    store concrete objects.
  - Added InferPluginConfig<P> helper and re-exported it (and
    PluginWithInstanceHelpers) from cliHost and the top-level index to flatten imports.

- Lint fixes: InferPluginConfig import and any → unknown
  - src/cliHost/index.ts: replace inline import() type with a type-only import
    and swap any for unknown to satisfy ESLint rules.

- Types: satisfy InferPluginConfig constraint
  - src/cliHost/index.ts: import GetDotenvOptions and use it in the conditional
    type so the generic constraint matches PluginWithInstanceHelpers<TOptions, TConfig>.

- Enforce ZodObject-only plugin schemas and finalize DX polish
  - src/cliHost/definePlugin.ts: require ZodObject (Zod v4), default to
    z.object({}).strict(), add Zod-first overload that infers config type,
    no-schema overload returns {}. readConfig returns Readonly<T>; dynamic
    option helper passes Readonly<T>.
  - src/cliHost/computeContext.ts: remove no-schema branch; always validate
    {} to materialize defaults; store shallow-frozen config in the WeakMap.
  - src/cliHost/GetDotenvCli.ts: add typed overload for createDynamicOption
    parser/defaultValue (compile-time DX).
  - src/cliHost/index.ts and src/index.ts: re-export z from 'zod' for
    authoring convenience (Zod v4).
  - src/GetDotenvOptions.ts: add compile-only
    InferGetDotenvVarsFromConfig<T> to derive Vars from a typed config.
  - Avoided use of any; used ZodTypeAny/unknown where necessary.

- Decompose large modules and fix template lint
  - cliHost/GetDotenvCli: moved to folder; extracted dynamic option helpers
    (dynamicOptions.ts) and grouped help renderer (groups.ts). Class now
    delegates to helpers via index.ts; behavior unchanged.
  - plugins/cmd/alias: moved to folder; extracted alias-only executor into
    maybeRunAlias.ts; index.ts wires hooks and delegates. Behavior unchanged.
  - templates/cli/ts/plugins/hello.ts: use Object.keys(ctx?.dotenv ?? {}) to
    avoid potential lint/type noise; templates remain ignored by default ESLint.

- Alias decomposition follow-up: type/lint fix
  - maybeRunAlias: remove invalid import of omitUndefinedRecord from
    GetDotenvOptions; use resolveCliOptions<RootOptionsShape & { scripts?: ScriptsTable }>
    and call opts() without optional chain; precompute expanded to avoid
    unnecessary nullish coalescing.

- Lint: fix optional chain and unsafe assignment in cmd alias executor
  - maybeRunAlias: replace optional chain with typed dynamic index access and avoid any‑typed assignment.

- Alias executor: guard stringify and omit logger for nested bag
  - maybeRunAlias: omit logger before JSON.stringify; wrap in try/catch and only inject getDotenvCliOptions when serialization succeeds to prevent exit 1 on Windows alias path.

- Alias executor: use process.execPath for Node -e path (shell-off)
  - maybeRunAlias: when command starts with "node -e/--eval", replace the program token with process.execPath to avoid PATH resolution issues on Windows.

- Lint: remove unnecessary nullish coalescing in alias executor
  - maybeRunAlias: parts[0] is guaranteed by length guard; drop the "?? ''" fallback to satisfy @typescript-eslint/no-unnecessary-condition.

- Alias executor: revert Node execPath substitution (preserve argv passthrough)
  - maybeRunAlias: for shell-off "node -e/--eval", pass the tokenized argv unchanged to align with historical behavior.

- E2E diagnostics: enrich Windows alias termination test
  - src/e2e/alias.termination.test.ts:
    - Enable GETDOTENV_DEBUG in child env to surface internal CLI breadcrumbs.
    - Log node/platform, argv JSON, aliasPayload, and tokenize(aliasPayload).
    - Capture merged child output (all: true) and print execa error details
      (exitCode/signal/timedOut/failed/killed/code/shortMessage) plus
      child stdout/stderr/all on failure.
- Tests: remove env-based per-step timeout from Windows alias E2E
  - src/e2e/alias.termination.test.ts: drop GETDOTENV_VITEST_STEP_TIMEOUT_MS
    and execa timeout/killSignal; rely on Vitest testTimeout from
    vitest.config.ts. Keeps capture ON and preserves existing validation
    of stdout/exitCode.

  - Follow-up fix: actually implement diagnostics and use tokenize to satisfy lint.
    The test now:
    - Emits pre-run breadcrumbs used only on failure.
    - Captures and prints child merged output and execa error summary on failure.
    - Enables CLI debug with GETDOTENV_DEBUG to trace alias path resolution.

- Lint: remove unnecessary nullish coalescing in alias E2E
  - src/e2e/alias.termination.test.ts: drop "?? ''" on result.stdout (execa
    types it as string). Keeps all added diagnostics and restores lint green.

- E2E diagnostics: simulate alias transform and log eval details
  - src/e2e/alias.termination.test.ts: add stripOne (mirrors CLI) and compute
    simulated eval string from tokenize(aliasPayload). Log the simulated eval,
    length, quote count, and a regex check for '?? ""' to confirm whether
    empty-string literals survive alias processing.

- Windows alias fix: preserve "" in Node -e payloads
  - Root cause: tokenize() collapses doubled quotes inside quoted segments
    (Windows/PowerShell convention), which turns empty string literals ("")
    in Node -e code into a single " and produces invalid JS.
  - Change:
    - Add optional `{ preserveDoubledQuotes: true }` to tokenize() to keep
      "" and '' intact inside quoted segments.
    - Use preserve mode in the alias executor when parsing shell-off
      Node -e payloads so code is passed to Node unchanged.
  - Tests: the existing Windows alias E2E now exercises the fixed path.

- E2E (Windows alias): stop enabling GETDOTENV_DEBUG in child
  - src/e2e/alias.termination.test.ts: remove GETDOTENV_DEBUG from childEnv to
    prevent plugin breadcrumbs printing to stdout and breaking JSON parse.
    Pre-run diagnostics remain via stderr and are suppressed on pass.

- E2E (Windows alias): remove verbose diagnostics from test
  - src/e2e/alias.termination.test.ts: drop tokenization simulation and console.error
    breadcrumbs; keep capture ON and validate JSON-only output now that the fix is stable.

- DX: broaden programmatic patterns & exports
  - diagnostics/redact: accept RegExp in redactPatterns; compile strings or reuse RegExp.
  - diagnostics/entropy: accept RegExp in entropyWhitelist; compile strings or reuse RegExp.
  - getDotenv/cmd/alias: widen casts to Array<string|RegExp> for programmatic use.
  - cliCore/exec: add overloads for runCommand/runCommandResult with readonly argv and shell-off.
  - index: re-export defineScripts and add satisfies typing to output config.
  - types: add DeepReadonly<T> utility export.
  - Benefit: improved type inference and ergonomics without changing CLI/config shapes
    (CLI options remain string-based; programmatic usage gains RegExp support and overloads).

- DX follow-up: fix overload placement & typing to restore typecheck/lint
  - cliCore/exec: convert arrow exports to function declarations; add general
    overloads for (string | readonly string[]) and keep shell-off readonly argv
    overloads; no runtime change.
  - diagnostics/redact: remove unused helper; types/deepReadonly: replace any with unknown.

- Typecheck/lint: exec argv union narrowing and safe execa assignments
  - cliCore/exec: explicitly type commandStr as string before execaCommand to
    satisfy TS when command is string | readonly string[].
  - Narrow tokenize() inputs with (command as string) in non-array branches.
  - Avoid assigning potential any from execa/execaCommand; cast awaited results
    to unknown and pass through pickResult; use catch (e: unknown) to prevent
    any in catch variables. Resolves TS2345/TS2769 and no-unsafe-assignment
    errors reported by typecheck/lint on exec.ts.

- Lint: inline pickResult to avoid unsafe assignment in capture paths
  - src/cliCore/exec.ts: inline pickResult((await execa(...)) as unknown) and
    pickResult((await execaCommand(...)) as unknown) to satisfy
    @typescript-eslint/no-unsafe-assignment.

- TS narrowing: avoid Array.isArray retyping risk
  - src/cliCore/exec.ts: flip command union guards to `typeof command === 'string'`
    instead of Array.isArray(command) in both runCommandResult and runCommand,
    preserving readonly argv types and avoiding any[] retyping concerns.

- Lint/typecheck: include templates
  - ESLint: removed "templates/\*\*" from the global ignores so template JSON/JS/TS
    are linted (YAML remains unaffected; no YAML plugin required).
  - TypeScript: removed "templates/\*\*" from tsconfig.json and tsconfig.base.json
    excludes so templates are typechecked. Path aliases already cover CLI subpaths
    used in templates, keeping checks robust while avoiding bundling them.

- Lint: fix template number interpolation
  - templates/cli/ts/plugins/hello.ts: wrap keys.length in String(...) inside
    template literals to satisfy @typescript-eslint/restrict-template-expressions
    after enabling linting on templates.

- Docs: quick-start and npx fix
  - README.md: added a compact Quick Start with zero‑install one‑off, scaffold,
    and install steps; updated all CLI examples to use
    `npx @karmaniverous/get-dotenv` for copy‑paste readiness and added a
    Windows/PowerShell one‑off variant.
  - guides/getting-started.md: mirrored the npx fix in on‑ramp examples so they
    run as‑is without prior installation.

- Docs build: fix TypeDoc router target error
  - Converted GetDotenvCliPublic from a type alias (intersection) to an
    interface extending Command so TypeDoc can assign a URL to the reflection.
    This removes the “router target … **type.**type” error during npm run docs.

- Docs: fix TypeDoc link warnings on non-linkable members
  - src/getDotenv.ts: changed {@link GetDotenvOptions.loadProcess} and
    {@link GetDotenvOptions.outputPath} to {@link GetDotenvOptions | loadProcess}
    and {@link GetDotenvOptions | outputPath}.
  - src/GetDotenvOptions.ts: replaced {@link customOptions} with plain text.

- Batch: use readMergedOptions in defaultCmdAction
  - Replaced manual parent casts to read merged root options with the
    helper readMergedOptions(batchCmd) for shell/scripts lookups across
    all branches; improves clarity and consistency.

- Lint: remove non-null assertion in batch defaultCmdAction
  - Replaced args[0]! with (args[0] ?? '') when computing the first token
    under shell-off eval preservation to satisfy no-non-null-assertion.

- DX: readMergedOptions returns a concrete bag
  - Updated src/cliHost/GetDotenvCli/index.ts so readMergedOptions always
    returns an object ({} fallback) instead of undefined. Removed “?? {}”
    coalescing in batch defaultCmdAction and relied on the helper’s
    concrete return.

- Refactor: adopt readMergedOptions across plugins
  - batch parentAction: replace manual parent getDotenvCliOptions casts with
    readMergedOptions for scripts/shell in all branches.
  - aws plugin: use readMergedOptions for capture/scripts/shell when forwarding.
  - demo plugin: use readMergedOptions in "script" action for scripts/shell.
  - cmd plugin: unify merged bag retrieval with readMergedOptions and remove
    direct parent.getDotenvCliOptions casts.

- Type casts: remove unnecessary casts and ease help config typing
  - helpConfig: toHelpConfig now accepts Partial<GetDotenvCliOptions>, removing
    cast-at-call-site patterns.
  - Updated call sites in cliHost/index.ts and index.ts.
  - computeContext: dropped redundant "as unknown as ZodObject" by asserting
    plugin schema presence; removed unused ZodObject import.