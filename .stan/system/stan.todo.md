# Development Plan

## Next up (near‑term, actionable)

- Root defaults via config.rootOptionDefaults (schema + loader)
  - Add rootOptionDefaults to getDotenv config schemas (JSON/YAML/JS/TS):
    - Schema shape: Partial<RootOptionsShape> (the CLI “stringly” form), with families collapsed (e.g., log, excludePrivate, warnEntropy).
    - JSON/YAML: allow rootOptionDefaults; reject per‑key root toggles at top level (legacy keys become docs‑only).
    - JS/TS: allow rootOptionDefaults, dynamic, and schema as today.
  - Loader changes:
    - Discover packaged → project/public → project/local; deep‑merge rootOptionDefaults in that order.
    - Export a single merged config‑root‑defaults object alongside existing sources (used by host defaults).

- Host defaults stack (runtime) — unify precedence
  - In root hooks (preSubcommand, preAction):
    - Build defaults “d” as baseRootOptionDefaults < createCli rootOptionDefaults < config.rootOptionDefaults.
    - Pass “d” to resolveCliOptions(raw, d, parentJson) so CLI flags remain highest and parentJson stays above defaults.
    - Persist merged bag (getDotenvCliOptions) for nested flows; proceed with resolveAndLoad as today.
  - Ensure stringly handling matches CLI behavior:
    - paths as a single string (joined by pathsDelimiter or default space).
    - vars as a single string with varsDelimiter/assignor patterns respected.
    - trace supports boolean or string[]; preserve arrays from config.
    - scripts pass through; per‑script shell continues to override global shell for that script.

- Help‑time labels (-h) — parity with runtime defaults
  - In createCli top‑level help branch:
    - Load config sources and compute config.rootOptionDefaults as above.
    - Build the same defaults stack (base < createCli < config) and evaluate dynamic help from that bag (do not borrow log/loadProcess from a side‑effect‑suppressed ctx).
    - Keep help side effects disabled (no env merge, no outputPath writes, no logging) while labels reflect effective defaults.

- Remove legacy root defaults at top level in config (compat note)
  - Stop reading legacy top‑level root toggles for defaults in the loader/host.
  - Migration: document rootOptionDefaults as the single source for operational root defaults (collapsed families).

- Tests (unit/E2E)
  - Schema/loader:
    - Accept JSON/YAML/JS/TS rootOptionDefaults; verify deep‑merge precedence packaged < project/public < project/local.
    - Validate that invalid keys are rejected with clear diagnostics.
  - Host defaults:
    - Runtime: precedence assertions for CLI flags > config.rootOptionDefaults > createCli > base across key families (shell/log/loadProcess, exclude\*, warnEntropy, tokens, paths/vars, scripts).
    - Help: dynamic labels show correct “(default)” based on the unified defaults stack; ensure side‑effects are suppressed.
  - Nested flows:
    - ParentJson remains above defaults; current CLI flags still win; verify conflict resolution with parent alias scenarios.

- Documentation & templates
  - README/guides (Config files and overlays, Shell behavior, Authoring Plugins):
    - Introduce rootOptionDefaults; clarify unified precedence; remove references to setting root defaults at top level.
    - Document stringly details (paths/vars splitters, trace boolean|string[]), script shell precedence, and examples.
  - Templates:
    - Add rootOptionDefaults examples to JSON/YAML/JS/TS config templates.
    - Keep createCli({ rootOptionDefaults }) examples; note that project config can override them.

- Programmatic API guardrails
  - Keep resolveGetDotenvOptions as “base < custom” (no implicit config read) and document that host/generator paths apply config overlays and root defaults.

- Release & QA
  - Bump version (minor/major per policy).
  - Update changelog; run verify scripts (types, bundle, tarball); full test suite on CI (POSIX + Windows).
  - Note migration in CHANGELOG and docs (rootOptionDefaults replaces legacy top‑level root toggles for defaults).

## Completed (recent)

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