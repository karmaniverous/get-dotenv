# Development Plan — get-dotenv

When updated: 2025-09-20T10:05:00Z
NOTE: Update timestamp on commit.

## Next up

- Entropy warnings (warning-only; no masking)

- Add CLI flags:
  - `--entropy-warn` / `--no-entropy-warn` (default on)
  - `--entropy-threshold <bitsPerChar>` (default 3.8)
  - `--entropy-min-length <n>` (default 16)
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

- ESLint / Vitest plugin
  - Migrated from deprecated `eslint-plugin-vitest` to `@vitest/eslint-plugin`
    to align with ESLint v9 and eliminate peer dependency override warnings.
  - Updated `eslint.config.ts` import; preserved recommended rules usage.

- Zod v4 migration
  - Updated all `z.record(...)` usages to the new v4 signature requiring explicit
    key and value schemas (e.g., `z.record(z.string(), valueSchema)`).
  - Replaced deprecated `ZodTypeAny` with `ZodType` in plugin definition typing.

- Packaging
  - verify-tarball.js now emits rich diagnostics on failure (npm/node/cwd,
    pack files/unique path counts, sample found entries, and missing list),
    plus detailed error output if the npm pack invocation itself fails.
- Packaging
  - Made verify-tarball resilient when npm is not on PATH by falling back to
    npm-packlist to compute the publish file list (simulates npm’s inclusion
    algorithm). Added npm-packlist as a devDependency. The script still prefers
    `npm pack --json --dry-run` when available and reports which source it used.
- Packaging
  - Removed TypeScript casts from tools/verify-tarball.mjs (pure JS ESM),
    fixing ESLint parse error; kept .mjs for tools consistency.- Packaging
  - Fixed verify-tarball to correctly parse `npm pack --json` (array-of-objects
    shape). Now flattens `files` arrays and verifies expected entries reliably.
- Engines & bundling alignment
  - Pegged Node engines to >= 20 (package.json, docs).
  - Raised esbuild targets from node18 to node20 for TS dynamic/config bundling to match the new minimum runtime.

- Engines & smoke validation
  - Relaxed Node engines to >= 18 (package.json, docs).
  - Lowered esbuild targets from node22 to node18 for TS dynamic/config loaders. - Extended smoke suite with a default-shell echo step (no --shell-off) to
    validate normalized shells on POSIX/Windows.
- Plugins documentation
  - Added Plugins index and child pages (aws, batch, cmd, init, demo) with
    implementation details and examples.
- Guides index bullets refactored to “[Title](link) - Description”.
- Docs/nav updates
  - Added front matter titles to all guides and a guides index with children.
  - Created “Generated CLI” guide and linked from README. - Exposed "./plugins/aws" subpath (runtime/types), updated verify/build.
- AWS subcommand stabilized (session-only region/default; forwarding with capture).
- Windows alias E2E termination stabilized; smoke suite OK.
- Full CI suite green (lint, typecheck, test, build, docs, knip, smoke).- Added AWS docs section to guides/plugins.md.
