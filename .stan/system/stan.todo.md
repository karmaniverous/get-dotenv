# Development Plan

## Next up (near‑term, actionable)

## Completed (recent)

- DRY cleanups: module loader, dynamic apply, batch argv, verify expectations, capture helper, root defaults helper
  - Config loader now reuses src/util/loadModuleDefault for JS/TS defaults,
    removing duplicated bundling/transpile logic in src/config/loader.ts.
  - Programmatic dynamic variables in the host now use applyDynamicMap,
    eliminating a local apply function in computeContext.ts.
  - Batch cmd subcommand preserves argv for node -e using the shared
    maybePreserveNodeEvalArgv helper, keeping string form otherwise.
  - Verification scripts share expected dist outputs and template lists via
    tools/_expected.js to avoid drift.
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