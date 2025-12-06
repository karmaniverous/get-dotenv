---
title: demo
---

# Shipped Plugins: demo

An educational plugin that showcases:

- Accessing the resolved dotenv context (`cli.getCtx()`).
- Executing child processes with explicit env injection.
- Resolving commands and shell overrides via the shared helpers.
- Using `--trace` diagnostics.

## Import paths

```ts
// Recommended: plugins barrel (shares type identity with cliHost)
import { demoPlugin } from '@karmaniverous/get-dotenv/plugins';
```

Per‑plugin subpaths remain available when needed:

```ts
import { demoPlugin } from '@karmaniverous/get-dotenv/plugins/demo';
```

## Commands

- `demo ctx` — Print a summary of the current dotenv context (counts + sample).
- `demo run --print KEY` — Print a single dotenv value via a shell‑off child.
- `demo script [command...]` — Resolve and execute a command via `scripts` and
  per‑script shell overrides.

## Example

```ts
import { runCommand } from '../../cliCore/exec';
import { buildSpawnEnv } from '../../cliCore/spawnEnv';
import { definePlugin } from '../../cliHost/definePlugin';
import type { Logger } from '../../GetDotenvOptions';
import { resolveCommand, resolveShell } from '../../services/batch/resolve';

export const demoPlugin = () =>
  definePlugin({
    id: 'demo',
    setup(cli) {
      const logger: Logger = console;
      const ns = cli
        .ns('demo')
        .description(
          'Educational demo of host/plugin features (context, child exec, scripts/shell)',
        );

      // demo ctx
      ns.command('ctx')
        .description('Print a summary of the current dotenv context')
        .action(() => {
          const ctx = cli.getCtx();
          const dotenv = ctx?.dotenv ?? {};
          const keys = Object.keys(dotenv).sort();
          const sample = keys.slice(0, 5);
          logger.log('[demo] Context summary:');
          logger.log(`- keys: ${keys.length.toString()}`);
          logger.log(`- sample keys: ${sample.join(', ') || '(none)'}`);
          logger.log('- tip: use "--trace [keys...]" for per-key diagnostics');
        });

      // demo run --print KEY
      ns.command('run')
        .description(
          'Run a small child process under the current dotenv (shell-off)',
        )
        .option('--print <key>', 'dotenv key to print', 'APP_SETTING')
        .action(async (opts: { print?: string }) => {
          const key =
            typeof opts.print === 'string' && opts.print.length > 0
              ? opts.print
              : 'APP_SETTING';

          const code = `console.log(process.env.${key} ?? "")`;
          const ctx = cli.getCtx();

          await runCommand(['node', '-e', code], false, {
            env: buildSpawnEnv(process.env, ctx?.dotenv),
            stdio: 'inherit',
          });
        });

      // demo script [command...]
      ns.command('script')
        .description(
          'Resolve a command via scripts and execute it with the proper shell',
        )
        .argument('[command...]')
        .action(
          async (
            commandParts: string[] | undefined,
            _opts: unknown,
            thisCommand: unknown,
          ) => {
            const parent = (thisCommand as { parent?: unknown }).parent as
              | (typeof cli & {
                  getDotenvCliOptions?: {
                    scripts?: Record<
                      string,
                      string | { cmd: string; shell?: string | boolean }
                    >;
                    shell?: string | boolean;
                  };
                })
              | undefined;
            const bag = parent?.getDotenvCliOptions ?? {};
            const ctx = cli.getCtx();

            const input = Array.isArray(commandParts)
              ? commandParts.map(String).join(' ')
              : '';
            if (!input) {
              logger.log(
                '[demo] Provide a command or script name, e.g. "echo OK" or "git-status".',
              );
              return;
            }

            const scripts = (bag as { scripts?: Record<string, unknown> })
              .scripts as
              | Record<
                  string,
                  string | { cmd: string; shell?: string | boolean }
                >
              | undefined;
            const resolved = resolveCommand(scripts, input);
            const shell = resolveShell(
              scripts,
              input,
              (bag as { shell?: string | boolean }).shell,
            );

            await runCommand(resolved, shell, {
              env: buildSpawnEnv(process.env, ctx?.dotenv),
              stdio: 'inherit',
            });
          },
        );
    },
    afterResolve(_cli, ctx) {
      if (process.env.GETDOTENV_DEBUG) {
        const keys = Object.keys(ctx.dotenv);
        if (keys.length > 0) {
          console.error(
            '[demo] afterResolve: dotenv keys loaded:',
            keys.length,
          );
        }
      }
    },
  });
```

These examples run with explicit env injection (`{ ...process.env, ...ctx.dotenv }`)
so exclusions (e.g., `--exclude-private`) are honored predictably.
