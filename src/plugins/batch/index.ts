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
        .argument('[command...]')
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
            .action(
              async (
                commandParts: string[] | undefined,
                _subOpts: unknown,
                _thisCommand: Command,
              ) => {
                // Guard: when invoked without positional args (e.g., `batch --list`),
                // defer entirely to the parent action handler.
                const argsRaw = Array.isArray(commandParts)
                  ? commandParts
                  : ([] as string[]);
                // Detect local list flags (-l/--list) provided alongside positional tokens and strip them.
                const localList =
                  argsRaw.includes('-l') || argsRaw.includes('--list');
                const args = localList
                  ? argsRaw.filter((t) => t !== '-l' && t !== '--list')
                  : argsRaw;

                // Access merged per-plugin config from host context (if any).
                const ctx = cli.getCtx();
                const cfgRaw = (ctx?.pluginConfigs?.['batch'] ?? {}) as unknown;
                const cfg = (cfgRaw || {}) as BatchConfig;
                // Resolve batch flags from the captured parent (batch) command.
                const raw = batchCmd.opts();
                const listFromParent = !!raw.list;

                const ignoreErrors = !!raw.ignoreErrors;
                const globs =
                  typeof raw.globs === 'string'
                    ? raw.globs
                    : (cfg.globs ?? '*');
                const pkgCwd =
                  raw.pkgCwd !== undefined ? !!raw.pkgCwd : !!cfg.pkgCwd;
                const rootPath =
                  typeof raw.rootPath === 'string'
                    ? raw.rootPath
                    : (cfg.rootPath ?? './');

                // Resolve scripts/shell with precedence:
                // plugin opts → plugin config → merged root CLI options
                const mergedBag = ((
                  (batchCmd.parent as
                    | (GetDotenvCli & {
                        getDotenvCliOptions?: {
                          scripts?: Scripts;
                          shell?: string | boolean;
                        };
                      })
                    | null) ?? null
                )?.getDotenvCliOptions ?? {}) as {
                  scripts?: Scripts;
                  shell?: string | boolean;
                };
                const scripts =
                  opts.scripts ?? cfg.scripts ?? mergedBag.scripts;
                const shell = opts.shell ?? cfg.shell ?? mergedBag.shell;
                const loggerLocal: Logger = opts.logger ?? console;

                // If no positional args were given, bridge to --command/--list paths here
                // because a default subcommand prevents the parent action from running.
                if (args.length === 0) {
                  const commandOpt =
                    typeof raw.command === 'string' ? raw.command : undefined;
                  if (typeof commandOpt === 'string') {
                    await execShellCommandBatch({
                      command: resolveCommand(scripts, commandOpt),
                      globs,
                      ignoreErrors,
                      list: false,
                      logger: loggerLocal,
                      ...(pkgCwd ? { pkgCwd } : {}),
                      rootPath,
                      shell: resolveShell(
                        scripts,
                        commandOpt,
                        shell,
                      ) as unknown as string | boolean | URL,
                    });
                    return;
                  }
                  if (raw.list || localList) {
                    await execShellCommandBatch({
                      globs,
                      ignoreErrors,
                      list: true,
                      logger: loggerLocal,
                      ...(pkgCwd ? { pkgCwd } : {}),
                      rootPath,
                      shell: (shell ?? false) as unknown as
                        | string
                        | boolean
                        | URL,
                    });
                    return;
                  }
                  {
                    const lr = loggerLocal as unknown as {
                      error?: (...a: unknown[]) => void;
                      log: (...a: unknown[]) => void;
                    };
                    const emit = lr.error ?? lr.log;
                    emit(`No command provided. Use --command or --list.`);
                  }
                  process.exit(0);
                }

                // If a local list flag was supplied with positional tokens (and no --command),
                // treat tokens as additional globs and execute list mode.
                if (localList && typeof raw.command !== 'string') {
                  const extraGlobs = args.map(String).join(' ').trim();
                  const mergedGlobs = [globs, extraGlobs]
                    .filter(Boolean)
                    .join(' ');
                  const shellBag = ((
                    (batchCmd.parent as
                      | (GetDotenvCli & {
                          getDotenvCliOptions?: { shell?: string | boolean };
                        })
                      | undefined) ?? undefined
                  )?.getDotenvCliOptions ?? {}) as { shell?: string | boolean };

                  await execShellCommandBatch({
                    globs: mergedGlobs,
                    ignoreErrors,
                    list: true,
                    logger: loggerLocal,
                    ...(pkgCwd ? { pkgCwd } : {}),
                    rootPath,
                    shell: (shell ?? shellBag.shell ?? false) as unknown as
                      | string
                      | boolean
                      | URL,
                  });
                  return;
                }

                // If parent list flag is set and positional tokens are present,
                // treat tokens as additional globs for list-only mode. This allows
                // usage like: getdotenv batch -r ./test -g full partial -l
                // under the default subcommand without accidentally executing "partial -l".
                if (
                  listFromParent &&
                  args.length > 0 &&
                  typeof raw.command !== 'string'
                ) {
                  const extra = args.map(String).join(' ').trim();
                  const mergedGlobs = [globs, extra].filter(Boolean).join(' ');
                  const mergedBag = ((
                    (batchCmd.parent as
                      | (GetDotenvCli & {
                          getDotenvCliOptions?: { shell?: string | boolean };
                        })
                      | undefined) ?? undefined
                  )?.getDotenvCliOptions ?? {}) as { shell?: string | boolean };
                  await execShellCommandBatch({
                    globs: mergedGlobs,
                    ignoreErrors,
                    list: true,
                    logger: loggerLocal,
                    ...(pkgCwd ? { pkgCwd } : {}),
                    rootPath,
                    shell: (shell ?? mergedBag.shell ?? false) as unknown as
                      | string
                      | boolean
                      | URL,
                  });
                  return;
                }

                // Join positional args as the command to execute.
                const input = args.map(String).join(' ');
                // Optional: round-trip parent merged options if present (shipped CLI).
                const envBag = (
                  (batchCmd.parent as
                    | (GetDotenvCli & {
                        getDotenvCliOptions?: Record<string, unknown>;
                      })
                    | undefined) ?? undefined
                )?.getDotenvCliOptions;

                const mergedExec = ((
                  (batchCmd.parent as
                    | (GetDotenvCli & {
                        getDotenvCliOptions?: {
                          scripts?: Scripts;
                          shell?: string | boolean;
                        };
                      })
                    | undefined) ?? undefined
                )?.getDotenvCliOptions ?? {}) as {
                  scripts?: Scripts;
                  shell?: string | boolean;
                };
                const scriptsExec = scripts ?? mergedExec.scripts;
                const shellExec = shell ?? mergedExec.shell;

                await execShellCommandBatch({
                  command: resolveCommand(scriptsExec, input),
                  ...(envBag ? { getDotenvCliOptions: envBag } : {}),
                  globs,
                  ignoreErrors,
                  list: false,
                  logger: loggerLocal,
                  ...(pkgCwd ? { pkgCwd } : {}),
                  rootPath,
                  shell: resolveShell(
                    scriptsExec,
                    input,
                    shellExec,
                  ) as unknown as string | boolean | URL,
                });
              },
            ),
          { isDefault: true },
        )
        .action(
          async (commandParts: string[] | undefined, thisCommand: Command) => {
            // Ensure context exists (host preSubcommand on root creates if missing).
            const ctx = cli.getCtx();
            // Read merged per-plugin config (host-populated when guarded loader is enabled).
            const cfgRaw = (ctx?.pluginConfigs?.['batch'] ?? {}) as unknown;
            const cfg = (cfgRaw || {}) as BatchConfig;

            const raw = thisCommand.opts();
            const commandOpt =
              typeof raw.command === 'string' ? raw.command : undefined;
            const ignoreErrors = !!raw.ignoreErrors;
            let globs =
              typeof raw.globs === 'string' ? raw.globs : (cfg.globs ?? '*');
            const list = !!raw.list;
            const pkgCwd =
              raw.pkgCwd !== undefined ? !!raw.pkgCwd : !!cfg.pkgCwd;
            const rootPath =
              typeof raw.rootPath === 'string'
                ? raw.rootPath
                : (cfg.rootPath ?? './');
            // If invoked without explicit 'cmd' subcommand, treat declared positional
            // tokens as the command to execute (implicit default-subcommand behavior).
            const argsParent = Array.isArray(commandParts) ? commandParts : [];
            if (argsParent.length > 0 && !list) {
              const input = argsParent.map(String).join(' ');

              // Prefer plugin opts → config → merged root CLI options for scripts/shell.
              const mergedBag = ((
                (thisCommand.parent as
                  | (GetDotenvCli & {
                      getDotenvCliOptions?: {
                        scripts?: Scripts;
                        shell?: string | boolean;
                      };
                    })
                  | null) ?? null
              )?.getDotenvCliOptions ?? {}) as {
                scripts?: Scripts;
                shell?: string | boolean;
              };
              const scriptsAll =
                opts.scripts ?? cfg.scripts ?? mergedBag.scripts;
              const shellAll = opts.shell ?? cfg.shell ?? mergedBag.shell;

              await execShellCommandBatch({
                command: resolveCommand(scriptsAll, input),
                globs,
                ignoreErrors,
                list: false,
                logger,
                ...(pkgCwd ? { pkgCwd } : {}),
                rootPath,
                shell: resolveShell(scriptsAll, input, shellAll) as unknown as
                  | string
                  | boolean
                  | URL,
              });
              return;
            }

            // List-only flow: merge any extra positional tokens into globs
            // so users can write: -g full partial -l
            if (list && argsParent.length > 0 && !commandOpt) {
              const extra = argsParent.map(String).join(' ').trim();
              if (extra.length > 0)
                globs = [globs, extra].filter(Boolean).join(' ');
              const mergedBag = ((
                (thisCommand.parent as
                  | (GetDotenvCli & {
                      getDotenvCliOptions?: { shell?: string | boolean };
                    })
                  | null) ?? null
              )?.getDotenvCliOptions ?? {}) as { shell?: string | boolean };
              await execShellCommandBatch({
                globs,
                ignoreErrors,
                list: true,
                logger,
                ...(pkgCwd ? { pkgCwd } : {}),
                rootPath,
                shell: (opts.shell ??
                  cfg.shell ??
                  mergedBag.shell ??
                  false) as unknown as string | boolean | URL,
              });
              return;
            }

            if (!commandOpt && !list) {
              logger.error(`No command provided. Use --command or --list.`);
              process.exit(0);
            }
            if (typeof commandOpt === 'string') {
              const mergedBag = ((
                (thisCommand.parent as
                  | (GetDotenvCli & {
                      getDotenvCliOptions?: {
                        scripts?: Scripts;
                        shell?: string | boolean;
                      };
                    })
                  | null) ?? null
              )?.getDotenvCliOptions ?? {}) as {
                scripts?: Scripts;
                shell?: string | boolean;
              };
              const scriptsOpt =
                opts.scripts ?? cfg.scripts ?? mergedBag.scripts;
              const shellOpt = opts.shell ?? cfg.shell ?? mergedBag.shell;

              await execShellCommandBatch({
                command: resolveCommand(scriptsOpt, commandOpt),
                globs,
                ignoreErrors,
                list,
                logger,
                ...(pkgCwd ? { pkgCwd } : {}),
                rootPath,
                shell: resolveShell(
                  scriptsOpt,
                  commandOpt,
                  shellOpt,
                ) as unknown as string | boolean | URL,
              });
            } else {
              // list only (explicit --list without --command)
              const mergedBag = ((
                (thisCommand.parent as
                  | (GetDotenvCli & {
                      getDotenvCliOptions?: {
                        scripts?: Scripts;
                        shell?: string | boolean;
                      };
                    })
                  | null) ?? null
              )?.getDotenvCliOptions ?? {}) as {
                scripts?: Scripts;
                shell?: string | boolean;
              };
              const shellOnly = (opts.shell ??
                cfg.shell ??
                mergedBag.shell ??
                false) as string | boolean | undefined;

              await execShellCommandBatch({
                globs,
                ignoreErrors,
                list: true,
                logger,
                ...(pkgCwd ? { pkgCwd } : {}),
                rootPath,
                shell: (shellOnly ?? false) as unknown as
                  | string
                  | boolean
                  | URL,
              });
            }
          },
        );
    },
  });
