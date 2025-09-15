# Development Plan — get-dotenv

When updated: 2025-09-15T00:00:00Z

## Next up

- CLI shell behavior
  - Document normalized default shell (/bin/bash on *nix, powershell.exe on Windows).
  - Add integration tests to assert consistent quoting/whitespace behavior for:
    - arguments with spaces/quotes,
    - pipes and redirects,
    - script-specific shell overrides.
  - Consider adding a --shell-mode helper (plain|posix|powershell) as sugar.
- ESLint: add eslint-plugin-vitest config for test files; tune rules.
- Docs: update README (Vitest switch, coverage, Node >=22.19, shell defaults).
- Rollup: re-check plugin chain for DTS build; add CI to run test/lint/build.
- Optional: prune leftover unused devDeps flagged by knip after this migration.

## Completed (recent)

- Switch to Vitest (replace Mocha/Nyc), enable V8 coverage.
- Update ESLint to v9 (flat config); remove Mocha plugin.
- Remove lodash usage in source; add radash for deep merge; use native TS elsewhere.
- Normalize CLI shell defaults for predictable behavior across platforms.
- Fix package.json: set main to dist/index.cjs; add engines.node >= 22.19.
- Remove unused utils (src/util/logger.ts, src/util/packageName.ts, src/util/console.ts).
- Flatten Rollup plugin arrays to avoid nested arrays.
