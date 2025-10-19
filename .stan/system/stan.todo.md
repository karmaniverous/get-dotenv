# Development Plan — get-dotenv

When updated: 2025-10-19T00:45:00Z
NOTE: Update timestamp on commit.

## Next up

### Workstream 1 — Interpolation model (Phase C + per‑plugin), validation hook‑up

Scope

- Implement deterministic deep interpolation of CLI/config string options after `ctx.dotenv` is composed (Phase C), excluding bootstrap keys.
- Add progressive per‑plugin interpolation just before each plugin’s `afterResolve`, then validate that plugin’s slice (warn by default; fail under `--strict`).

Tasks

- util: introduce `interpolateDeep(obj, envRef)` (strings only; preserve non‑strings).
- host/config path: in `resolveDotenvWithConfigLoader` (and `cliHost/computeContext`), add Phase C pass over CLI/config string options with env precedence `{ ...process.env, ...ctx.dotenv }` (ctx wins). Exclude bootstrap keys (dotenvToken, privateToken, env, defaultEnv, paths (+splitters), vars (+splitters/assignor), exclude\*, loadProcess, log, shell, dynamicPath).
- host/plugin path: before invoking each plugin’s `afterResolve`, deep‑interpolate that plugin’s config slice against `{ ...ctx.dotenv, ...process.env }` (process.env wins), then run validation (see Workstream 2). Ensure parent → children order so upstream env (e.g., AWS creds) is visible to children.
- Tests:
  - interpolateDeep: nested shapes, arrays untouched, unknowns semantics (embedded→empty substring; isolated→undefined; `:default` honored).
  - Phase C: bootstrap exclusion honored; precedence (ctx over parent env) proven; idempotence.
  - Per‑plugin: precedence (process.env over ctx for slice), parent→children propagation, validation invocation ordering.

Acceptance

- Phase C runs once per invocation; bootstrap keys are not retro‑interpolated.
- Per‑plugin slice interpolation and validation occur pre‑`afterResolve`; ordering is deterministic.

### Workstream 2 — Validation surfaces (`requiredKeys`, Zod, `--strict`)

Scope

- JSON/YAML: support `requiredKeys: string[]` presence checks on final env.
- JS/TS: support exported Zod schema for strong validation against final env.
- CLI/config: add `--strict` flag and `strict: boolean` mirror to fail on validation errors.

Tasks

- schema/config loader: extend resolved config types to recognize `requiredKeys` (JSON/YAML) and optional `schema` for JS/TS (guard shape; import in TS via robust loader).
- host path: after final env composition (post‑Phase C), run validation:
  - If `schema` present (JS/TS): `schema.safeParse(finalEnv)`.
  - Else if `requiredKeys` present (JSON/YAML): check presence of keys.
  - Warn by default; under `--strict` or `strict: true`, exit non‑zero.
- CLI host options: add `strict?: boolean` in GetDotenvCliOptions; wire through preSubcommand resolution.
- Tests: requiredKeys success/failure; Zod schema success/failure; warn vs fail per `--strict`; error messaging (concise key list or Zod issues).

Acceptance

- Validation consistently runs once against the composed env (not partials). `--strict` flips warn → fail without side effects.

### Workstream 3 — Diagnostics: redaction (`--redact`) and entropy warnings

Scope

- Presentation‑only features for `--trace` and `-l/--log`.
- Redaction masks values by default patterns and user overrides.
- Entropy warnings emit once‑per‑key‑per‑run based on gating and threshold.

Tasks

- redact util: default masks for common secret names (SECRET, TOKEN, KEY, PASSWORD); support regex/glob‑like overrides; apply only at print time.
- entropy util: gating (min length default 16; printable ASCII), Shannon entropy bits/char (default 3.8), whitelist patterns, once‑per‑key tracking.
- CLI/config: add flags/mirrors:
  - `--redact` (bool), `--entropy-warn`/`--no-entropy-warn`, `--entropy-threshold <n>`, `--entropy-min-length <n>`, `--entropy-whitelist <pattern>` (repeatable).
  - Mirrors: `redact`, `warnEntropy`, `entropyThreshold`, `entropyMinLength`, `entropyWhitelist`.
- Apply in:
  - trace output: redact values when enabled; emit `[entropy] ...` when gated and threshold exceeded.
  - log output (`-l/--log`): same policy.
- Tests: mask correctness and override precedence; entropy gating/threshold/whitelist; once‑per‑key guard.

Acceptance

- Masking never alters runtime env—only printed output. Entropy warnings are diagnostic only and respect once‑per‑key policy.

### Workstream 4 — Spawn environment normalization

Scope

- Provide a single helper and adopt it consistently.

Tasks

- Introduce `buildSpawnEnv(baseEnv: NodeJS.ProcessEnv)` in a small, exported module (e.g., `src/cliCore/spawnEnv.ts` or reuse `exec.ts` with exports) that drops `undefined` entries and normalizes TMP/TEMP/HOME where beneficial cross‑platform.
- Adopt in cmd, batch, and aws forwarders; remove ad‑hoc env maps.
- Tests: undefineds dropped; invariants preserved; platform conditionals tolerated.

Acceptance

- All subprocess entry points use the same spawn‑env helper; behavior is consistent and test‑covered.

### Workstream 5 — UX polish: help ordering (short before long‑only)

Scope

- Ensure help shows short‑aliased options before long‑only flags (e.g., `--strict` listed after short‑aliased peers). Keep grouped help behavior.

Tasks

- Host help renderer: enforce ordering within groups; add a small test capturing `-h` output and asserting relative order for a representative set (including `--strict`).

Acceptance

- Help output is stable and predictable; tests lock order to prevent regressions.

### Workstream 6 — Docs & Release

Scope

- Update guides and prepare a minor release.

Tasks

- Docs:
  - Config/Plugin‑first guides: add “Interpolation model” (Phase C + per‑plugin).
  - Validation: document `requiredKeys`, Zod schema, and `--strict` with examples.
  - Diagnostics: redact/entropy flags, defaults, gating, and examples.
- Release checklist:
  - lint, typecheck, unit+E2E (POSIX/Windows), smoke, build, verify:package, verify:tarball.
  - Changelog and version bump; publish.

Acceptance

- Docs reflect the new behaviors clearly; release passes all verifications.

## Backlog (tracked; not in current slice)

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
    `--entropy-warn`/`--entropy-warn-off`, `--entropy-threshold <n>`,
    `--entropy-min-length <n>`, `--entropy-whitelist <pattern...>`.
  - Applied to `--trace` in cmd plugin (parent alias and subcommand) and to
    `-l/--log` surfaces in both `getDotenv` and loader paths. Diagnostics never
    modify runtime env; they alter displayed values only. Defaults favor low
    noise (warnEntropy true; redaction opt-in).
