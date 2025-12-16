---
title: Shell execution behavior
---

This page documents the root shell behavior controlled by the host’s global `--shell` (and optional root `scripts`). Plugins normally rely on the root shell setting; a rare per‑script override may be honored by CLI‑driven plugins when a script entry uses the object form `{ cmd, shell }`. For subprocess patterns across plugins (including expansion timing, child env composition, capture, quoting, and safety), see [Authoring Plugins → Executing Shell Commands](./authoring/exec.md).

# Shell execution behavior

`get-dotenv` executes commands via [execa](https://github.com/sindresorhus/execa) and normalizes shell behavior across platforms.

## Resolution rules

- `--shell` (or `shell: true`): use a normalized default shell
  - POSIX: `/bin/bash`
  - Windows: `powershell.exe`
- `--shell <string>`: use the provided shell (e.g., `/bin/zsh`)
- `--shell-off` (or `shell: false`): execute without a shell (plain execa)
- Scripts table overrides: when a script entry uses the object form `{ cmd, shell }`, the effective shell is `scripts[name].shell` (and when omitted, the script currently runs with shell OFF rather than inheriting the root shell).

## Plain vs shell mode

- Plain (no shell): safer for simple commands; execa parses arguments as JS. Pipes, redirects, and globbing are not available unless the command itself implements them.
- Shell mode: the specified shell parses the command string, enabling pipes, redirects, aliases, and shell builtins. Quoting and escaping must follow the shell’s rules.

## Examples

Use the default shell:

```bash
getdotenv cmd echo OK
```

Disable shell parsing entirely:

```bash
getdotenv --shell-off cmd node -e "console.log('hello')"
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

TypeScript note: When you author scripts in code, a helper `defineScripts<TShell>()(table)` is available to preserve concrete shell types through helpers and overrides. This keeps script‑level shell choices strongly typed where you need them.

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

## Dynamic help defaults

Root and plugin flags display effective defaults derived from the same resolved configuration (overlays + dynamic), evaluated safely at help time:

- Top‑level `-h/--help` computes a read‑only resolved config and evaluates dynamic descriptions (no logging; no `process.env` mutation).
- Subcommand help is rendered with `getdotenv <cmd> -h` / `--help`. Only top-level `-h/--help` is guaranteed to run with side effects suppressed.

Examples (concise excerpts):

```text
# getdotenv -h
  -S, --shell-off                     command execution shell OFF (default)
  -P, --load-process-off              load variables to process.env OFF (default)
  -L, --log-off                       console log loaded variables OFF (default)
```

```text
# getdotenv batch -h
  -r, --root-path <string>  path to batch root directory from current working directory (default: "./")
  -g, --globs <string>      space-delimited globs from root path (default: "*")
  -p, --pkg-cwd             use nearest package directory as current working directory (default)
```

Notes:

- For plugin defaults, set values under `plugins.<mount-path>` in your config (for example `plugins.aws/whoami`), and prefer `plugin.createPluginDynamicOption(cli, …)` so the callback receives the validated, instance-bound plugin config slice.
- Use ON/OFF labels (“(default)”) for boolean toggles and “(default: "...")” for string defaults to keep output concise and consistent.

TypeScript note: Many helper APIs (e.g., env overlay/expansion utilities) accept readonly record inputs, so `as const` maps are fine to pass where appropriate.
