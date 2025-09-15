# Development Plan — get-dotenv

When updated: 2025-09-15T00:00:00Z
NOTE: Update timestamp on commit.

## Next up

- Tests: re-run and verify 14 failing getDotenv tests now pass after defaults fix.
- Docs: update README (Vitest switch, coverage, Node >=22.19, shell defaults).
- Rollup: monitor externalization approach; if consumers request bundled build, add alternate config. Add CI to run test/lint/build.
- CLI shell behavior
  - Document normalized default shell (/bin/bash on \*nix, powershell.exe on Windows). - Add integration tests to assert consistent quoting/whitespace behavior for:
    - arguments with spaces/quotes,
    - pipes and redirects,
    - script-specific shell overrides.
  - Consider adding a --shell-mode helper (plain|posix|powershell) as sugar.
- ESLint: add eslint-plugin-vitest config for test files; tune rules; ensure no typed rules leak outside TS.
- Optional: prune unused deps/devDeps flagged by knip after confirming no runtime impact (radash likely removable after this change).

## Completed (recent)

- Defaults layering: replaced radash.merge with local defaultsDeep (plain-object deep merge), restored merge orders:
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
