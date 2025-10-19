# Development Plan — get-dotenv

When updated: 2025-10-19T03:50:00Z
NOTE: Update timestamp on commit.

## Next up

- Release (deferred): run release-it (auto-changelog), publish v5.2.0, push
  release branch; verify npm tarball in CI. Note: release is postponed until
  the current work is confirmed complete. The repository remains at 5.1.0.

- Docs polish (optional): add short cross-links from other guides to the new
  validation and diagnostics sections.

- Coverage lift (optional): expand unit tests around diagnostics thresholds
  and whitelist handling to improve diagnostics coverage.

- Monitor: keep an eye on Windows PowerShell quoting in E2E to ensure the
  latest changes remain stable.

## Backlog (tracked; not in current slice)

 - Batch `--concurrency` (pooling, output aggregation, live prefixed streaming, end‑of‑run summary).
 - First‑party secrets provider plugins (AWS/GCP/Vault).
 - Watch mode (recompute on file changes; optional rerun).
 - Enhanced `--trace` diff (origin/value/overridden‑by).

- Batch `--concurrency` (pooling, output aggregation, live prefixed streaming, end‑of‑run summary).
- First‑party secrets provider plugins (AWS/GCP/Vault).
- Watch mode (recompute on file changes; optional rerun).
- Enhanced `--trace` diff (origin/value/overridden‑by).

## Completed Items (append‑only; most recent at bottom)

- Workstream 1 (follow-up): fix exactOptionalPropertyTypes in Phase C
  - Resolved TS2379 by interpolating `outputPath` as a plain string when
    defined instead of constructing an object with a possibly-undefined
    property. This keeps Phase C behavior intact while satisfying strict
    optional typing. Build/docs no longer report the TS2379 warning from
    resolveWithLoader.

- Workstream 1 (initial slice): interpolation utility and wiring
  - Added `interpolateDeep(obj, envRef)` to expand string leaves; arrays untouched; non-strings preserved.
  - Phase C (config path): outputPath now deep‑interpolated against `{ ...process.env, ...dotenv }` (ctx wins); bootstrap keys excluded.
  - Per‑plugin slice (host path): deep‑interpolate plugin config slices against `{ ...dotenv, ...process.env }` (process.env wins) before validation; validated slices stored on ctx.
  - Exported `interpolateDeep` from the package root for plugin authors.
  - Note: Validation (`requiredKeys`/Zod) and `--strict` wiring are pending in Workstream 2.

- Apply facet overlay defaults to keep the next archive small while preserving full context for in‑flight work:
  - Inactive facets: tests, docs, templates, tools, plugins-aws, plugins-init, plugins-demo, plugins-batch-actions, plugins-cmd, ci.
  - Anchors retained per facet (e.g., guides/index.md, select small source files) to provide breadcrumbs.
  - To edit hidden paths next turn, enable the specific facet(s) or re-run with overlay disabled.

- Workstream 2 (initial slice): validation surfaces and strict wiring
  - Added config-level validation surfaces:
    - `requiredKeys?: string[]` (JSON/YAML/JS/TS) and `schema?: unknown` (JS/TS).
    - Loader rejects `dynamic` and `schema` in JSON/YAML with a clear error.
  - Introduced shared validator (`src/config/validate.ts`) to run once after Phase C
    against the composed env: uses `schema.safeParse` when present, else checks
    `requiredKeys`.
  - Plugin-first host: validation runs in `passOptions` hooks (preSubcommand and
    preAction); generated CLI: validation runs in `makePreSubcommandHook`.
  - Added `--strict` flag and `strict?: boolean` mirror in CLI options; warns by
    default and fails with a non-zero exit under strict mode.

- Workstream 3 (initial slice): diagnostics (redaction + entropy warnings)
  - Added presentation-only redaction utilities with default secret-like key
    patterns and optional custom patterns (`--redact`, `--redact-pattern`).
  - Added entropy diagnostics with gating (printable ASCII, length >= 16),
    Shannon entropy bits/char (default threshold 3.8), whitelist patterns, and
    once-per-key-per-run guard. Wired flags:
    `--entropy-warn`/`--entropy-warn-off`, `--entropy-threshold <n>`, `--entropy-min-length <n>`, `--entropy-whitelist <pattern...>`.
  - Applied to `--trace` in cmd plugin (parent alias and subcommand) and to
    `-l/--log` surfaces in both `getDotenv` and loader paths. Diagnostics never
    modify runtime env; they alter displayed values only. Defaults favor low
    noise (warnEntropy true; redaction opt-in).

- Facet overlay: added "generator" facet to exclude src/generateGetDotenvCli/\*\*
  (anchors: index.ts, buildRootCommand.ts) and set it inactive by default via
  facet.state.json. This reduces archive size without affecting the current
  dev plan (Workstreams 4–6).

- Facet overlay: added "configs" (root build/lint/ts configs and dotfiles) and
  "vscode" (workspace settings) facets with small anchors. Both default to
  inactive in facet.state.json to further reduce archive size while keeping
  minimal context available.

- Facet overlay: defaulted existing non-essential facets to inactive in
  facet.state.json: tests, docs, templates, tools, plugins-aws, plugins-init,
  plugins-demo, plugins-batch-actions, plugins-cmd, and ci. These are already
  covered by anchors in facet.meta.json and are not required for the current
  dev plan (Workstreams 4–6), further reducing archive size while preserving
  breadcrumbs.

- Workstream 4: spawn env normalization helper
  - Added shared helper `buildSpawnEnv(base, overlay)` in `src/cliCore/spawnEnv.ts`.
  - Drops undefined, dedupes Windows env keys case-insensitively (last wins, casing preserved),
    provides HOME fallback from USERPROFILE, and normalizes TMP/TEMP coherently.
  - Adopted in cmd (parent alias and subcommand), batch executor, and aws forwarding so all
    subprocesses use the same spawn env composition logic. Added unit tests.

- Workstream 5: help ordering polish
  - Sorted base “Options” so short-aliased flags are listed before long-only flags.
  - Applied the same ordering inside grouped “App options” and “Plugin options” sections.
  - Added a help-order test asserting `-e, --env` precedes `--strict` in help output.

- Workstream 6 (docs: interpolation/validation/diagnostics) and release bump
  - Updated guides/config.md to document Phase C and per‑plugin interpolation precedence,
    config validation surfaces (`requiredKeys` for JSON/YAML and Zod `schema` for JS/TS),
    strict‑mode behavior, and presentation‑only diagnostics (redaction and entropy flags).
  - Bumped package.json version to 5.2.0 in preparation for a minor release.
  - Next: generate CHANGELOG via `release-it` (auto-changelog), publish, and verify
    npm tarball in CI (`verify:tarball`). No code changes required beyond docs/process.

- Amendment: Release has not been performed yet; package.json remains 5.1.0.
  Proceed with release-it (publish v5.2.0) only after confirmation that the work
  is complete and verified.

- Amendment: “Next up” was trimmed to release-only and small follow-ups to keep
  focus on remaining actions. Prior workstreams remain in Completed for context.