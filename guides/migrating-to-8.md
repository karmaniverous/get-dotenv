---
title: Migrating to 8.0
---

# Migrating from 7.x to 8.0

get-dotenv 8.0 adds [qualified options](./qualified-options.md): every long option also has a form, such as `--vc-env`, that works anywhere on the command line. It also removes a deprecated export, raises the Node floor, and fixes a long list of 7.x defects. A fix restores the behaviour the docs always described, but anyone who relied on the defect will see a change, so every one is listed here.

Each change says what changed, who is affected, and what to do. Issue numbers (`#45`) link to the GitHub issue. Decision numbers (`D23`) refer to the 8.0 design record. Each one is summarized where it is cited.

## Quick checklist

Most users need only the first four items:

1. Run on Node 22.12 or later ([Requirements](#requirements-and-dependencies)).
2. Import `z` from `zod`, not from `@karmaniverous/get-dotenv/cliHost` ([D19](#the-z-re-export-is-gone)).
3. Pass `importMetaUrl: import.meta.url` to every `createCli` call ([D23](#host-identity-createcli)).
4. If library code relies on `getDotenv()` filling `process.env`, pass `loadProcess: true` ([#48](#getdotenv-no-longer-writes-processenv-by-default)).
5. If you call the `createCli` runner with an explicit argv, pass user arguments only ([#53](#the-runner-takes-user-arguments)).
6. Replace sync `program.parse()` with `await program.parseAsync()` ([D31](#sync-parse-throws)).
7. Plugin and host authors: read [For plugin and host authors](#for-plugin-and-host-authors).

## Requirements and dependencies

### Node 22.12 or later

**What changed:** `engines.node` is `>=22.12.0` (it was `>=20`). The runtime dependencies already need it: commander 15 needs `>=22.12.0` and execa 10 needs Node 22. The dependency update is [#37].

**Who is affected:** anyone running get-dotenv, or a CLI built on it, on Node 20 or early Node 22.

**What to do:** upgrade Node. CI matrices that test Node 20 need to drop it.

### The `z` re-export is gone

**What changed:** `@karmaniverous/get-dotenv/cliHost` no longer exports `z` (D19). It was deprecated in 7.x.

**Who is affected:** plugins and hosts that import `z` from get-dotenv.

**What to do:** import it from `zod`, and list `zod` in your own `dependencies`:

```ts
// 7.x
import { definePlugin, z } from '@karmaniverous/get-dotenv/cliHost';

// 8.0
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';
import { z } from 'zod';
```

## Library API

### `getDotenv()` no longer writes `process.env` by default

**What changed:** [#48]. `getDotenv()` returns the composed map and leaves `process.env` alone unless you pass `loadProcess: true`. In 7.x it inherited the CLI's `loadProcess: true` default. The same applies to a bare host's `resolveAndLoad()` called without root hooks. The CLI is unchanged: it still loads `process.env` by default (`-P` turns that off).

**Who is affected:** scripts that call `getDotenv()` and then read `process.env`.

**What to do:** read the returned map, or opt in:

```ts
// 7.x: process.env.APP_SETTING was set as a side effect
await getDotenv({ env: 'dev' });

// 8.0
const vars = await getDotenv({ env: 'dev' }); // vars.APP_SETTING
await getDotenv({ env: 'dev', loadProcess: true }); // or opt in
```

When `loadProcess` is on, an unset value now deletes the key from `process.env` instead of writing the string `"undefined"` ([#47]). This applies to the CLI too.

### An empty `env` counts as unset

**What changed:** [#82]. `getDotenv({ env: '', defaultEnv: 'dev' })` reads `.env.dev` and `.env.dev.local`. In 7.x it read `.env.` and `.env..local`.

**Who is affected:** callers that pass an empty string for `env` (often `process.env.ENV ?? ''`).

**What to do:** nothing, unless you relied on the old file names.

### `dotenvExpand` substitutes referenced values verbatim

**What changed:** [#94]. A referenced value is treated as already composed: it is substituted as is and never expanded again. In 7.x `dotenvExpand(value, ref)` expanded each referenced value recursively. Only a default (`${A:${B}}`) is still expanded.

**Who is affected:** code that calls `dotenvExpand` or `dotenvExpandAll` directly with a _raw_ map, whose values still contain `$` references, and expects nested references to resolve.

**What to do:** expand the map first, then expand against it. `dotenvExpandAll(values, { progressive: true })` expands a map in order, each key against the ones before it:

```ts
const raw = { HOST: 'example.com', URL: 'https://$HOST' };

// 7.x: 'https://example.com'. 8.0: 'https://$HOST'
dotenvExpand('$URL', raw);

// 8.0: expand the map, then expand against the result
const composed = dotenvExpandAll(raw, { progressive: true });
dotenvExpand('$URL', composed); // 'https://example.com'
```

The rest of the expansion changes are in [Expansion](#expansion).

### Public types match the code

**What changed:** [#71]. `GetDotenvOptions` (and its schema) declares the redaction and entropy options `getDotenv()` honours: `redact`, `redactPatterns`, `warnEntropy`, `entropyThreshold`, `entropyMinLength` and `entropyWhitelist`. `GetDotenvConfig` (`defineGetDotenvConfig`) has exactly the loader's keys: the top-level `dotenvToken`, `privateToken`, `paths`, `loadProcess`, `log` and `shell` are gone, and `rootOptionVisibility` is added.

**Who is affected:** TS configs that set those keys at the top level. The loader always ignored them, so they never worked.

**What to do:** move them under `rootOptionDefaults`:

```ts
// 7.x: compiled, but the loader ignored paths
export default defineGetDotenvConfig({ paths: ['./env'] });

// 8.0
export default defineGetDotenvConfig({
  rootOptionDefaults: { paths: './env' },
});
```

### New exports

`resolveDotenvTarget` and `buildDotenvTargetFilename`, with their option and result types, are exported from the package entry ([#55]). `normalizeArgv`, `NormalizeArgvError` and `terminatorName` are exported from `cliHost` ([Qualified options](./qualified-options.md)). These are additions.

### `GETDOTENV_CACHE_KEEP`

**What changed:** [#85]. A value that isn't an integer of at least 1 (`abc`, `2.5`, an empty string) falls back to the default 2. In 7.x it parsed to `NaN` and deleted every cached build of a compiled TS module.

**Who is affected:** nobody who sets a valid integer.

## Host identity: `createCli`

### `importMetaUrl` is required

**What changed:** [#52], D23. `createCli` takes a required `importMetaUrl`, and `createCli()` without it throws. The nearest `package.json` above that URL is the _host package_. It supplies the packaged config layer (`getdotenv.config.*` next to that `package.json`, replacing get-dotenv's own), the `--version` and the root help description. New `version` and `description` options override the last two. In 7.x all three came from get-dotenv, so your CLI reported get-dotenv's version.

**Who is affected:** every host built with `createCli`.

**What to do:**

```ts
// 7.x
await createCli({ alias: 'toolbox' })();

// 8.0
await createCli({ alias: 'toolbox', importMetaUrl: import.meta.url })();
```

A host whose package root is also the project root (a repo-local `cli/vc.ts`, for example) now applies its `getdotenv.config.*` once, as project config. In 7.x it applied as both packaged and project config, so its `dynamic` ran twice.

A host that builds `GetDotenvCli` directly sets its host root with `new GetDotenvCli(alias, { importMetaUrl })` or `brand({ importMetaUrl })`, and the last one given wins. With neither, it keeps get-dotenv's own root, as in 7.x.

### The runner takes user arguments

**What changed:** [#53]. The function `createCli` returns now treats an explicit `argv` as user arguments only. In 7.x it dropped the first two entries of any explicit argv with two or more entries, so `run(['-e', 'dev', 'cmd', 'x'])` lost `-e dev`. Called with no arguments it still reads `process.argv`.

**Who is affected:** callers that pass `process.argv` (or a copy) to the runner.

**What to do:**

```ts
// 7.x
await run(process.argv);

// 8.0: either form
await run(process.argv.slice(2));
await run(process.argv, { from: 'node' });
```

### A runner can run twice

**What changed:** [#87]. `brand()` registers `-V, --version` once, the first time a version is known. A later `brand()` updates the version, and `--version` prints the latest. In 7.x a second `run()` on the same runner threw `Cannot add option '-V, --version'`. Nothing to do.

## Argv normalization and qualified options

Every `GetDotenvCli.parseAsync()` now normalizes argv before Commander parses it: it moves each qualified option to its command and writes it in plain form. Plain options keep their 7.x positional behaviour, apart from the changes below. The user guide is [Qualified options](./qualified-options.md); the naming rules are in [Qualified names](./authoring/qualified-names.md).

### Qualified options (new)

Every long option has a qualified name, `--<alias>-<command path>-<option>` (D17): `--vc-env`, `--vc-aws-profile`. It works anywhere, including after `--` and among a forwarded command's arguments, so npm scripts no longer need wrapper scripts:

```bash
# 7.x: fails, root options are only accepted before the first subcommand
nr openapi -e bali                # runs: vc smoz openapi --verbose -e bali

# 8.0
nr openapi --vc-env bali          # runs: vc --env=bali smoz openapi --verbose
```

This is an addition. The next item is the change it brings.

### The `--<alias>-` prefix is reserved

**What changed:** D20. Every argv token that starts with `--<alias>-` belongs to the CLI, wherever it appears. A token that is one of the CLI's qualified names is moved to its command; any other fails with `Unknown option '--vc-envv' (the '--vc-' prefix is reserved for vc)`. Such a token is never passed to a child process, even after `--`.

**Who is affected:** commands that pass a child an argument starting with your CLI's alias and a dash (`vc cmd tool --vc-mode`), and nested get-dotenv CLIs whose alias starts with the outer alias and a dash ([Choosing a CLI alias](#choosing-a-cli-alias)).

**What to do:** rename the child's argument, or pass it some other way (an environment variable, a config file).

### A default subcommand is written into argv

**What changed:** D30, D31. When normalization enters a default subcommand (the shipped CLI's `cmd`) at a token, it writes the subcommand's name in, so Commander dispatches to it by name. Two help cases change:

| Typed           | 7.x               | 8.0                                           |
| --------------- | ----------------- | --------------------------------------------- |
| `vc node -h`    | renders root help | runs `node -h` (normalized: `vc cmd node -h`) |
| `vc --bogus -h` | renders root help | renders `cmd` help (`vc cmd --bogus -h`)      |

`vc -h` is still top-level help.

**Who is affected:** scripts or docs that use `<cli> <command> -h` to show your CLI's help.

**What to do:** use `<cli> -h` for root help, and `<cli> cmd -h` for `cmd` help.

### Sync `parse()` throws

**What changed:** D31. Installing plugins and loading config are async, so sync `parse()` can't normalize. On a `GetDotenvCli` it throws `parse() is not supported on a get-dotenv host; use parseAsync().`

**What to do:** `await program.parseAsync(argv, { from })`. `parseAsync` honours Commander's `from` (`'node'`, `'user'`, `'electron'`) and its auto-detection when argv is omitted.

### `rawArgs` holds the normalized user arguments

**What changed:** D31. Commander parses the normalized argv with `{ from: 'user' }`, so the root's `rawArgs` has no leading `node` and script entries, and holds the normalized form, with written-in default subcommands, `--<option>=<value>` reinsertions and terminators. 7.x's `["node", "vc", "-e", "dev", …]` becomes `["-e", "dev", …]`. Subcommands keep an empty `rawArgs`, as before.

**Who is affected:** plugins and hosts that read `rawArgs`.

**What to do:** read the root's `rawArgs`, skip no leading entries, and expect the normalized form.

### `--debug` prints the argv

**What changed:** D28. Under `--debug` (or `--vc-debug`, or `GETDOTENV_DEBUG`), `parseAsync` first prints `[getdotenv:argv] typed: [...] normalized: [...]` to stderr. The normalized argv can contain a hidden _terminator_, such as `--vc-q1r1s`, that ends an optional option's value ([Terminators](./authoring/qualified-names.md#terminators)). Tools that parse `--debug` output may need to skip this line.

### Errors are usage errors

Normalization errors (unknown `--<alias>-` option, missing value, an option given in both forms, an option whose command isn't invoked) print one line and exit 1, like Commander's own usage errors. They honour `exitOverride`. The [error table](./qualified-options.md#errors) lists them.

The runner's error boundary now covers plugin install and top-level help too ([#62]). An invalid config with `-h` prints one error line and exits 1. In 7.x `run()` rejected with an unhandled error.

## Option resolution and defaults

### OFF flags override a true default

**What changed:** [#45]. Every ON/OFF family resolves from the flags of this invocation: an explicit ON flag gives `true`, an explicit OFF flag gives `false`, and otherwise the value comes from the defaults stack. In 7.x an OFF flag couldn't override a true default, so `-P` did nothing against the built-in `loadProcess: true`, and neither did `-L`, `-A`, `-R`/`-U`/`-N`/`-G`/`-Z`, `--debug-off` or `--entropy-warn-off`. `--entropy-warn` and `--redact-off` were ignored. An explicit OFF flag now puts `false` (not a missing key) in the options bag and in a child's `getDotenvCliOptions`.

**Who is affected:** anyone who passed OFF flags that never worked, and code that tests `bag.loadProcess === undefined`.

**What to do:** remove OFF flags you don't want, and test for `false`.

### `rootOptionDefaults.excludeAll` works

**What changed:** [#68]. `rootOptionDefaults.excludeAll: true`, in config or `createCli`, excludes all five dotenv layers. In 7.x config stripped the key and `createCli` ignored it. An individual exclusion default, `-a`/`-A` and the individual flags beat it.

**Who is affected:** configs that set `excludeAll: true` and loaded dotenv files anyway.

### `createCli` defaults rank below config

**What changed:** [#77]. Root options resolve from one stack, higher wins: CLI flags, the parent options bag, config `rootOptionDefaults` (project local, project public, packaged), `createCli({ rootOptionDefaults })`, built-in defaults. In 7.x `createCli` defaults became Commander option defaults, so they beat config and the parent bag. Root flags no longer carry Commander defaults, so `opts()` on a bare host holds only what the command line gave.

**Who is affected:** hosts whose `createCli` defaults disagree with a project's config, and code that read defaults from `opts()`.

**What to do:** read resolved options from the options bag (`readMergedOptions`), not `opts()`.

### A child CLI keeps the parent's `shell: false`

**What changed:** [#91]. A parent run with `-S` (`shell: false`) now runs a nested child CLI without a shell too, even when the child's own default shell is a string. The child's own `--shell` still wins.

### Config `rootOptionDefaults` rejects `dynamic` and `logger`

**What changed:** [#83]. A config whose `rootOptionDefaults` sets `dynamic` or `logger` is invalid, in every format, and the run fails with `rootOptionDefaults.dynamic: ... is not allowed in rootOptionDefaults`. In 7.x JSON and YAML configs accepted them.

**What to do:** put `dynamic` at the top level of a JS/TS config. A logger is programmatic only.

### One composition per run

**What changed:** [#64]. Each invocation composes its dotenv context once. Config `dynamic` functions and other composition side effects run once, where 7.x ran them twice per subcommand run and three times on the `-c` path. `-z` (exclude dynamic) now covers every composition.

**Who is affected:** `dynamic` functions with side effects that counted on the extra runs.

### `rootOptionVisibility` hides options

**What changed:** [#60]. `rootOptionVisibility` hides what it names. In 7.x it hid nothing. Every root flag has a key (`env`, `outputPath`, `defaultEnvKey`, `debug` and `excludeAll` are new), and a higher layer's `true` shows a flag a lower layer hid. Visibility applies to every help rendering ([Help](#help)).

**Who is affected:** configs or hosts with `rootOptionVisibility` entries that had no effect. Those options now disappear from help.

## Expansion

### Escapes, literal dollars and self references

**What changed:** [#78], [#86]. The expander scans each value once, left to right. With `A=x`:

- `\$` is always a literal `$`, even when the same name also appears unescaped: `'\$A $A'` gives `'$A x'`.
- A `$` that starts no reference stays literal, and the rest of the value still expands: `'$A cost $'` gives `'x cost $'`. In 7.x the whole value was left unexpanded.
- A substituted value is spliced in as is: `$&` and `$$` in it have no special meaning, and it is not re-scanned with the text around it. `$FOO$BAR` no longer forms a new reference out of expanded text.
- A value never sees itself: `SELF=$SELF` gives the value composed before it (or its default, else empty) instead of a `RangeError`.

**Who is affected:** values with `\$`, stray `$`, `$&` or `$$`, or self references.

### Referenced values are not expanded again

**What changed:** [#94]. A value that has been composed (from a dotenv file, config `vars`/`envVars`, `-v` or `process.env`) is substituted verbatim when another value references it. With `PW` set to `a$$b` in the environment, `X=$PW` gives `a$$b`. In 7.x the referenced value was expanded again, and `X` was `a$` (`$b` is unset). The API side of this change is [above](#dotenvexpand-substitutes-referenced-values-verbatim).

### `-v` is expanded once

**What changed:** [#89]. `-v` (`--vars`) values are expanded once, in the vars layer, so `\$` gives a literal `$`: `-v 'P=\$5'` sets `P` to `$5`. In 7.x `-v` was expanded twice, so `P` was unset, and you needed `\\$` for a literal `$`. The options bag keeps the `-v` string as given.

**What to do:** replace `\\$` with `\$` in `-v` values.

### Config and `-v` values see `process.env`

**What changed:** [#63]. Config `vars`/`envVars` and `-v` values expand against `process.env` overlaid with the values composed so far, as dotenv files already did. In 7.x they saw only the composed map, so a reference to an ambient variable gave the empty string.

**Who is affected:** config values that name a variable set only in the shell environment, and expected it to be empty.

## Env composition

- **`-v` splits at the first assignor** ([#73]). `-v 'A=b=c'` sets `A` to `b=c` (it was `b`). Base64 padding and query strings survive. The same holds for a custom `--vars-assignor`.
- **Unset keys leave `process.env`** ([#47]). The CLI's `loadProcess` deletes a key whose value is unset, or that a dynamic `null` removed, instead of writing `"undefined"`. Children no longer inherit the string `"undefined"`.
- **Env validation runs once** ([#61]). `requiredKeys` and `schema` issues are reported once per run, not twice.

## Command execution

### The `-c` alias is the `cmd` action

**What changed:** [#49], [#70], D21. The parent alias (`-c, --cmd`) runs exactly the `cmd` subcommand's code path: the same options bag, config `scripts`, `createCli` defaults, scoped `afterResolve` and exit-code handling. In 7.x it had its own bag and composed its own context, with no plugin config and no `afterResolve`. Also:

- `getdotenv -c hello` runs the config script `hello`. In 7.x the alias passed the unresolved name to the shell.
- A subcommand name inside the alias value is just part of the command: `getdotenv -c echo init` runs `echo init`.
- `optionAlias.expand: false` is honoured.
- The alias's own `[getdotenv:alias]` debug lines are gone.

### Capture keeps stderr

**What changed:** [#74]. Under `--capture` (or `GETDOTENV_STDIO=pipe`) the child's stderr is re-emitted to stderr after it exits. In 7.x it was dropped.

### The shell gets the command string untouched

**What changed:** [#79]. With a shell, the command string reaches the shell exactly as typed. In 7.x runs of spaces were collapsed and `\ ` was stripped, so a quoted argument `"x   y"` reached the child as `x y`.

### The child env is the composed env

**What changed:** [#88]. A child gets the composed environment as its complete environment; `process.env` is not merged in again. On Windows, a dotenv key whose name differs from an ambient variable only in case now wins in the child.

The same holds for `runCommand`/`runCommandResult` called with an `env` that has no string values, such as `env: {}` (independent review of #93, finding 7): the child gets that empty environment plus only the platform minimum (on Windows, the variables libuv copies from the parent: `HOMEDRIVE`, `HOMEPATH`, `LOGONSERVER`, `PATH`, `SYSTEMDRIVE`, `SYSTEMROOT`, `TEMP`, `USERDOMAIN`, `USERNAME`, `USERPROFILE`, `WINDIR`; on POSIX, nothing). In 7.x, and earlier on this branch, such an env meant "inherit all of `process.env`". Leave `env` out to inherit.

### Script names are the scripts table's own keys

**What changed:** [#90]. A command named after an inherited object property (`toString`, `constructor`) runs as typed. In 7.x `getdotenv toString` crashed with `command.map is not a function`.

## Exit codes

**What changed:** [#50], [#75].

- `cmd`, the default command, the `-c` alias and batch exit with the child's exit code. In 7.x the code was lost.
- Sequential `batch` stops at the first failure and exits with its code. In 7.x it ran every directory.
- Usage errors exit non-zero. In 7.x some exited 0.
- A child that can't be spawned prints `Error: <message>` and exits 127 (ENOENT) or 1. In 7.x the exit code was `NaN`, and the alias and the aws forward crashed in `process.exit(NaN)`.

Under the default Windows shell, `powershell.exe -Command` reports any failure as 1. Run with `--shell-off` or a POSIX shell to keep the original code.

**Who is affected:** CI scripts that ignored a failing child because get-dotenv exited 0. They will now fail, as they should.

## Shell

**What changed:** [#51].

- `shell: true` in a script or plugin config means the OS default shell: `/bin/bash` on POSIX, `powershell.exe` on Windows. In 7.x it passed `true` to execa, which used `/bin/sh` or `cmd.exe`.
- Argument tokens (batch positionals, the aws forward) are quoted for the resolved shell. On Windows they were quoted with `cmd.exe` rules even under PowerShell, so `"a b"` and `x$y` broke.
- Under PowerShell every argument token is single-quoted, with each of PowerShell's single-quote characters (`'` and U+2018 to U+201B) doubled, and a `--%` token is passed as `@('--%')`. Earlier on this branch a curly quote or a bare `--%` let a token break out of its quotes (independent review of #93, finding 1).
- An empty argument token is kept, under every shell (`''`, or `""` for `cmd.exe`). In 7.x it vanished from the joined command (independent review of #93, finding 3).
- The built-in `git-status` script is `git status -s -u -b` ([#51] follow-up). The 7.x `git branch --show-current && git status -s -u` fails under PowerShell 5.1, which has no `&&`.

**Who is affected:** scripts with `shell: true` that use `cmd.exe` syntax on Windows, or `sh`-only syntax that bash treats differently.

**What to do:** set the shell explicitly (`shell: 'cmd.exe'`) where a script needs one.

## Batch

### `batch` has no default subcommand

**What changed:** [#65]. `batch cmd` is no longer `batch`'s default subcommand, so `batch -l X` runs batch's own action: it lists directories, with `X` as an extra glob. In 7.x `batch -l X` ran `X`. `batch <command...>` still runs the command in each directory, through batch's own action, and `batch cmd <command...>` still works. Help no longer marks `batch cmd` as the default subcommand.

**Who is affected:** anyone who relied on `batch -l <command>` running the command.

### Every batch form passes the options bag

**What changed:** [#59]. `batch --command`, `batch --list` and the positional forms all pass the merged options bag to each child (`getDotenvCliOptions`), so `--capture` applies. In 7.x they passed `{}`.

Batch exit codes are in [Exit codes](#exit-codes).

## AWS

- **`aws whoami really` is gone** ([#57]). It was a demo that shipped by accident. `aws whoami` takes no subcommand, and `aws whoami really` fails with `too many arguments`.
- **One session per invocation** ([#56]). The session is resolved once, with the `aws` flags applied, and `aws` child commands keep it: `mycli aws --profile dev whoami` runs `whoami` with the `dev` session. In 7.x the session could be resolved up to three times, the last from dotenv. In a forward (`aws -- <args>`), the session's `AWS_*` entries now beat dotenv `AWS_*` keys.
- **The forward passes the options bag** ([#69]). `aws -- <args>` gives the child `getDotenvCliOptions`, like every other spawn path.
- **SSO login retries get a fresh budget** ([#80]). After an interactive `sso login`, the credential export retry and the static fallback each get a new probe time budget. In 7.x they reused the expired one and failed.
- **Help resolves no session** ([#84]). `aws … -h` with an explicit runner argv no longer starts a session. The guard reads the argv being parsed, not `process.argv`.

## init

- **`.gitignore` is never rewritten** ([#58]). `init` appends only the missing lines, in the file's own line ending. In 7.x it rewrote the file, changing CRLF endings and blank lines.
- **`init --dynamic` is gone** ([#58]). The flag did nothing. `init --dynamic` now fails with `unknown option '--dynamic'`. Remove it from scripts.

## Dotenv editor and writers

- **An existing target beats any template** ([#54], [#39]). `editDotenvFile` and `resolveDotenvTarget` search candidates tier by tier, each across every path: an existing target, then the env-specific template, then the new shared env template (`.env.env.local.template`, token `sharedEnvTemplateToken`). In 7.x a template in an earlier path beat an existing target in a later one, and a second file was created from it.
- **`sync` upserts** ([#67], D22). `mode: 'sync'` makes the file hold exactly the given keys: existing keys are updated in place, missing ones are appended and the rest are removed. In 7.x `sync` never added keys.
- **Appends go on their own line** ([#66]). A key appended to a file with no final newline starts a new line (`A=1` plus `B` gives `A=1\nB=2`, not `A=1B=2`).
- **Values round-trip, or the write throws** ([#72]). The editor and the `-o`/`outputPath` writer quote each value so dotenv reads it back exactly: `x #y` is written `"x #y"`, a Windows path with `\n` in single quotes. A value that no quote style can hold, such as one with `"`, `'`, `` ` `` and a line break, throws `Unable to write dotenv key "K": dotenv cannot read its value back unchanged in any quote style.` In 7.x it was written and read back wrong.

**Who is affected:** code that edits dotenv files with arbitrary values. Catch the error, or keep such values out of dotenv files.

## Help

- **Root help lists every option** ([#76]). `-h, --help`, `-V, --version` and root options a plugin or host adds without a group are listed. In 7.x they were missing.
- **Qualified names in every help** (D27). Each option line ends with `(anywhere: --<qualified name>)`. Each subcommand's help adds one `<owner> options (anywhere)` section per command above it. Every command gets this layout, plain `new Command()` mounts included.
- **Hidden options stay hidden** ([#60]). Every help path skips hidden options, and `rootOptionVisibility` applies to subcommand help too.
- **Top-level help has no side effects** ([#81]). `-h` resolves help labels from the `createCli` and config defaults, and no longer runs config `dynamic`.
- `vc node -h` and `vc --bogus -h` changed too ([D30, D31](#a-default-subcommand-is-written-into-argv)).

**Who is affected:** tests that snapshot help output. Re-record them.

## Diagnostics (redaction and entropy)

**What changed:** [#46].

- `--redact-pattern` works and adds to the built-in patterns. In 7.x the flag was ignored, and custom patterns replaced the built-ins.
- The built-in patterns match a whole key or an `_`/`-` delimited segment: `API_SECRET` is masked, `SECRETARY` is not. They were word-bounded and missed `API_SECRET`.
- `-l` output is redacted and entropy-checked on every path. The CLI's `-l` was unredacted.
- `--entropy-threshold` and `--entropy-min-length` take numbers. In 7.x their values were strings and ignored.
- `--entropy-whitelist` and `entropyWhitelist` add to the built-in whitelist instead of replacing it.

**Who is affected:** anyone who relied on `-l` printing secrets in clear, or on custom patterns replacing the built-ins.

## For plugin and host authors

Read the sections above that touch hosts: [Host identity](#host-identity-createcli), [Argv normalization](#argv-normalization-and-qualified-options) and [One composition per run](#one-composition-per-run). Then work through this list.

### `.use(plugin, { ns })` overrides work

[#44]. A plugin mounted with `.use(plugin, { ns: 'deploy-api' })` is mounted at the override, its config is keyed by the override (`plugins['deploy-api']`), and its `afterResolve` scoping uses it. In 7.x the override was ignored. Two siblings with the same namespace fail with `Duplicate namespace 'deploy' under 'root'. Override via .use(plugin, { ns: '...' }).` instead of Commander's raw message. If you worked around the ignored override, remove the workaround.

### Import `z` from `zod`

See [The `z` re-export is gone](#the-z-re-export-is-gone). Declare `zod` as a `dependency` of your package, and keep it external in your build, so it isn't bundled.

### Pass `importMetaUrl`

Every `createCli` call needs `importMetaUrl: import.meta.url`, in your bin, guides, test utilities and tests. A test that builds `new GetDotenvCli` directly passes `importMetaUrl` to the constructor or to `brand()`. See [Host identity](#host-identity-createcli).

### Make get-dotenv an optional peer

D32. A plugin package has its own product and a get-dotenv plugin on the side. With get-dotenv as a direct dependency, a host can end up with two copies of `GetDotenvCli`, which breaks `readMergedOptions` and dynamic help. The first-party plugin packages now use this layout, and we recommend it for yours. [Packaging](./authoring/packaging.md) has the full `package.json` and the details.

- **get-dotenv is an optional peer:** `peerDependencies: { "@karmaniverous/get-dotenv": "^8" }` with `peerDependenciesMeta` marking it `optional`, plus a `devDependency`. Not a `dependency`.
- **The main entry (`.`) never loads get-dotenv**, at runtime or in its types. Not even `import type`: it still emits `from '@karmaniverous/get-dotenv'` into the entry's `.d.ts`.
- **The plugin and its config schema move to a `./get-dotenv` subpath:**

  ```ts
  // 7.x
  import { secretsPlugin } from '@karmaniverous/aws-secrets-manager-tools';

  // 8.0
  import { secretsPlugin } from '@karmaniverous/aws-secrets-manager-tools/get-dotenv';
  ```

- **Types the main entry exposes are local.** Define your own `Logger` and `ProcessEnv` (structural copies of get-dotenv's), and replace `assertLogger` with a local check.
- **`zod` is a declared `dependency`**, kept external by your build.
- **Test** the main entry with get-dotenv absent, and run `tsc` with `skipLibCheck: false` against the packed main entry's types.

### Ship a bin as a launcher

D33. npm doesn't install optional peers, so a bin built on get-dotenv must fail cleanly without it. Make the bin a small launcher that loads the CLI module with a dynamic `import()` (the CLI module is a separate file, and the build emits it as a chunk: Rollup `output.dir`, not `output.file`). When the import fails with `ERR_MODULE_NOT_FOUND` for get-dotenv, the launcher prints the three install routes to stderr and exits 1:

```text
mytool needs @karmaniverous/get-dotenv ^8. Install it:
  local:  npm i -D @karmaniverous/get-dotenv@^8
  global: npm i -g @karmaniverous/get-dotenv@^8
  npx:    npx -p @karmaniverous/get-dotenv@^8 -p @acme/mytool mytool
```

The launcher code is in [Packaging](./authoring/packaging.md#a-bin-is-a-launcher).

### Don't declare `<alias>-` options

D24. A plugin may not declare a plain long option that starts with `<alias>-` for the CLI it's mounted in (`--vc-foo` under `vc`). Building the qualified-name table, in the first `parseAsync()`, throws:

```text
Option '--vc-foo' on 'vc aws' starts with '--vc-', a prefix reserved for vc's qualified options. Rename the option.
```

Two options that qualify to the same name, such as `--foo-bar` on `aws` and `--bar` on a sibling `aws-foo`, throw a collision error naming both commands. Rename one. Neither can happen in a tree that worked in 7.x unless an option starts with the alias, but both are checked whenever you compose a new tree. See [Qualified names](./authoring/qualified-names.md).

### Choosing a CLI alias

D40. A get-dotenv CLI that runs under another one (`vc cmd smoz …`) must not take an alias that starts with the outer CLI's alias and a dash. Under `vc`, the alias `vc-test` fails: the outer `vc` claims every `--vc-*` token, so `--vc-test-env` is rejected as an unknown `--vc-` option before the inner CLI sees it. There is no separate check; the reserved prefix enforces the rule. Pick an alias that doesn't start with another CLI's alias followed by a dash, such as `vctest`. See [Nested CLIs](./authoring/qualified-names.md#nested-clis-choosing-an-alias).

### Terminators

D28, D41. Each command has a hidden boolean option, its _terminator_, named `--<alias>-<hash>` (`--vc-q1r1s` for `vc`). Normalization writes it wherever the next token it writes would otherwise be taken as a value: after a bare optional option (`--vc-shell` becomes `--shell --vc-q1r1s`), and before a written-in default subcommand that follows an open variadic or optional value (`vc -c npm test --watch` becomes `vc -c npm test --vc-q1r1s cmd --watch`). Terminators are registered on every command, plain `new Command()` mounts included, never appear in help, and are left out of `opts()` and the options bag. You never declare or type one; a typed terminator is dropped. `terminatorName(alias, path)` computes a name for tests. If an option of yours qualifies to a terminator's name, the table reports a collision; rename the option. See [Terminators](./authoring/qualified-names.md#terminators).

### Known limitation: a parent that parses options after its subcommand

D42. Commander lets a command without positional options keep parsing its own options after its subcommand. If such a parent and its child declare the same plain flag, the parent takes the child's qualified option once normalization writes it in plain form:

```ts
const deploy = new Command('deploy').option('--verbose'); // no positional options
deploy.addCommand(new Command('run').option('--verbose').action(/* … */));

// vc deploy run --vc-deploy-run-verbose  →  vc deploy run --verbose
// deploy.opts().verbose === true; run gets nothing
```

No shipped command has this shape: the root, `cmd`, `batch`, `batch cmd` and `aws` all stop parsing at their subcommand, as does every command `cli.ns()` creates. For your own `new Command()` parents, either don't reuse a parent's plain flag on a child, or call `.enablePositionalOptions()` on the parent, so it stops parsing its options at the subcommand. See [Known limitation](./authoring/qualified-names.md#known-limitation-a-parent-that-parses-options-after-its-subcommand).

### Reading argv and composing once

- Read argv from the root's `rawArgs`, which is normalized and has no leading `node`/script entries ([`rawArgs`](#rawargs-holds-the-normalized-user-arguments)).
- Your `dynamic` and `afterResolve` code runs once per invocation ([#64]); don't count on a second pass.
- `afterResolve` receives the options bag with the 8.0 resolution rules ([Option resolution](#option-resolution-and-defaults)).

[#37]: https://github.com/karmaniverous/get-dotenv/issues/37
[#39]: https://github.com/karmaniverous/get-dotenv/issues/39
[#44]: https://github.com/karmaniverous/get-dotenv/issues/44
[#45]: https://github.com/karmaniverous/get-dotenv/issues/45
[#46]: https://github.com/karmaniverous/get-dotenv/issues/46
[#47]: https://github.com/karmaniverous/get-dotenv/issues/47
[#48]: https://github.com/karmaniverous/get-dotenv/issues/48
[#49]: https://github.com/karmaniverous/get-dotenv/issues/49
[#50]: https://github.com/karmaniverous/get-dotenv/issues/50
[#51]: https://github.com/karmaniverous/get-dotenv/issues/51
[#52]: https://github.com/karmaniverous/get-dotenv/issues/52
[#53]: https://github.com/karmaniverous/get-dotenv/issues/53
[#54]: https://github.com/karmaniverous/get-dotenv/issues/54
[#55]: https://github.com/karmaniverous/get-dotenv/issues/55
[#56]: https://github.com/karmaniverous/get-dotenv/issues/56
[#57]: https://github.com/karmaniverous/get-dotenv/issues/57
[#58]: https://github.com/karmaniverous/get-dotenv/issues/58
[#59]: https://github.com/karmaniverous/get-dotenv/issues/59
[#60]: https://github.com/karmaniverous/get-dotenv/issues/60
[#61]: https://github.com/karmaniverous/get-dotenv/issues/61
[#62]: https://github.com/karmaniverous/get-dotenv/issues/62
[#63]: https://github.com/karmaniverous/get-dotenv/issues/63
[#64]: https://github.com/karmaniverous/get-dotenv/issues/64
[#65]: https://github.com/karmaniverous/get-dotenv/issues/65
[#66]: https://github.com/karmaniverous/get-dotenv/issues/66
[#67]: https://github.com/karmaniverous/get-dotenv/issues/67
[#68]: https://github.com/karmaniverous/get-dotenv/issues/68
[#69]: https://github.com/karmaniverous/get-dotenv/issues/69
[#70]: https://github.com/karmaniverous/get-dotenv/issues/70
[#71]: https://github.com/karmaniverous/get-dotenv/issues/71
[#72]: https://github.com/karmaniverous/get-dotenv/issues/72
[#73]: https://github.com/karmaniverous/get-dotenv/issues/73
[#74]: https://github.com/karmaniverous/get-dotenv/issues/74
[#75]: https://github.com/karmaniverous/get-dotenv/issues/75
[#76]: https://github.com/karmaniverous/get-dotenv/issues/76
[#77]: https://github.com/karmaniverous/get-dotenv/issues/77
[#78]: https://github.com/karmaniverous/get-dotenv/issues/78
[#79]: https://github.com/karmaniverous/get-dotenv/issues/79
[#80]: https://github.com/karmaniverous/get-dotenv/issues/80
[#81]: https://github.com/karmaniverous/get-dotenv/issues/81
[#82]: https://github.com/karmaniverous/get-dotenv/issues/82
[#83]: https://github.com/karmaniverous/get-dotenv/issues/83
[#84]: https://github.com/karmaniverous/get-dotenv/issues/84
[#85]: https://github.com/karmaniverous/get-dotenv/issues/85
[#86]: https://github.com/karmaniverous/get-dotenv/issues/86
[#87]: https://github.com/karmaniverous/get-dotenv/issues/87
[#88]: https://github.com/karmaniverous/get-dotenv/issues/88
[#89]: https://github.com/karmaniverous/get-dotenv/issues/89
[#90]: https://github.com/karmaniverous/get-dotenv/issues/90
[#91]: https://github.com/karmaniverous/get-dotenv/issues/91
[#94]: https://github.com/karmaniverous/get-dotenv/issues/94
