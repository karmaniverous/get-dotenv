---
title: Qualified Names
---

# Authoring Plugins: Qualified Names

Every long option in a get-dotenv host has a second, _qualified_ name that carries the CLI alias and the full command path. Plugins don't declare anything to get one. This page is the reference for how the names are built and which rules a plugin's options must follow.

Users can give any of these names anywhere on the command line; `parseAsync()` normalizes argv so each reaches its command. How that works for users (values, `--debug` output, errors) is in the [Qualified options](../qualified-options.md) guide, which also covers `normalizeArgv` for custom hosts.

## The naming rule

A long option `--<opt>` declared on the command at path `p1 … pn` has the qualified name:

```text
--<alias>-<p1>-…-<pn>-<opt>
```

- **Alias:** the root command's name when the table is built, for example `vc`. A `brand({ name })` before the first `parseAsync()` is honoured.
- **Command path:** the names of the mounted commands below the root, down to the command that declares the option, as actually mounted (after `.use(plugin, { ns })` overrides). It includes subcommands that a plugin creates in `setup` with `cli.ns()` or with a plain `new Command()`, not only plugin namespaces. The root's path is empty.
- **Negated options** keep `no-` after the prefix.
- **Parent aliases** such as `-c, --cmd` are declared on the parent, so they take the parent's path.
- **Short flags** have no qualified form.
- **`--help`** is the only long option that is never qualified. The root `--version` (registered by `brand()`) is qualified like any other option.

Help shows every qualified name: each option line ends with `(anywhere: --<name>)`, added when help is rendered (so dynamic descriptions keep it), and each subcommand's help has one `<owner> options (anywhere)` section per command above it. Every command in the tree renders this way, plain `new Command()` mounts included. Options hidden with `hideHelp()` or `rootOptionVisibility` appear in none of it. See [Qualified options](../qualified-options.md#help-output).

| Declared on                               | Option                       | Qualified name                      |
| ----------------------------------------- | ---------------------------- | ----------------------------------- |
| root `vc`                                 | `-e, --env <string>`         | `--vc-env`                          |
| root `vc`                                 | `-V, --version`              | `--vc-version`                      |
| root `vc`                                 | `-c, --cmd <command...>`     | `--vc-cmd`                          |
| `vc aws`                                  | `--profile <string>`         | `--vc-aws-profile`                  |
| `vc aws`                                  | `--no-login-on-demand`       | `--vc-aws-no-login-on-demand`       |
| `vc aws`                                  | `-c, --cmd <command...>`     | `--vc-aws-cmd`                      |
| `vc aws secrets pull` (a `cli.ns()` leaf) | `-s, --secret-name <string>` | `--vc-aws-secrets-pull-secret-name` |

Dynamic options (`createPluginDynamicOption`) are qualified like any other option: they are registered during plugin setup, before the table is built.

## When the table is built

`GetDotenvCli.parseAsync()` installs the plugin tree and then builds the qualified-name table, once per host instance, on the first call. A later `parseAsync()` reuses it. `createCli` calls `brand()` before `parseAsync()`; a host that builds `GetDotenvCli` directly should call `brand()` first too, so the table sees the final name and `--version`.

Building the table fails, with an error thrown from `parseAsync()`, in two cases.

### Collisions

Two different commands can, in contrived trees, produce the same qualified name. For example `aws` with an option `--foo-bar`, and a sibling namespace `aws-foo` with an option `--bar`, both give `--vc-aws-foo-bar`:

```text
Qualified option name collision: '--vc-aws-foo-bar' is claimed by --foo-bar on 'vc aws' and by --bar on 'vc aws-foo'. Rename one of the options.
```

Terminators (below) are reserved entries in the table, so an option that qualifies to a terminator's name collides with it too.

### The `<alias>-` prefix is reserved

A plugin may declare any plain long option it likes, except one that starts with `<alias>-` for the CLI it is mounted in:

```text
Option '--vc-foo' on 'vc aws' starts with '--vc-', a prefix reserved for vc's qualified options. Rename the option.
```

The same reservation limits the aliases of nested CLIs (next section).

## Nested CLIs: choosing an alias

A get-dotenv CLI often runs another one (`vc cmd smoz openapi`, or a `vc` npm script that calls `smoz`). Each CLI claims only the tokens with its own prefix, so `--vc-env` goes to `vc` and `--smoz-env` to `smoz`. That only works if neither prefix contains the other: **pick an alias that doesn't start with another CLI's alias followed by a dash.**

Under `vc`, an inner CLI named `vc-test` can't receive its qualified options. The outer `vc` claims every `--vc-*` token, so `vc cmd vc-test --vc-test-env dev` fails in `vc`:

```text
Unknown option '--vc-test-env' (the '--vc-' prefix is reserved for vc)
```

There is no separate check for this: the outer CLI can't see the inner one's alias, and the reserved-prefix error already makes the clash fail loudly instead of silently. Rename the inner CLI (`vctest`), and the clash goes away.

A CLI nested under _itself_ (`getdotenv batch cmd getdotenv …`) has the same limit: the outer instance claims every `--getdotenv-*` token. Root options still reach the inner CLI through the options bag, so a qualified root option such as `--getdotenv-env` has the intended effect. Give a subcommand option meant for the inner CLI in its plain form, after the inner subcommand (`getdotenv cmd getdotenv aws --profile x`).

## Terminators

Each command gets one hidden boolean option, its **terminator**, named `--<alias>-<hash>`. Normalization writes a terminator wherever the next token it writes would otherwise be taken as an option's value:

- after a bare optional option, so that the option takes no value from the next token: `vc echo hi --vc-shell` becomes `vc --shell --vc-q1r1s cmd echo hi`;
- before a default subcommand it writes in right after an open variadic or optional value, so that the subcommand's name doesn't become part of the value: `vc -c npm test --watch` becomes `vc -c npm test --vc-q1r1s cmd --watch`;
- in the gap a qualified option left, when that gap ended an optional value or a variadic run: `vc --shell --vc-debug echo hi` becomes `vc --debug --shell --vc-q1r1s cmd echo hi`.

It writes none where the next token would already end the value, because Commander doesn't take an option-like token as an optional value. The terminator belongs to the command parsing the open option. `<hash>` is deterministic:

1. Join the alias and the command path with single spaces (`vc`, `vc aws`).
2. Take the SHA-256 of that UTF-8 string as hex.
3. Read the hex as one unsigned integer and write it in base 36.
4. Drop the leading digits.
5. Keep the first 5 characters.

| Command     | Terminator          |
| ----------- | ------------------- |
| `vc`        | `--vc-q1r1s`        |
| `vc aws`    | `--vc-c1ryg`        |
| `smoz`      | `--smoz-d839e`      |
| `getdotenv` | `--getdotenv-qepva` |

`terminatorName(alias, path)` from `@karmaniverous/get-dotenv/cliHost` computes the name:

```ts
import { terminatorName } from '@karmaniverous/get-dotenv/cliHost';

terminatorName('vc', ['aws']); // '--vc-c1ryg'
```

Terminators are registered on every command, including plain `new Command()` mounts, when the table is built, and only once. They:

- never appear in help;
- have no qualified name, and are the only plain options allowed to start with `<alias>-`;
- never appear in a command's `opts()` or in the merged options bag.

## Known limitation: a parent that parses options after its subcommand

Commander lets a command that has neither `enablePositionalOptions()` nor `passThroughOptions()` keep parsing its own options after its subcommand's name. Normalization writes a child's qualified option in plain form right after the child's name, so if such a parent declares the same plain flag as its child, the parent takes it:

```ts
const deploy = new Command('deploy').option('--verbose'); // no positional options
deploy.addCommand(new Command('run').option('--verbose').action(/* … */));

// vc deploy run --vc-deploy-run-verbose  →  vc deploy run --verbose
// deploy.opts().verbose === true; run gets nothing
```

No shipped command has this shape. The root, `cmd`, `batch`, `batch cmd` and `aws` stop parsing their options at their subcommand, and so does every command a host creates (`cli.ns()`, `command()`), because each is a `GetDotenvCli` with positional options. Only a plugin's own `new Command()` parent can have it. In that case, do one of these:

- don't declare a parent's plain flag on its child; or
- call `.enablePositionalOptions()` on the parent, so it stops parsing its options at the subcommand: `vc deploy run --vc-deploy-run-verbose` then sets `run`'s `--verbose`.
