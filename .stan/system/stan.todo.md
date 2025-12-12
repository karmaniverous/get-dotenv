# Development Plan

## Next up (near‑term, actionable)

- Config contract (breaking) — eliminate redundancy; add visibility; separate scripts/dynamic
  - Schema (JSON/YAML/JS/TS):
    - Accept root-only operational knobs ONLY inside rootOptionDefaults (collapsed families; CLI-like). Reject these keys at the top level.
    - Introduce rootOptionVisibility?: Partial<Record<keyof RootOptionsShape, boolean>> (false hides a flag). Allow in JSON/YAML/JS/TS.
    - scripts?: Scripts allowed only as a top-level sibling (not in rootOptionDefaults, not on CLI).
    - dynamic?: GetDotenvDynamic allowed only as a top-level JS/TS key (not in rootOptionDefaults).
    - Keep vars, envVars, plugins, requiredKeys at top level as-is.
  - Loader:
    - Discover packaged/public → project/public → project/local.
    - Merge rootOptionDefaults by precedence (packaged/public < project/public < project/local).
    - Merge rootOptionVisibility by the same precedence; surface to host.
    - Merge scripts by the same precedence; inject into the merged defaults bag used by host (no CLI flag).
    - Enforce schema strictly: root-only keys at top level are invalid; scripts/dynamic cannot appear inside rootOptionDefaults.

  - Host/CLI wiring:
    - Defaults stack (runtime/help): baseRootOptionDefaults < createCli(rootOptionDefaults) < packaged/public(rootOptionDefaults) < project/public(rootOptionDefaults) < project/local(rootOptionDefaults) < CLI flags.
    - Visibility stack (no CLI): createCli(rootOptionVisibility) < packaged/public(rootOptionVisibility) < project/public(rootOptionVisibility) < project/local(rootOptionVisibility); apply hideHelp(true) for flags with false.
    - Remove hidden --scripts CLI option entirely.
    - Add redact family to root flags: --redact and --redact-off (dynamic help labels; grouped like entropy-warn).
    - Ensure scripts from config are included in the merged root bag passed to resolveCliOptions/resolveCommand/resolveShell; keep nested inheritance via getDotenvCliOptions JSON as today.
    - Help-time: evaluate dynamic labels using the unified defaults (not ctx effects); reflect visibility before rendering help.

  - Tests (unit/E2E):
    - Schema/loader:
      - Reject root-only toggles at top level; accept rootOptionDefaults-only; accept top-level scripts; reject scripts/dynamic within rootOptionDefaults.
      - Accept rootOptionVisibility; verify precedence packaged/public < project/public < project/local.
    - Host:
      - Runtime precedence assertions for CLI flags > config.rootOptionDefaults > createCli > base across families (shell/log/loadProcess, exclude\*, warnEntropy, tokens, paths/vars splitters, trace/strict, redact family).
      - Visibility: flags hidden when false via merged rootOptionVisibility (createCli + config).
      - Redact: CLI pair works; rootOptionDefaults.redact default respected; redact-pattern honored.
      - Remove any tests relying on hidden --scripts; ensure scripts are effective via config-only pathway.
    - Help/E2E:
      - Top-level -h uses the unified defaults/visibility (no ctx side effects); dynamic labels show correct “(default)”; hidden flags absent.
      - Subcommand help remains unaffected by root-visibility rules (only root/grouped display changes).

  - Documentation & templates:
    - README/guides:
      - Clarify strict config contract: root-only options live under rootOptionDefaults; no top-level duplicates.
      - Introduce rootOptionVisibility and its precedence; document “false hides”.
      - Show scripts/dynamic as top-level siblings; dynamic JS/TS-only; no CLI/ROD nesting.
      - CLI parity: redact/redact-off documented; family mapping across config and CLI.
    - Templates:
      - Optionally add commented examples for rootOptionDefaults and rootOptionVisibility; scripts/dynamic examples at top-level (JS/TS templates).
      - Ensure JSON/YAML templates demonstrate only vars/envVars (and optionally commented rootOptionDefaults/visibility), with no invalid top-level root toggles.

  - Programmatic API:
    - Keep resolveGetDotenvOptions behavior as “base < custom”; do not implicitly read configs; document host/generator pipeline as the place that applies overlays/defaults/visibility.

  - Release & QA:
    - Big-bang breaking release (major).
    - Update changelog with schema/CLI breaking changes.
    - Run verify scripts (types, bundle, tarball) and full CI matrix (POSIX + Windows).

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
