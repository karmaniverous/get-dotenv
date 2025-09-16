# Development Plan — get-dotenv

When updated: 2025-09-16T12:30:00Z
NOTE: Update timestamp on commit.

## Next up

- Docs/help alignment:
  - Update CLI --dynamic-path option help to remove "otherwise precompile" and
    recommend installing esbuild; note fallback is for simple single-file TS only.
  - Update README CLI help snippet to match the above.
- Rollup: monitor externalization approach; if consumers request a bundled build,
  add an alternate config.
- CLI shell behavior:
  - Add integration tests for quoting/whitespace, pipes and redirects, and
    script-specific shell overrides.
  - Consider adding a --shell-mode helper (plain|posix|powershell) as sugar.

## Completed (recent)

- Tests: make the dynamic.ts error-path deterministic by creating a
  module that throws at evaluation time. This forces both direct import and compiled import to fail and surfaces the guidance error without
  relying on fs.writeFile interception.

- Tests/typecheck: fix Vitest TS signature errors by removing the
  unsupported third argument from `vi.mock` calls; make the error-path
  deterministic by rejecting `fs.writeFile` during the TypeScript fallback so `getDotenv` throws with the expected guidance message.

- Dynamic TS enablement & tests:
  - Add `esbuild` to devDependencies so CI exercises dynamic.ts auto-compile path; keep it externalized in Rollup.
  - Advertise integration with optional peer metadata
    (`peerDependencies` + `peerDependenciesMeta.optional`).
  - Add fallback/error-path tests using vitest ESM mocks to simulate
    missing `esbuild` and missing `typescript`.
  - Update README to steer users to “install esbuild”; remove
    precompile-to-JS guidance; clarify trivial fallback only.
  - Remove `esbuild` from knip ignore (now declared).
  - Simplify error message in `getDotenv` to recommend installing esbuild.

- Dynamic variables (TS-first DX):
  - Add programmatic `dynamic?: GetDotenvDynamic` with precedence over
    `dynamicPath`. Export `defineDynamic` helper to improve inference. - Auto-compile `dynamic.ts` via optional `esbuild` (bundle to a temp
    ESM file). Fallback to `typescript.transpileModule` for simple
    single-file modules; otherwise emit a concise guidance error.
  - CLI: update `--dynamic-path` help to note `.ts` auto-compilation.
  - Docs: update README Dynamic Processing for TS-first (examples,
    troubleshooting, and programmatic usage).
  - Tests: add programmatic dynamic test, precedence over `dynamicPath`,
    and conditional dynamic.ts auto-compile test (skips if `esbuild` is
    not installed).
