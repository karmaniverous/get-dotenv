# Development Plan — get-dotenv

When updated: 2025-09-20T05:55:00Z
NOTE: Update timestamp on commit.

## Next up
- Release preparation
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - npm run verify:package
  - npm run verify:tarball
  - Bump version and publish when satisfied.
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

- Docs/nav updates
  - Added front matter titles to all guides and a guides index with children.
  - Created “Generated CLI” guide and linked from README.
  - Exposed "./plugins/aws" subpath (runtime/types), updated verify/build.
- AWS subcommand stabilized (session-only region/default; forwarding with capture).
- Windows alias E2E termination stabilized; smoke suite OK.
- Full CI suite green (lint, typecheck, test, build, docs, knip, smoke).- Added AWS docs section to guides/plugins.md.