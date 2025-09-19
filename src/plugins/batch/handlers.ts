import type { Command } from 'commander';

import type { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import type { Logger } from '../../GetDotenvOptions';
import { execShellCommandBatch } from '../../services/batch/execShellCommandBatch';
import type { Scripts } from '../../services/batch/resolve';
import { resolveCommand, resolveShell } from '../../services/batch/resolve';
import type { BatchPluginOptions } from './types';
import type { BatchConfig } from './types';

/**
+ Build the default "cmd" subcommand action for the batch plugin.
+ Mirrors the original inline implementation with identical behavior.
*/
export const buildDefaultCmdAction =
  (cli: GetDotenvCli, batchCmd: Command, opts: BatchPluginOptions) =>
  async (
    commandParts: string[] | undefined,
    _subOpts: unknown,
    _thisCommand: Command,
  ): Promise<void> => {
    const loggerLocal: Logger = opts.logger ?? console;
    // Guard: when invoked without positional args (e.g., `batch --list`),
    // defer entirely to the parent action handler.
    const argsRaw = Array.isArray(commandParts)
      ? commandParts
      : ([] as string[]);
    const localList = argsRaw.includes('-l') || argsRaw.includes('--list');
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
      typeof raw.globs === 'string' ? raw.globs : (cfg.globs ?? '*');
    const pkgCwd = raw.pkgCwd !== undefined ? !!raw.pkgCwd : !!cfg.pkgCwd;
    const rootPath =
      typeof raw.rootPath === 'string' ? raw.rootPath : (cfg.rootPath ?? './');

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
    const scripts = opts.scripts ?? cfg.scripts ?? mergedBag.scripts;
    const shell = opts.shell ?? cfg.shell ?? mergedBag.shell;

    // If no positional args were given, bridge to --command/--list paths here.
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
          shell: resolveShell(scripts, commandOpt, shell) as unknown as
            | string
            | boolean
            | URL,
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
          shell: (shell ?? false) as unknown as string | boolean | URL,
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
      const mergedGlobs = [globs, extraGlobs].filter(Boolean).join(' ');
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

    // If parent list flag is set and positional tokens are present (and no --command),
    // treat tokens as additional globs for list-only mode.
    if (listFromParent && args.length > 0 && typeof raw.command !== 'string') {
      const extra = args.map(String).join(' ').trim();
      const mergedGlobs = [globs, extra].filter(Boolean).join(' ');
      const mergedBag2 = ((
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
        shell: (shell ?? mergedBag2.shell ?? false) as unknown as
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
    const resolved = resolveCommand(scriptsExec, input);
    const shellSetting = resolveShell(
      scriptsExec,
      input,
      shellExec,
    ) as unknown as string | boolean | URL;
    // Preserve argv array only for shell-off Node -e snippets to avoid
    // lossy re-tokenization (Windows/PowerShell quoting). For simple
    // commands (e.g., "echo OK") keep string form to satisfy unit tests.
    let commandArg: string | string[] = resolved;
    if (shellSetting === false && resolved === input) {
      const first = (args[0] ?? '').toLowerCase();
      const hasEval = args.includes('-e') || args.includes('--eval');
      if (first === 'node' && hasEval) {
        commandArg = args.map(String);
      }
    }

    await execShellCommandBatch({
      command: commandArg,
      ...(envBag ? { getDotenvCliOptions: envBag } : {}),
      globs,
      ignoreErrors,
      list: false,
      logger: loggerLocal,
      ...(pkgCwd ? { pkgCwd } : {}),
      rootPath,
      shell: shellSetting,
    });
  };

/**
+ Build the parent "batch" action handler (no explicit subcommand).
*/
export const buildParentAction =
  (cli: GetDotenvCli, opts: BatchPluginOptions) =>
  async (
    commandParts: string[] | undefined,
    thisCommand: Command,
  ): Promise<void> => {
    const logger = opts.logger ?? console;

    // Ensure context exists (host preSubcommand on root creates if missing).
    const ctx = cli.getCtx();
    const cfgRaw = (ctx?.pluginConfigs?.['batch'] ?? {}) as unknown;
    const cfg = (cfgRaw || {}) as BatchConfig;

    const raw = thisCommand.opts();
    const commandOpt =
      typeof raw.command === 'string' ? raw.command : undefined;
    const ignoreErrors = !!raw.ignoreErrors;
    let globs = typeof raw.globs === 'string' ? raw.globs : (cfg.globs ?? '*');
    const list = !!raw.list;
    const pkgCwd = raw.pkgCwd !== undefined ? !!raw.pkgCwd : !!cfg.pkgCwd;
    const rootPath =
      typeof raw.rootPath === 'string' ? raw.rootPath : (cfg.rootPath ?? './');

    // Treat parent positional tokens as the command when no explicit 'cmd' is used.
    const argsParent = Array.isArray(commandParts) ? commandParts : [];
    if (argsParent.length > 0 && !list) {
      const input = argsParent.map(String).join(' ');
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
      const scriptsAll = opts.scripts ?? cfg.scripts ?? mergedBag.scripts;
      const shellAll = opts.shell ?? cfg.shell ?? mergedBag.shell;
      const resolved = resolveCommand(scriptsAll, input);
      const shellSetting = resolveShell(
        scriptsAll,
        input,
        shellAll,
      ) as unknown as string | boolean | URL;
      // Parent path: pass a string; executor handles shell-specific details.
      const commandArg = resolved;

      await execShellCommandBatch({
        command: commandArg,
        globs,
        ignoreErrors,
        list: false,
        logger,
        ...(pkgCwd ? { pkgCwd } : {}),
        rootPath,
        shell: shellSetting,
      });
      return;
    }
    // List-only: merge extra positional tokens into globs when no --command is present.
    if (list && argsParent.length > 0 && !commandOpt) {
      const extra = argsParent.map(String).join(' ').trim();
      if (extra.length > 0) globs = [globs, extra].filter(Boolean).join(' ');
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
        shell: (opts.shell ?? cfg.shell ?? mergedBag.shell ?? false) as
          | string
          | boolean
          | URL,
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
      const scriptsOpt = opts.scripts ?? cfg.scripts ?? mergedBag.scripts;
      const shellOpt = opts.shell ?? cfg.shell ?? mergedBag.shell;

      await execShellCommandBatch({
        command: resolveCommand(scriptsOpt, commandOpt),
        globs,
        ignoreErrors,
        list,
        logger,
        ...(pkgCwd ? { pkgCwd } : {}),
        rootPath,
        shell: resolveShell(scriptsOpt, commandOpt, shellOpt) as unknown as
          | string
          | boolean
          | URL,
      });
      return;
    }

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
    const shellOnly = (opts.shell ?? cfg.shell ?? mergedBag.shell ?? false) as
      | string
      | boolean
      | undefined;

    await execShellCommandBatch({
      globs,
      ignoreErrors,
      list: true,
      logger,
      ...(pkgCwd ? { pkgCwd } : {}),
      rootPath,
      shell: (shellOnly ?? false) as unknown as string | boolean | URL,
    });
  };
