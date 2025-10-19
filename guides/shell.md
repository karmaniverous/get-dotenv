---
title: Shell execution behavior
---

# Shell execution behavior

get-dotenv executes commands via [execa](https://github.com/sindresorhus/execa) and normalizes shell behavior across platforms.

## Resolution rules

- `--shell` (or `shell: true`): use a normalized default shell
  - POSIX: `/bin/bash`
  - Windows: `powershell.exe`
- `--shell <string>`: use the provided shell (e.g., `/bin/zsh`)
- `--shell-off` (or `shell: false`): execute without a shell (plain execa)
- Scripts table overrides: an individual script may specify `shell` to override the global setting for that script.

## Plain vs shell mode

- Plain (no shell): safer for simple commands; execa parses arguments as JS. Pipes, redirects, and globbing are not available unless the command itself implements them.
- Shell mode: the specified shell parses the command string, enabling pipes, redirects, aliases, and shell builtins. Quoting and escaping must follow the shell’s rules.

## Examples

Use the default shell:

```bash
getdotenv -- env VAR=1
```

Disable shell parsing entirely:

```bash
getdotenv --shell-off cmd echo hello
```

Force a specific shell:

```bash
getdotenv --shell /bin/zsh cmd 'echo "quoted with zsh"'
```

Script-level shell override (example `getdotenv.config.json`):

```json
{
  "scripts": {
    "bash-only": { "cmd": "echo $SHELL && echo OK", "shell": "/bin/bash" },
    "plain": { "cmd": "node -v", "shell": false }
  }
}
```

Then:

```bash
getdotenv cmd bash-only
getdotenv cmd plain
```

## Quoting tips

- POSIX shells: prefer single quotes when possible; escape `$` for literal dollar signs.
- PowerShell: double-quotes perform interpolation; single quotes are literal.

## Nested CLI behavior

Nested `getdotenv` invocations inherit parent CLI options and the loaded dotenv context via `process.env.getDotenvCliOptions` (JSON). The shell resolution and scripts table continue to apply within nested commands using the same rules.

## Environment normalization

Child processes receive a normalized environment composed from the parent and the current dotenv context:

- Composition: `{ ...process.env, ...ctx.dotenv }`
- Normalization: a single helper drops undefined values and improves cross-platform behavior (e.g., TMP/TEMP coherence and HOME fallback on Windows; TMPDIR population on POSIX).
- This keeps subprocess behavior consistent across platforms and surfaces.

## Capture (CI‑friendly)

By default, child process output is streamed live (`stdio: 'inherit'`). For deterministic logs in CI or tests, enable capture:

- Flag: `--capture`
- Env: `GETDOTENV_STDIO=pipe`

When capture is enabled, stdout/stderr are buffered and re‑emitted after the child completes. Batch and AWS forwarding also honor capture, ensuring stable output ordering in automated environments. Live streaming remains available by omitting the flag/env (the default).
