# Development Plan — get-dotenv

When updated: 2025-09-19T13:00:00Z
NOTE: Update timestamp on commit.

## Next up

- Verify the batch list default-subcommand fix - Re-run E2E; confirm “batch list (-l)” passes on Windows. If not, add debug to print merged globs and list flag resolution in the default subcommand.

- Stabilize alias (--cmd) capture on Windows (E2E timeouts)
  - Confirm preAction executes in alias-only invocations (no subcommand present).
  - Ensure capture is honored (stdio: 'pipe') when GETDOTENV_STDIO=pipe is set
    and that the code path always resolves and terminates.
  - Add minimal debug markers (preAction start/end, before/after runCommand,
    reported exitCode) guarded by GETDOTENV_DEBUG=1.

- Re-run E2E core CLI
  - Focus on: loads env from paths (ENV_SETTING), injects vars (-v), writes
    output file (-o), excludes private (-r).
  - If still timing out, temporarily force stdio: 'pipe' for alias path under
    E2E and/or prefer --shell-off in tests.

- Documentation
  - Document --capture and GETDOTENV_STDIO=pipe; clarify CI/test usage and
    interactivity trade-offs.
  - Recommend npm-run best practice: use --cmd alias so flags apply to getdotenv.

## Completed (recent)

- Alias (--cmd) fallback exit for capture/pipe:
  force process.exit(0) when exitCode is not numeric but GETDOTENV_STDIO=pipe
  (or --capture) is set, to avoid E2E timeouts on Windows.

- Fix ESLint violations in alias/run debug helpers to keep lint clean:
  adjust dbg helper shape and simplify debug shell label.
- Instrument alias/run path with GETDOTENV_DEBUG markers:
  preAction start/end, resolved input, run start/done, and exitCode to diagnose Windows E2E timeouts under capture.

- Capture toggle for subprocess stdio; cmd and batch honor capture; buffered
  stdout re-emitted after completion.
- Alias (--cmd) stabilization: parent alias preAction awaits child, propagates
  exit code; deterministic CLI exit; guarded in tests to avoid exiting under
  mocks.

- Batch list default-subcommand fix: when -l/--list appears with positional
  tokens, treat tokens as extra globs and run list mode (prevents executing
  “partial -l” as a command on Windows).

- Begin decomposition of oversized plugin modules:
  - batch: extracted handlers/types and wired.
  - cmd: extracted tokenize/run/alias and wired.
  - init: extracted io/prompts/plan/constants and wired into index.ts.
