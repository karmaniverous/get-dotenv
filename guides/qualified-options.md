---
title: Qualified options
---

# Qualified options

Every long option of a get-dotenv CLI can also be given in a _qualified_ form, `--<alias>-<command path>-<option>`, anywhere on the command line. The CLI moves it to the command that owns it before Commander parses anything. That lets you add an option to the end of a command line you don't control, such as an npm script.

## Usage

The root's options qualify with the alias alone; a subcommand's options carry its path:

| Plain, in its place             | Qualified, anywhere           |
| ------------------------------- | ----------------------------- |
| `vc --env bali …`               | `--vc-env bali`               |
| `vc aws --profile dev …`        | `--vc-aws-profile dev`        |
| `vc aws --no-login-on-demand …` | `--vc-aws-no-login-on-demand` |
| `vc smoz openapi --verbose`     | `--vc-smoz-openapi-verbose`   |

Short flags (`-e`) have no qualified form, and neither does `--help`. The full naming rule is in [Qualified names](./authoring/qualified-names.md).

With an npm script that runs your CLI:

```json
{ "scripts": { "openapi": "vc smoz openapi --verbose" } }
```

```bash
nr openapi --vc-env bali
# vc smoz openapi --verbose --vc-env bali
# runs as: vc --env=bali smoz openapi --verbose
```

A qualified option works after `--` and among a forwarded command's arguments too; the forwarded command never sees it:

```bash
vc cmd npm test -- --watch --vc-env bali   # runs: vc --env=bali cmd npm test -- --watch
vc aws s3 ls --vc-aws-profile dev          # runs: vc aws --profile=dev s3 ls
```

Plain options keep their exact positional behaviour. Qualified forms are only added.

## Help output

Every command's help shows the qualified names a user can type, in two ways.

**Its own options** end with their qualified name, `(anywhere: --<name>)`. `-h, --help` is the only line without one. Root help also lists `-h, --help`, `-V, --version` and every root option a plugin or host adds:

```text
Options:
  -e, --env <string>          target environment (dotenv-expanded) (anywhere: --vc-env)
  -h, --help                  display help for command
  -V, --version               output the version number (anywhere: --vc-version)
  …

Plugin options — cmd:
  -c, --cmd <command...>      alias of cmd subcommand; provide command tokens (variadic) (anywhere: --vc-cmd)
```

**The options of the commands above it** follow, one section per command, root first, each option listed by its qualified name (the plain form isn't accepted at that point). `vc aws -h`, abridged:

```text
Options:
  -h, --help                display help for command
  --profile <string>        AWS profile name (anywhere: --vc-aws-profile)
  …

vc options (anywhere):
  --vc-env <string>         target environment (dotenv-expanded)
  --vc-shell [string]       command execution shell, …
  …

Commands:
  cmd [command...]          Execute command according to the --shell option, …
  secrets                   Fixture: AWS Secrets Manager commands
```

`vc aws secrets pull -h` has a `vc options (anywhere)` and a `vc aws options (anywhere)` section. Every command gets this help, including plain `new Command()` mounts such as `batch cmd`.

Hidden options are left out everywhere: options hidden with `rootOptionVisibility` (from `createCli` or config, [Config files](./config.md)) disappear from root help _and_ from every inherited section, and terminators never appear. Visibility merges `createCli` \< packaged \< project/public \< project/local, so a config `true` shows an option a `createCli` `false` hid.

## Values

- A required single value (`--env <name>`) takes the next token or `=value`: `--vc-env bali` or `--vc-env=bali`. The next token must not start with `--`; use `=` for such a value (`--vc-env=--odd`).
- **A variadic option takes `=value` only, one value per token.** Repeat the token for more values:

  ```bash
  vc --vc-cmd='npm test'
  vc aws secrets pull --vc-aws-secrets-pull-exclude=A --vc-aws-secrets-pull-exclude=B
  ```

  A bare `--vc-cmd npm test` fails with `missing value for --vc-cmd`.

- An optional option (`--shell [string]`, `--trace [keys...]`) takes `=value` only; bare, it takes no value.
- A boolean takes no value: `--vc-debug=x` fails with `'--vc-debug' takes no value`.
- Repeating a qualified option is fine: the last value wins, and a variadic's values accumulate in order.

## What normalization writes

Normalization moves each qualified option to its owner and writes it in plain form: the root's options go first, every other command's right after that command's name, always as `--<option>=<value>` (booleans bare). When the walk enters a default subcommand (the shipped CLI's `cmd`) at a token, it writes the subcommand's name in:

```text
vc echo hi --vc-env bali   →  vc --env=bali cmd echo hi
vc node -h                 →  vc cmd node -h        (runs node -h)
vc --bogus -h              →  vc cmd --bogus -h     (cmd's help)
```

`vc -h` stays top-level help, and so does `vc -h --vc-env bali`.

### Terminators in `--debug` output

Under `--debug` (or `--vc-debug`, or `GETDOTENV_DEBUG`), the CLI prints the typed and the normalized argv before parsing:

```text
[getdotenv:argv] typed: ["echo","hi","--vc-shell"] normalized: ["--shell","--vc-q1r1s","cmd","echo","hi"]
```

With redaction on (`--redact`, or `redact` in config or the host's defaults, as the run resolves it), the line masks secrets: each `-v`/`--vars` value whole (plain, `--vc-vars`, after `=` or in a short-flag group such as `-Pv`), and the value of any `KEY=VALUE` token whose key matches the redaction patterns (`DB_PASSWORD=[redacted]`). Any `-v` in the argv counts, a child command's included, so the line may mask more than the root's vars. With redaction off the line is an opt-in diagnostic and shows the argv as given.

`--vc-q1r1s` is the root's _terminator_: a hidden boolean that stops a bare optional option (here `--shell`) from taking the next token (`cmd`) as its value. Each command has one, named from a hash of its path. Normalization writes one wherever the next token it writes would otherwise be taken as a value. That also covers a default subcommand written in after an open variadic value: `vc -c npm test --watch` becomes `vc -c npm test --vc-q1r1s cmd --watch`, so `cmd` isn't read as part of the `-c` command. You never need to type one, and a typed terminator is dropped. See [Terminators](./authoring/qualified-names.md#terminators).

## Errors

Each is a usage error: one line on stderr, exit code 1. A message names options, never their values: `vc -e --vc-aws-profile=prod aws` reports `'--vc-aws-profile'`, without `=prod`.

| Typed                                                  | Error                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `vc --vc-envv bali`                                    | `Unknown option '--vc-envv' (the '--vc-' prefix is reserved for vc)`                     |
| `vc --vc-debug=x`                                      | `'--vc-debug' takes no value`                                                            |
| `vc --vc-cmd npm test`                                 | `missing value for --vc-cmd`                                                             |
| `vc -e --vc-debug aws`                                 | `missing value for -e (the next token, '--vc-debug', is a qualified option)`             |
| `vc --trace A aws --vc-aws-profile x`                  | `'--vc-aws-profile' applies to 'vc aws', which is not being invoked.`                    |
| `vc -- aws --vc-aws-profile x`                         | `'--vc-aws-profile' applies to 'vc aws', which takes no options at this point.`          |
| `vc -e x --vc-env y`                                   | `'--env' given twice (as -e and --vc-env)`                                               |
| `vc aws --no-login-on-demand --vc-aws-login-on-demand` | `'--login-on-demand' given twice (as --no-login-on-demand and --vc-aws-login-on-demand)` |

The `--<alias>-` prefix is reserved: any token that starts with it must be one of the CLI's qualified names, and it is never passed to a child process. A get-dotenv CLI run under another (`vc cmd vc-test …`) therefore can't take the outer CLI's prefix: `--vc-test-env` fails in `vc` as an unknown `--vc-` option. Pick an alias that doesn't start with another CLI's alias followed by a dash ([Nested CLIs](./authoring/qualified-names.md#nested-clis-choosing-an-alias)).

## Known limitation

A plugin's own `new Command()` parent that doesn't use positional options keeps parsing its options after its subcommand. If it declares the same plain flag as its child, it takes the child's qualified option (`--vc-deploy-run-verbose` sets `deploy`'s `--verbose`). No shipped command has this shape. See [Known limitation](./authoring/qualified-names.md#known-limitation-a-parent-that-parses-options-after-its-subcommand) for the workaround.

## Custom hosts: `normalizeArgv`

`GetDotenvCli.parseAsync()` normalizes for every host, built with `createCli` or not. A host that parses argv some other way can call `normalizeArgv` itself and hand the result to Commander as user arguments:

```ts
import {
  GetDotenvCli,
  normalizeArgv,
  NormalizeArgvError,
} from '@karmaniverous/get-dotenv/cliHost';

const program = new GetDotenvCli('vc');
// … compose plugins, then:
await program.brand({ name: 'vc' });
await program.install();

try {
  const argv = normalizeArgv(program, process.argv.slice(2));
  // e.g. ['--env=bali', 'smoz', 'openapi', '--verbose']
} catch (err) {
  if (err instanceof NormalizeArgvError) program.error(err.message);
  throw err;
}
```

The first call builds the host's qualified-name table from the command tree as it stands, so call it after `install()` and `brand()`. `parseAsync(argv, { from })` honours Commander's `from` (`'node'`, `'user'`, `'electron'`, and auto-detection when both are omitted); sync `parse()` throws on a get-dotenv host.
