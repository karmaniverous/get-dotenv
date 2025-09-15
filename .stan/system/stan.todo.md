# Development Plan — get-dotenv

When updated: 2025-09-15T00:30:00Z
NOTE: Update timestamp on commit.

## Next up
- Sanity passes: npm run typecheck, npm run lint:fix, npm run test, npm run build
  to confirm the Rollup plugin fix and overall health.
- Docs: decide whether to add typedoc as a devDependency or adjust the docs script.
- Docs: update README (Vitest switch, coverage, Node >=22.19, shell defaults).
- Rollup: monitor externalization approach; if consumers request bundled build, add alternate config. Add CI to run test/lint/build.
- CLI shell behavior  - Document normalized default shell (/bin/bash on \*nix, powershell.exe on Windows). - Add integration tests to assert consistent quoting/whitespace behavior for:
    - arguments with spaces/quotes,
    - pipes and redirects,
    - script-specific shell overrides.
  - Consider adding a --shell-mode helper (plain|posix|powershell) as sugar.
- ESLint: add eslint-plugin-vitest config for test files; tune rules; ensure no typed rules leak outside TS.
- Optional: prune unused deps/devDeps flagged by knip after confirming no runtime impact (radash likely removable after this change).

## Completed (recent)

- Refactor: split src/generateGetDotenvCli/index.ts into smaller modules
  (flagUtils.ts, buildRootCommand.ts, preSubcommandHook.ts) without changing
  public API or behavior.
- Rollup: configured @rollup/plugin-typescript to use tsconfig.base.json and
  unset outDir for bundling; resolves outDir vs Rollup output path error.
- ESLint: in TS files, disabled core no-unused-vars and tuned  @typescript-eslint/no-unused-vars to ignore leading-underscore args/vars and
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