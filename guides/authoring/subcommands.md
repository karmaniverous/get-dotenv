---
title: Subcommands & Resolvers
---

# Authoring Plugins: Subcommands, Options & Defaults

Complex plugins often expose a tree of commands (e.g. `aws dynamodb create`, `aws dynamodb delete`), each with its own options and defaults. This guide documents the canonical pattern to handle precedence, validation, and testing cleanly.

## The Pattern

1. **Schema**: Model per-subcommand defaults as nested objects in your plugin config.
2. **Registration**: Keep CLI wiring thin; do not put business logic in `.action()`.
3. **Resolvers**: Use pure functions to resolve inputs (Flags > Config > Defaults).
4. **Expansion**: Respect the host's interpolation boundary.

## 1. Schema: Nested Defaults

Use a single Zod schema for the plugin, with nested objects for each subcommand. This allows `plugin.readConfig(cli)` to provide typed defaults for the entire tree.

```ts
export const MyPluginConfigSchema = z.object({
  // Shared/Global options
  region: z.string().optional(),

  // Per-subcommand defaults
  create: z
    .object({
      version: z.string().optional(),
      waiter: z
        .object({
          maxSeconds: z.union([z.number(), z.string()]).optional(),
        })
        .optional(),
    })
    .optional(),
});
```

## 2. Command Registration (Thin Wiring)

Command registration modules should only:

- Define the command structure.
- Map untyped `opts` to the Resolver.
- Call the Service.
- Handle errors/exit codes.

```ts
// src/cli/plugin/commands/create.ts
export function attachCreateCommand(cli: GetDotenvCliPublic, plugin: MyPlugin) {
  const cmd = cli.command('create').description('Create resource');

  cmd.action(async (_args, opts) => {
    const cfg = plugin.readConfig(cli);
    const ctx = cli.getCtx();

    // Pass everything to a pure resolver
    const input = resolveCreateInput(opts, cfg, {
      ...process.env,
      ...ctx.dotenv,
    });

    // Call service
    await createService(input);
  });
}
```

## 3. The Resolver Pattern (Pure Logic)

Centralize precedence rules and expansion in a pure function. This makes logic unit-testable without mocking Commander or the CLI host.

Signature: `(flags, config, envRef) => ServiceInput`

```ts
// src/cli/options/create.ts
export function resolveCreateInput(
  flags: Record<string, unknown>,
  config: MyPluginConfig,
  envRef: ProcessEnv,
): CreateServiceInput {
  // 1. Expand flags (Action-time expansion)
  // Users may pass '${VAR}' in flags; expand them here.
  const rawVersion = String(flags.version ?? '');
  const versionFlag = dotenvExpand(rawVersion, envRef);

  // 2. Precedence: Flag > Config > Default
  // Note: Config strings are ALREADY expanded by the host. Do not re-expand.
  const version = versionFlag || config.create?.version || 'v1';

  return { version };
}
```

## 4. Expansion Boundary

The host and plugin share responsibility for variable expansion:

- **Host**: Deep-interpolates plugin config (JSON/YAML/JS/TS) _once_ before the plugin runs.
  - _Implication_: Never call `dotenvExpand` on values read from `plugin.readConfig()`.
- **Plugin**: Responsible for expanding runtime flags (argv).
  - _Implication_: Call `dotenvExpand(value, { ...process.env, ...ctx.dotenv })` on flag values in your resolver.

## 5. Dynamic Help

To show effective defaults in `--help`, attach dynamic options to the _subcommand_, not the root plugin mount.

```ts
const cmd = cli.command('create');

cmd.addOption(
  plugin.createPluginDynamicOption(
    cmd, // Scope help to this subcommand
    '--version <string>',
    (_bag, cfg) =>
      `resource version${cfg.create?.version ? ` (default: ${cfg.create.version})` : ''}`,
  ),
);
```

##
