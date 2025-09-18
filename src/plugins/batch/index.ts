import type { Command } from 'commander';
import { Command as Commander } from 'commander';
import { z } from 'zod';

import { definePlugin } from '../../cliHost/definePlugin';
import type { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import type { Logger } from '../../GetDotenvOptions';
import { execShellCommandBatch } from '../../services/batch/execShellCommandBatch';
import type { Scripts } from '../../services/batch/resolve';
import { resolveCommand, resolveShell } from '../../services/batch/resolve';

export type BatchPluginOptions = {
  scripts?: Scripts;
  shell?: string | boolean;
  logger?: Logger;
};

// Per-plugin config schema (optional fields; used as defaults).
const ScriptSchema = z.union([
  z.string(),
  z.object({
    cmd: z.string(),
    shell: z.union([z.string(), z.boolean()]).optional(),
  }),
]);
const BatchConfigSchema = z.object({
  scripts: z.record(ScriptSchema).optional(),
  shell: z.union([z.string(), z.boolean()]).optional(),
  rootPath: z.string().optional(),
  globs: z.string().optional(),
  pkgCwd: z.boolean().optional(),
});
type BatchConfig = z.infer<typeof BatchConfigSchema>;

/**
 * Batch plugin for the GetDotenv CLI host.
 *
 * Mirrors the legacy batch subcommand behavior without altering the shipped CLI.
 * Options:
 * - scripts/shell: used to resolve command and shell behavior per script or global default.
 * - logger: defaults to console.
 */
export const batchPlugin = (opts: BatchPluginOptions = {}) =>
  definePlugin({
    id: 'batch',
    // Host validates this when config-loader is enabled; plugins may also
    // re-validate at action time as a safety belt.
    configSchema: BatchConfigSchema,
    setup(cli: GetDotenvCli) {
      const logger = opts.logger ?? console;
      const ns = cli.ns('batch');
      const batchCmd = ns; // capture the parent "batch" command for default-subcommand context

      ns.description(
        'Batch command execution across multiple working directories.',
      )
        .enablePositionalOptions()
        .passThroughOptions()
        .option(
          '-p, --pkg-cwd',
          'use nearest package directory as current working directory',
        )
        .option(
          '-r, --root-path <string>',
          'path to batch root directory from current working directory',
          './',
        )
        .option(
          '-g, --globs <string>',
          'space-delimited globs from root path',
          '*',
        )
        .option(
          '-c, --command <string>',
          'command executed according to the base shell resolution',
        )
        .option(
          '-l, --list',
          'list working directories without executing command',
        )
        .option(
          '-e, --ignore-errors',
          'ignore errors and continue with next path',
        )
        // Default subcommand: accept positional args as the command to run.
        // Mirrors legacy behavior so `batch <args...>` works without --command.
        .addCommand(
          new Commander()
            .name('cmd')
            .description(
              'execute command, conflicts with --command option (default subcommand)',
            )
            .enablePositionalOptions()
            .passThroughOptions()
            .argument('[command...]')
            .action(async (_subOpts: unknown, thisCommand: Command) => {
              // Guard: when invoked without positional args (e.g., `batch --list`),
              // defer entirely to the parent action handler.
              const args = thisCommand.args as unknown[];
              if (args.length === 0) return;

              // Access merged per-plugin config from host context (if any).
              const ctx = cli.getCtx();
              const cfgRaw = (ctx?.pluginConfigs?.['batch'] ?? {}) as unknown;
              const cfg = (cfgRaw || {}) as BatchConfig;

              // Resolve batch flags from the captured parent (batch) command.
              const raw = batchCmd.opts();

              const ignoreErrors = !!raw.ignoreErrors;
              const globs =
                typeof raw.globs === 'string' ? raw.globs : (cfg.globs ?? '*');
              const pkgCwd =
                raw.pkgCwd !== undefined ? !!raw.pkgCwd : !!cfg.pkgCwd;
              const rootPath =
                typeof raw.rootPath === 'string'
                  ? raw.rootPath
                  : (cfg.rootPath ?? './');

              // Resolve scripts/shell and logger from opts→config precedence.
              const scripts = (opts.scripts ?? cfg.scripts) as
                | Scripts
                | undefined;
              const shell = opts.shell ?? cfg.shell;
              const loggerLocal: Logger = opts.logger ?? console;

              // Join positional args as the command to execute.
              const input = args.map(String).join(' ');

              // Optional: round-trip parent merged options if present (shipped CLI).
              const envBag = (
                batchCmd.parent as
                  | (GetDotenvCli & {
                      getDotenvCliOptions?: Record<string, unknown>;
                    })
                  | undefined
              )?.getDotenvCliOptions;

              await execShellCommandBatch({
                command: resolveCommand(scripts, input),
                ...(envBag ? { getDotenvCliOptions: envBag } : {}),
                globs,
                ignoreErrors,
                list: false,
                logger: loggerLocal,
                ...(pkgCwd ? { pkgCwd } : {}),
                rootPath,
                shell: resolveShell(scripts, input, shell) as unknown as
                  | string
                  | boolean
                  | URL,
              });
            }),
          { isDefault: true },
        )
        .action(async (_options: unknown, thisCommand: Command) => {
          // Ensure context exists (host preSubcommand on root creates if missing).
          const ctx = cli.getCtx(); // Read merged per-plugin config (host-populated when guarded loader is enabled).          const cfgRaw = (ctx?.pluginConfigs?.['batch'] ?? {}) as unknown;
          // Best-effort typing; host already validated when loader path is on.
          const cfg = (cfgRaw || {}) as BatchConfig;

          const raw = thisCommand.opts();
          const commandOpt =
            typeof raw.command === 'string' ? raw.command : undefined;
          const ignoreErrors = !!raw.ignoreErrors;
          const globs =
            typeof raw.globs === 'string' ? raw.globs : (cfg.globs ?? '*');
          const list = !!raw.list;
          const pkgCwd = raw.pkgCwd !== undefined ? !!raw.pkgCwd : !!cfg.pkgCwd;
          const rootPath =
            typeof raw.rootPath === 'string'
              ? raw.rootPath
              : (cfg.rootPath ?? './');

          if (!commandOpt && !list) {
            logger.error(`No command provided. Use --command or --list.`);
            process.exit(0);
          }

          if (typeof commandOpt === 'string') {
            await execShellCommandBatch({
              command: resolveCommand(opts.scripts ?? cfg.scripts, commandOpt),
              globs,
              ignoreErrors,
              list,
              logger,
              ...(pkgCwd ? { pkgCwd } : {}),
              rootPath,
              shell: resolveShell(
                opts.scripts ?? cfg.scripts,
                commandOpt,
                opts.shell ?? cfg.shell,
              ) as unknown as string | boolean | URL,
            });
          } else {
            // list only (explicit --list without --command)
            await execShellCommandBatch({
              globs,
              ignoreErrors,
              list: true,
              logger,
              ...(pkgCwd ? { pkgCwd } : {}),
              rootPath,
              shell: (opts.shell ?? cfg.shell ?? false) as unknown as
                | string
                | boolean
                | URL,
            });
          }
        });
    },
  });
