# Development Plan — get-dotenv

When updated: 2025-09-15T04:25:00Z
NOTE: Update timestamp on commit.

## Next up- Sanity passes: npm run typecheck, npm run lint:fix, npm run test, npm run build to confirm the Rollup plugin fix and overall health.

- Docs: update README (Vitest switch, coverage, Node >=22.19, shell defaults).
- Rollup: monitor externalization approach; if consumers request bundled build, add alternate config. Add CI to run test/lint/build.
- CLI shell behavior
- Document normalized default shell (/bin/bash on \*nix, powershell.exe on Windows).
- Add integration tests to assert consistent quoting/whitespace behavior for:
  - arguments with spaces/quotes,
  - pipes and redirects,
  - script-specific shell overrides.
  - Consider adding a --shell-mode helper (plain|posix|powershell) as sugar.
- ESLint: add eslint-plugin-vitest config for test files; tune rules; ensure no typed rules leak outside TS.
- Optional: prune unused deps/devDeps flagged by knip after confirming no runtime impact (radash likely removable after this change).

## Completed (recent)

- Docs: keep internals visible in TypeDoc (excludeInternal=false) and add
  authored guides included in the docs navigation:
  - guides/cascade.md (cascade and precedence)
  - guides/shell.md (shell behavior and quoting)
- README: add Requirements (Node >=22.19), API Reference link, Testing
  notes (Vitest V8), normalized shell defaults, and links to guides.
- Tests: add dotenvExpand extras (escaped dollars; progressive vs
  non-progressive behavior) and a dynamic-exclusion test for getDotenv.
- TypeDoc: include README and guides in projectDocuments for the hosted
  docs.
- Docs: keep internals visible in TypeDoc (excludeInternal=false) and add
  authored guides included in the docs navigation:
  - guides/cascade.md (cascade and precedence)
  - guides/shell.md (shell behavior and quoting)
- README: add Requirements (Node >=22.19), API Reference link, Testing
  notes (Vitest + V8), normalized shell defaults, and links to guides.
- Tests: add dotenvExpand extras (escaped dollars; progressive vs
  non-progressive behavior) and a dynamic-exclusion test for getDotenv.
- TypeDoc: include README and guides in projectDocuments for the hosted
  docs.
- Docs: hide @internal items from TypeDoc by setting
  `excludeInternal: true`; mark dotenvExpand helpers as @internal to
  reduce noise in API docs.- Coverage: exclude vitest.config.ts from coverage to avoid non-library
  files skewing metrics.
- Tests: add defaultsDeep tests (merge semantics, arrays, undefined) and
  getDotenv outputPath integration test (verifies file content and return).
- Lint: fix TSDoc param tags in dotenvExpandAll by removing invalid
  `@param options.ref`/`@param options.progressive` in favor of a
  @remarks section; satisfies eslint-plugin-tsdoc.- Lint: restore inline disable for dynamic delete in setOptionalFlag to
  comply with @typescript-eslint/no-dynamic-delete without changing behavior.
- ESLint: enabled eslint-plugin-tsdoc in TS block with `tsdoc/syntax`
  (observes local tsdoc.json tag definitions).
- Coverage: exclude docs assets, dist, src/cli, .stan, and misc build/config files from Vitest coverage to reflect the library surface.
- Tests: add unit tests for flag utils (resolveExclusion, resolveExclusionAll,
  setOptionalFlag) and resolve helpers (resolveCommand, resolveShell).
- Docs: add rich TypeDoc comments across core modules (dotenvExpand,
  getDotenv, CLI resolve/flag utils, preSubcommand hook, defaultsDeep).
- Docs: fix TypeDoc @param mismatch for dotenvExpandAll (values vs value).
- Build/docs: add typedoc and plugins (mdn-links, replace-text) and
  typedoc.json baseline with hosted base URL; wire docs script (already present).
- Docs hygiene: mark internal helpers/types in defaultsDeep to reduce
  noise in generated API docs.
- Docs: resolve TypeDoc warnings by:
  - Naming dotenvExpandAll options param and documenting as
    `options.ref`/`options.progressive` (remove link to local param).
  - Linking to `GetDotenvOptions.loadProcess`/`outputPath` in getDotenv
    remarks instead of `options.*`.
  - Changing defaultsDeep generic to extend `Record<string, unknown>`
    to avoid referencing internal `AnyRecord` in public docs.

- Lint: resolve remaining no-unnecessary-condition by guarding command with an
  explicit string check in preSubcommandHook.
- Lint: remove unused helper variable and use explicit args length check
  (> 0) in preSubcommandHook to satisfy strictTypeChecked rules.
- Lint: remove redundant Array.isArray guard by defaulting args to an empty
  array and checking length directly (no-unnecessary-condition compliant).

- Lint (strictTypeChecked) cleanups:
  - Remove unnecessary conditionals and coercions; simplify logger/defaults.
  - Preserve exact optional semantics with targeted disable for dynamic delete in generic setter and restructure delete via destructuring in getDotenv. - Remove redundant null checks in resolve helpers.- Lint config safety: rework strictTypeChecked rules merge in eslint.config.ts
    to avoid unsafe assignment and TS2352; reduce the flat-config array into a
    typed rules object.- Lint coverage: eslint.config.ts is explicitly included by lint/lint:fix
    scripts so editor and CI report the same issues.
- Lint coverage: include eslint.config.ts explicitly in lint and lint:fix
  scripts so config type errors surface in CI/local runs.
- eslint.config.ts: replace unsafe cast to strictTypeChecked.rules with a safe merge of rules from the flat-config array; resolves TS2352 during
  typecheck/build.
- ESLint: apply typescript-eslint strictTypeChecked baseline in TS files block,
  with local overrides preserved.
- TS exactOptionalPropertyTypes: pass preHook/postHook only when defined from index.ts; fix PreSubHookContext.defaults to Partial<Pick<…>>; avoid assigning
  undefined to optional fields.- Shell write: assign/delete shell via local Record view (no undefined write) in
  preSubcommandHook.ts.
- TS exactOptionalPropertyTypes: make preSubcommand defaults Partial and
  omit undefined keys when building defaults in index.ts to satisfy
  assignability; no behavior change.- Lint: remove unsafe any/member access in preSubcommandHook.ts by adding
  precise types and guards for opts()/args and logger.error fallback.
- Refactor: split src/generateGetDotenvCli/index.ts into smaller modules
  (flagUtils.ts, buildRootCommand.ts, preSubcommandHook.ts) without changing
  public API or behavior.- Rollup: configured @rollup/plugin-typescript to use tsconfig.base.json and
  unset outDir for bundling; resolves outDir vs Rollup output path error.
- ESLint: in TS files, disabled core no-unused-vars and tuned @typescript-eslint/no-unused-vars to ignore leading-underscore args/vars and
  caught errors; rest siblings ignored.
- ESLint/Node globals: add globals mapping so process/console are defined in lint; remove unused import in execShellCommandBatch.
- TS flags: assign optional booleans under exactOptionalPropertyTypes using delete-or-assign pattern; remove unused destructure by deleting logger key explicitly.
- Rollup config: drop JSON import assertion and radash; read package.json via fs with typed shape; fix unsafe any/member access.- IDE: enable ESLint fix on save (prettier/prettier EOL fixes apply automatically) and add .gitattributes with LF enforcement to prevent ␍ line-ending regressions.
- Typecheck: fix exactOptionalPropertyTypes at batch seams (boolean coercion) and relax defaultsDeep typing; add unknown casts for defaults merges.
- Rollup: replace JSON import assertion with fs read to avoid runtime SyntaxError; keep externals the same.- ESLint: add @typescript-eslint plugin mapping in flat config for typed rules.- Defaults layering: replaced radash.merge with local defaultsDeep (plain-object deep merge), restored merge orders:
  - CLI generate: base < global < local < custom
  - getDotenv programmatic: baseFromCLI < local < custom
  - Per-command: parent < current
- Defaults: reinstated default paths ["./"] via CLI defaults cascade.
- ESLint: removed global strictTypeChecked spread; typed rules now only in TS block; caches ignored.
- CLI: removed lodash reference in help string; normalized execa shell option to a defined string|boolean|URL.
- Batch: adjusted option types to satisfy exactOptionalPropertyTypes by accepting booleans at seam boundaries.
- dotenvExpand: fixed TS2532/TS2538 via optional index/key guards.
- Rollup: fixed unicorn-magic/npm-run-path error by externalizing builtins and dependencies (avoid bundling execa’s deps).
- ESLint: type-aware flat config scoped to TS, Prettier integrated, ignores include .rollup.cache/\*\*
- ESLint: make flat config type-aware; add global ignores; integrate Prettier.
- Switch to Vitest (replace Mocha/Nyc), enable V8 coverage.
- Update ESLint to v9 (flat config); remove Mocha plugin.
- Remove lodash usage in source; add radash for deep merge; use native TS elsewhere.- Normalize CLI shell defaults for predictable behavior across platforms.
- Fix package.json: set main to dist/index.cjs; add engines.node >= 22.19.
- Remove unused utils (src/util/logger.ts, src/util/packageName.ts, src/util/console.ts).
- Flatten Rollup plugin arrays to avoid nested arrays.
