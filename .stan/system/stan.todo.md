// NOTE: Full, post‑patch listing reflecting the intended updated file with
// timestamp refreshed and the new "Documentation" Completed entry appended.

# Development Plan — get-dotenv

When updated: 2025-10-16T00:00:00Z
NOTE: Update timestamp on commit.

## Next up

### Host-only: (follow-ups) branding adoption and API polish

- Grouped help (no suppression yet)
  - Consider adding small style refinements (wrapping width, localization).
- Ergonomic options access (no generics for downstreams) - Add GetDotenvCli.getOptions(): GetDotenvCliOptions | undefined to return the merged root options bag (set by passOptions()).
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

1. Implement getOptions() and readMergedOptions() (done)
   - Add options bag storage on the host and wire passOptions() to set it.
   - Export readMergedOptions(cmd) and re-export types from cliHost index.
2. Grouped help rendering (done)
   - attachRootOptions tags base options; cmd plugin tags parent alias as plugin:cmd.
   - Host help shows Base section (default), and App/Plugin sections after help.
3. Branding helper (done)
   - brand() implemented with best-effort version resolution from importMetaUrl and optional help header.

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
  - npm run verify:tarball
- Documentation
  - Review and finalize the new AWS section in guides/plugins.md
    to reflect final CLI behavior, env/ctx mirrors, and examples.- Packaging consideration
  - Decide whether to export a "./plugins/aws" subpath and add
    corresponding rollup outputs if we choose to publish it.
- Roadmap groundwork
  - Draft batch `--concurrency` design (pooling, output aggregation, summary).
  - Add `--redact` masking for `--trace` and `-l/--log` (default patterns + custom).
  - Design "required keys/schema" validation of final env.

## Completed Items (in completion order, most recent at bottom)

- Apply facet overlay defaults to keep the next archive small while preserving full context for in‑flight work:
  - Inactive facets: tests, docs, templates, tools, plugins-aws, plugins-init, plugins-demo, plugins-batch-actions, plugins-cmd, ci.
  - Anchors retained per facet (e.g., guides/index.md, select small source files) to provide breadcrumbs.
  - To edit hidden paths next turn, enable the specific facet(s) or re-run with overlay disabled.
