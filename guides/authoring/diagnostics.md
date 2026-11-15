---
title: Diagnostics & Errors
---

# Authoring Plugins: Diagnostics & Errors

This page summarizes common diagnostics and error‑handling patterns for plugin authors. The goal is predictable behavior in CI and a consistent experience with the shipped plugins.

## Errors: fail by default

Throw on subprocess failures by default. Only continue on error when the option is explicit (e.g., batch’s `--ignore-errors`), and document the behavior clearly.

## Capture and CI‑friendly output

Honor the global capture contract:

- If `process.env.GETDOTENV_STDIO === 'pipe'` or the merged options bag has `capture: true`, run your subprocess with `stdio: 'pipe'`.
- Otherwise, inherit stdio for live interaction.

```ts
import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
import {
  readMergedOptions,
  runCommand,
  shouldCapture,
} from '@karmaniverous/get-dotenv/cliHost';

const bag = readMergedOptions(thisCommand);
const capture = shouldCapture(bag.capture);

const ctx = cli.getCtx();
const env = buildSpawnEnv(process.env, ctx.dotenv);

await runCommand([file, ...args], false, {
  env,
  stdio: capture ? 'pipe' : 'inherit',
});
```

Note: with `stdio: 'pipe'`, `runCommand()` re-emits the child's buffered stdout to stdout and its stderr to stderr after the child exits. Use `runCommandResult()` when you need the buffers themselves.

## Optional trace / redaction / entropy (best practice)

When your plugin launches a subprocess, you can emit a short diagnostic prelude similar to the cmd plugin’s `--trace`:

- For each key in `{ ...process.env, ...ctx.dotenv }` (or a selected subset), print the origin (dotenv | parent | unset).
- Apply presentation‑time redaction for secret‑like keys (user‑enabled).
- Optionally warn once per key about high‑entropy values (presentation‑only).

This format is a best practice, not a requirement. Reuse when parity with the cmd plugin is desirable.

## Normalized child environment

Always use `buildSpawnEnv(process.env, ctx.dotenv)` to compose and normalize the child environment before passing it to your subprocess. This avoids platform‑specific surprises:

- On Windows, dedupe keys case‑insensitively and ensure HOME/TMP/TEMP are coherent.
- On POSIX, populate TMPDIR if a temp key is present.
- `runCommand`/`runCommandResult` pass the built env as the child's complete environment (`process.env` is not merged back in), so on Windows a dotenv key wins even when an ambient variable differs from it only in case.

```ts
import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
const env = buildSpawnEnv(process.env, ctx.dotenv);
```

## Logging guidance

Prefer concise, single‑line status headers per run. Avoid verbose per‑line prefixes unless you introduce a dedicated `--verbose` or `--debug`.

See also:

- [Executing Shell Commands](./exec.md)
- [Shell Execution Behavior](../shell.md)
