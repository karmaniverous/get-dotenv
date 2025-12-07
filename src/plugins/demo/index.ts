/**
 * Demo plugin (educational).
 *
 * Purpose
 * - Showcase how to build a plugin for the GetDotenv CLI host.
 * - Demonstrate:
 *   - Accessing the resolved dotenv context (ctx).
 *   - Executing child processes with explicit env injection.
 *   - Resolving commands via scripts and honoring per-script shell overrides.
 *   - Thin adapters: business logic stays minimal; use shared helpers.
 *
 * Key host APIs used:
 * - definePlugin: declare a plugin with setup and optional afterResolve.
 * - cli.ns(name): create a namespaced subcommand under the root CLI.
 * - cli.getCtx(): access \{ optionsResolved, dotenv, plugins?, pluginConfigs? \}.
 *
 * Design notes
 * - We use the shared runCommand() helper so behavior matches the built-in
 *   cmd/batch plugins (env sanitization, plain vs shell execution, stdio).
 * - We inject ctx.dotenv into child env explicitly to avoid bleeding prior
 *   secrets from process.env when exclusions are set (e.g., --exclude-private).
 * - We resolve scripts and shell using shared helpers to honor overrides:
 *   resolveCommand(scripts, input) and resolveShell(scripts, input, shell).
 *
 * Usage (examples)
 *   getdotenv demo ctx
 *   getdotenv demo run --print APP_SETTING
 *   getdotenv demo script echo OK
 *   getdotenv --trace demo run --print ENV_SETTING
 */

import { definePlugin } from '@/src/cliHost/definePlugin';
import { runCommand } from '@/src/cliHost/exec';
import { readMergedOptions } from '@/src/cliHost/readMergedOptions';
import { buildSpawnEnv } from '@/src/cliHost/spawnEnv';
import type { Logger } from '@/src/GetDotenvOptions';
import { resolveCommand, resolveShell } from '@/src/services/batch/resolve';

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

      /**
       * demo ctx
       * Print a summary of the current dotenv context.
       *
       * Notes:
       * - The host resolves context once per invocation in a preSubcommand hook
       *   (added by enhanceGetDotenvCli.passOptions() in the shipped CLI).
       * - ctx.dotenv contains the final merged values after overlays/dynamics.
       */
      ns.command('ctx')
        .description('Print a summary of the current dotenv context')
        .action(() => {
          const dotenv = cli.getCtx().dotenv;
          const keys = Object.keys(dotenv).sort();
          const sample = keys.slice(0, 5);
          logger.log('[demo] Context summary:');
          logger.log(`- keys: ${keys.length.toString()}`);
          logger.log(`- sample keys: ${sample.join(', ') || '(none)'}`);
          logger.log('- tip: use "--trace [keys...]" for per-key diagnostics');
        });

      /**
       * demo run [--print KEY]
       * Execute a small child process that prints a dotenv value.
       *
       * Design:
       * - Use shell-off + argv array to avoid cross-platform quoting pitfalls.
       * - Inject ctx.dotenv explicitly into the child env.
       * - Inherit stdio so output streams live (works well outside CI).
       *
       * Tip:
       * - For deterministic capture in CI, run with "--capture" (or set
       *   GETDOTENV_STDIO=pipe). The shipped CLI honors both.
       */
      ns.command('run')
        .description(
          'Run a small child process under the current dotenv (shell-off)',
        )
        .option('--print <key>', 'dotenv key to print', 'APP_SETTING')
        .action(async (opts) => {
          const key =
            typeof opts.print === 'string' && opts.print.length > 0
              ? opts.print
              : 'APP_SETTING';

          // Build a minimal node -e payload via argv array (avoid quoting issues).
          const code = `console.log(process.env.${key} ?? "")`;

          // Inherit stdio for an interactive demo. Use --capture for CI.
          await runCommand(['node', '-e', code], false, {
            env: buildSpawnEnv(process.env, cli.getCtx().dotenv),
            stdio: 'inherit',
          });
        });

      /**
       * demo script [command...]
       * Resolve and execute a command using the current scripts table and
       * shell preference (with per-script overrides).
       *
       * How it works:
       * - We read the merged CLI options persisted by the shipped CLI’s
       *   passOptions() hook on the current command instance’s parent.
       * - resolveCommand resolves a script name → cmd or passes through a raw
       *   command string.
       * - resolveShell chooses the appropriate shell:
       *    scripts[name].shell ?? global shell (string|boolean).
       */
      ns.command('script')
        .description(
          'Resolve a command via scripts and execute it with the proper shell',
        )
        .argument('[command...]')
        .action(async (commandParts, _opts, thisCommand: Command) => {
          const bag = readMergedOptions(thisCommand);

          const input = Array.isArray(commandParts)
            ? commandParts.map(String).join(' ')
            : '';
          if (!input) {
            logger.log(
              '[demo] Please provide a command or script name, e.g. "echo OK" or "git-status".',
            );
            return;
          }

          const resolved = resolveCommand(bag.scripts, input);
          const shell = resolveShell(bag.scripts, input, bag.shell);

          // Compose child env (parent + ctx.dotenv). This mirrors cmd/batch behavior.
          const ctx = cli.getCtx();
          await runCommand(resolved, shell, {
            env: buildSpawnEnv(process.env, ctx.dotenv),
            stdio: 'inherit',
          });
        });
    },
    /**
     * Optional: afterResolve can initialize per-plugin state using ctx.dotenv.
     * For the demo we emit a single breadcrumb only when GETDOTENV_DEBUG is set,
     * keeping default runs (tests/CI/smoke) quiet.
     */
    afterResolve(_cli, ctx) {
      if (process.env.GETDOTENV_DEBUG) {
        const keys = Object.keys(ctx.dotenv);
        if (keys.length > 0) {
          // Keep noise low; a single-line breadcrumb is sufficient for the demo.
          console.error(
            '[demo] afterResolve: dotenv keys loaded:',
            keys.length,
          );
        }
      }
    },
  });
