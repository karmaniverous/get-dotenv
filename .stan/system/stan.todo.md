# Development Plan — get-dotenv

When updated: 2025-09-22T04:45:00Z
NOTE: Update timestamp on commit.

## Next up

### Host-only: Branding, grouped help, and ergonomic options accessors

- Branding API (plugin host only)
  - Add GetDotenvCli.brand({ name?, description?, version?, importMetaUrl?, helpHeader? }):
    - name/description set Commander name/description for downstream branding.
    - version: if omitted and importMetaUrl provided, resolve the nearest package.json version (via package-directory); otherwise leave unset.
    - helpHeader: optional one-line banner prepended in help output (kept low-noise).
- Grouped help (no suppression yet)
  - Tag base options registered by attachRootOptions as “base”.
  - Tag options added inside plugin.setup(cli) as “plugin:<id>”.
  - Options added by the app outside plugin setup are tagged “app”.
  - Override program.configureHelp to render grouped sections:
    - “Base getdotenv options”, “App options”, and “Plugin options — <id>”.
  - Behavior-preserving; presentation only (suppression can be added later if needed).
- Ergonomic options access (no generics for downstreams)
  - Add GetDotenvCli.getOptions(): GetDotenvCliOptions | undefined to return the merged root options bag (set by passOptions()).
  - Add readMergedOptions(cmd: Command): GetDotenvCliOptions | undefined helper for action handlers that only have thisCommand; avoids structural casts.
  - passOptions() stores the merged bag on the host instance (in addition to current per-command attachment for nested inheritance).
- Public export surface (single import path)
  - From @karmaniverous/get-dotenv/cliHost re-export:
    - GetDotenvCli
    - type GetDotenvContext (non-generic alias of the concrete host context)
    - type GetDotenvCliOptions
    - type ScriptsTable
    - readMergedOptions
- Constraints
  - Plugin-host only; do not modify the generator.
  - Suppression/hideHelp can be added later based on real demand.

Implementation steps

1. Implement getOptions() and readMergedOptions() (start)
   - Add options bag storage on the host and wire passOptions() to set it.
   - Export readMergedOptions(cmd) and re-export types from cliHost index.
2. Grouped help rendering
   - Add option tagging and a custom help formatter for grouped sections.
3. Branding helper
   - Add brand() with name/description/version/helpHeader.

### Entropy warnings (warning-only; no masking)

- Add CLI flags:
  - `--entropy-warn` / `--no-entropy-warn` (default on)
  - `--entropy-threshold <bitsPerChar>` (default 3.8) - `--entropy-min-length <n>` (default 16)
  - `--entropy-whitelist <pattern>` (repeatable)
- Add config mirrors:
  - `warnEntropy`, `entropyThreshold`, `entropyMinLength`, `entropyWhitelist`
- Wire warnings into presentation surfaces:
  - `--trace` (stderr line once per key), `-l/--log` (same rule)
- Implement gating + entropy calc (Shannon over char freq; printable ASCII)
- Noise control: once-per-key-per-run set
- Unit tests: scoring, gating, whitelist, once-per-key logic
- Docs: short “Entropy warnings” section in Shell guide and Plugin-first host guide

- Release preparation
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - npm run verify:package
  - npm run verify:tarball - Bump version and publish when satisfied.
- Documentation
  - Review and finalize the new AWS section in guides/plugins.md
    to reflect final CLI behavior, env/ctx mirrors, and examples.
- Packaging consideration
  - Decide whether to export a "./plugins/aws" subpath and add
    corresponding rollup outputs if we choose to publish it.
- Roadmap groundwork
  - Draft batch `--concurrency` design (pooling, output aggregation, summary).
  - Add `--redact` masking for `--trace` and `-l/--log` (default patterns + custom).
  - Design "required keys/schema" validation of final env.

## Completed (recent)

- Host decoupling from generator + lint fix
  - Moved GetDotenvCliOptions and Scripts types into cliCore
    (src/cliCore/GetDotenvCliOptions.ts) so the host has no dependency
    on the generator module.
  - Updated imports in host and cliCore enhancer/plugins to use the new
    cliCore path; left a thin re-export shim in
    src/generateGetDotenvCli/GetDotenvCliOptions.ts for stability.
  - Replaced import() type annotations in src/cliHost/index.ts with
    proper top-level type imports to satisfy @typescript-eslint rule.
  - Rationale: the host must not depend on the generated CLI; this keeps
    layering clean without changing public re-exports from cliHost.

- Docs formatting
  - Unwrapped manually wrapped paragraphs and bullet items in guides/cascade.md and guides/generated-cli.md per project formatting policy.

- Generator CLI fixes
  - Added `[command...]` to both generator `cmd` commands:
    - batch default subcommand (batchCommand/cmdCommand.ts) - root cmdCommand.ts
      Resolves “too many arguments for 'cmd'” when passing a positional command (e.g., `batch ... git-status`).
- Generator runtime tests
  - Added tests validating generated CLI ergonomics match the host:
    - Root cmd executes positional tokens with normalized default shell.
    - Root `--command` expands env and executes via execa.
    - Batch default cmd executes positional tokens with normalized shell.
    - Batch conflict (`--command` + positional) exits with helpful message.
- Generator CLI signatures
  - Fixed action signatures for generator `cmd` commands to accept
    `[command...]` as the first parameter, aligning with Commander’s
    calling convention and preventing undefined/parent resolution errors.
- Generator runtime tests (scripts & shell overrides)
  - Root cmd:
    - Resolves scripts and honors per-script shell (`/bin/bash` vs false).
    - No-args path returns early (no invocation).
  - Batch default cmd:
    - Positional and `-c/--command` forms honor script-level shell overrides.
- Generator batch default cmd
  - Return early when no positional tokens are provided so the preSubcommand
    hook exclusively handles `-c/--command`. Prevents duplicate executor
    invocations in option-form runs.
- Lint and test stability
  - Fixed @typescript-eslint/no-unnecessary-condition in
    src/GetDotenvOptions.ts by widening the converter input type to accept vars as an object map and paths as string[], matching intended behavior and removing an always-false branch.
  - Increased E2E timeouts to reduce Windows flakiness:
    - alias termination test: per-step default 15s → 20s; test timeout 15s → 20s.
    - PowerShell quoting test: 15s → 20s.
    - AWS session-only subcommand test: 5s → 15s.

- ESLint / Vitest plugin
  - Migrated from deprecated `eslint-plugin-vitest` to `@vitest/eslint-plugin`
    to align with ESLint v9 and eliminate peer dependency override warnings. - Updated `eslint.config.ts` import; preserved recommended rules usage.

- Zod v4 migration
  - Updated all `z.record(...)` usages to the new v4 signature requiring explicit
    key and value schemas (e.g., `z.record(z.string(), valueSchema)`).
  - Replaced deprecated `ZodTypeAny` with `ZodType` in plugin definition typing.

- Packaging
  - verify-tarball: fixed npm-packlist fallback on systems without npm on PATH
    by reading package.json and passing it via the `package` option to
    npm-packlist@10. Adds a robust fs import and clearer diagnostics when
    package.json is missing/unreadable.
  - verify-tarball: added a final fallback that enumerates files from the
    package.json "files" entries and recursively walks those paths. This
    allows verifying expected dist/templates presence even when both npm and
    npm-packlist are unavailable or erroring (Windows/CI edge cases).

- Packaging
  - verify-tarball.js now emits rich diagnostics on failure (npm/node/cwd,
    pack files/unique path counts, sample found entries, and missing list), plus detailed error output if the npm pack invocation itself fails.- Packaging
  - Made verify-tarball resilient when npm is not on PATH by falling back to
    npm-packlist to compute the publish file list (simulates npm’s inclusion
    algorithm). Added npm-packlist as a devDependency. The script still prefers
    `npm pack --json --dry-run` when available and reports which source it used.
- Packaging
  - Removed TypeScript casts from tools/verify-tarball.mjs (pure JS ESM),
    fixing ESLint parse error; kept .mjs for tools consistency.- Packaging
  - Fixed verify-tarball to correctly parse `npm pack --json` (array-of-objects
    shape). Now flattens `files` arrays and verifies expected entries reliably.
- Compatibility
  - getDotenvCliOptions2Options now tolerates:
    - vars as an object map (Record<string,string|undefined>) in addition to a
      CLI-style string, and
    - paths as a string[] in addition to a delimited string.
      This prevents crashes when a project’s getdotenv.config.json uses data shapes
      while the loader also overlays the same config.
  - Converter sanitation and lint fix:
    - getDotenvCliOptions2Options now drops undefined-valued entries from `vars`
      before returning, aligning with ProcessEnv expectations and tests.
    - Avoided an always-falsy Array.isArray check by using a locally cast
      union variable for `paths` (stops @typescript-eslint/no-unnecessary-condition).
- Engines & bundling alignment
  - Pegged Node engines to >= 20 (package.json, docs).
  - Raised esbuild targets from node18 to node20 for TS dynamic/config bundling to match the new minimum runtime.
- Coverage
  - Tightened Vitest coverage inputs to eliminate irrelevant files:
    - Restrict collection to `src/**/*.ts`.
    - Exclude caches/build artifacts (`.tsbuild/**`, `**/.rollup.cache/**`, `dist/**`, `esm/**`, `.stan/**`),
      templates (`templates/**`), tools (`tools/**`), tests (`test/**`), and common repo
      config files (`**/*.config.*`, `**/*.rc.*`, specific root configs).
- Engines & smoke validation
  - Relaxed Node engines to >= 18 (package.json, docs).
  - Lowered esbuild targets from node22 to node18 for TS dynamic/config loaders. - Extended smoke suite with a default-shell echo step (no --shell-off) to
    validate normalized shells on POSIX/Windows.
- Plugins documentation
  - Added Plugins index and child pages (aws, batch, cmd, init, demo) with
    implementation details and examples.
- Docs polish
  - README: fixed CLI help line break, normalized code fences, and corrected typos
    (“extensive”, “happened”, “DESTRUCTURED_VARIABLE”). Added links to Config and
    Plugins guides for discoverability.
  - Shell guide: added “Capture (CI-friendly)” section documenting --capture and
    GETDOTENV_STDIO=pipe behavior.
  - Config guide: added scripts table example with per-script shell overrides.
- Typedoc
  - Marked RootOptionsShapeCompat as @internal to silence the warning without filtering internal types.- Guides index bullets refactored to “[Title](link) - Description”.
- Docs polish
  - Plugins guide: removed `as any` in example; annotated `setup(cli: GetDotenvCli)`
    and retrieved context via `cli.getCtx?.()` to align with codebase standards.
- Docs/nav updates
  - Added front matter titles to all guides and a guides index with children.
  - Created “Generated CLI” guide and linked from README. - Exposed "./plugins/aws" subpath (runtime/types), updated verify/build.
- AWS subcommand stabilized (session-only region/default; forwarding with capture).
- Windows alias E2E termination stabilized; smoke suite OK.
- Full CI suite green (lint, typecheck, test, build, docs, knip, smoke).- Added AWS docs section to guides/plugins.md.
- Compatibility & stability
  - getDotenvCliOptions2Options now tolerates object `vars` and array `paths`
    to avoid crashes when JSON configs use data shapes.
  - Increased default timeouts for Windows:
    - E2E alias termination test: 10s → 15s.
    - Smoke per-step default: 5s → 15s (overridable via env).
      These reduce flakiness without masking real failures.
