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

For the same reason, a CLI that runs nested under another get-dotenv CLI shouldn't use an alias of the form `<outer alias>-…` (`vc-tools` under `vc`): the outer CLI reserves every `--vc-*` token.

## Terminators

Each command gets one hidden boolean option, its **terminator**, named `--<alias>-<hash>`. The normalizer writes it after a bare optional option so that the option takes no value from the next token. `<hash>` is deterministic:

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
