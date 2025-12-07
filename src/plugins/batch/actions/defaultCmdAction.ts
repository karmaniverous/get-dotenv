import type { Command } from '@commander-js/extra-typings';

import type {
  definePlugin,
  GetDotenvCliPublic,
} from '@/src/cliHost/definePlugin';
import { readMergedOptions } from '@/src/cliHost/readMergedOptions';
import type { Logger } from '@/src/GetDotenvOptions';
import type { BatchPluginOptions } from '@/src/plugins/batch/types';
import type { BatchConfig } from '@/src/plugins/batch/types';
import { execShellCommandBatch } from '@/src/services/batch/execShellCommandBatch';
import type { Scripts } from '@/src/services/batch/resolve';
import { resolveCommand, resolveShell } from '@/src/services/batch/resolve';

/**
 * Build the default "cmd" subcommand action for the batch plugin.
 * Mirrors the original inline implementation with identical behavior.
 */
export const buildDefaultCmdAction =
  (
    plugin: ReturnType<typeof definePlugin>,
    cli: GetDotenvCliPublic,
    batchCmd: Command,
    opts: BatchPluginOptions,
  ) =>
  async (
    commandParts: string[] | undefined,
    _subOpts: unknown,
    thisCommand: Command,
  ): Promise<void> => {
    // Inherit logger from the merged root options bag
    const mergedForLogger = readMergedOptions(batchCmd) as {
      logger: Logger;
    };
    const loggerLocal: Logger = mergedForLogger.logger;
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
    const cfg = plugin.readConfig<BatchConfig>(cli);
    const dotenvEnv = cli.getCtx().dotenv;

    // Resolve batch flags from the parent (batch) command.
    type BatchFlags = {
      list?: boolean;
      ignoreErrors?: boolean;
      globs?: string;
      pkgCwd?: boolean;
      rootPath?: string;
      command?: string;
    };
    const g = (
      (thisCommand as Command & { optsWithGlobals?: () => unknown })
        .optsWithGlobals
        ? (
            thisCommand as Command & { optsWithGlobals: () => unknown }
          ).optsWithGlobals()
        : batchCmd.opts()
    ) as BatchFlags;

    const listFromParent = !!g.list;
    const ignoreErrors = !!g.ignoreErrors;
    const globs = typeof g.globs === 'string' ? g.globs : (cfg.globs ?? '*');
    const pkgCwd = g.pkgCwd !== undefined ? !!g.pkgCwd : !!cfg.pkgCwd;
    const rootPath =
      typeof g.rootPath === 'string' ? g.rootPath : (cfg.rootPath ?? './');

    // Resolve scripts/shell with precedence:
    // plugin opts → plugin config → merged root CLI options
    const mergedBag = readMergedOptions(batchCmd) as {
      scripts?: Scripts;
      shell?: string | boolean;
      logger: Logger;
    };
    const scripts = opts.scripts ?? cfg.scripts ?? mergedBag.scripts;
    const shell = opts.shell ?? cfg.shell ?? mergedBag.shell;

    // If no positional args were given, bridge to --command/--list paths here.
    if (args.length === 0) {
      const commandOpt = typeof g.command === 'string' ? g.command : undefined;
      if (typeof commandOpt === 'string') {
        await execShellCommandBatch({
          command: resolveCommand(scripts, commandOpt),
          dotenvEnv,
          globs,
          ignoreErrors,
          list: false,
          logger: loggerLocal,
          ...(pkgCwd ? { pkgCwd } : {}),
          rootPath,
          shell: resolveShell(scripts, commandOpt, shell),
        });
        return;
      }
      if (g.list || localList) {
        const bag = readMergedOptions(batchCmd);
        await execShellCommandBatch({
          globs,
          ignoreErrors,
          list: true,
          logger: loggerLocal,
          ...(pkgCwd ? { pkgCwd } : {}),
          rootPath,
          shell: shell ?? bag.shell ?? false,
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
    if (localList && typeof g.command !== 'string') {
      const extraGlobs = args.map(String).join(' ').trim();
      const mergedGlobs = [globs, extraGlobs].filter(Boolean).join(' ');
      const bag = readMergedOptions(batchCmd);
      await execShellCommandBatch({
        globs: mergedGlobs,
        ignoreErrors,
        list: true,
        logger: loggerLocal,
        ...(pkgCwd ? { pkgCwd } : {}),
        rootPath,
        shell: shell ?? bag.shell ?? false,
      });
      return;
    }

    // If parent list flag is set and positional tokens are present (and no --command),
    // treat tokens as additional globs for list-only mode.
    if (listFromParent && args.length > 0 && typeof g.command !== 'string') {
      const extra = args.map(String).join(' ').trim();
      const mergedGlobs = [globs, extra].filter(Boolean).join(' ');
      const bag = readMergedOptions(batchCmd);
      await execShellCommandBatch({
        globs: mergedGlobs,
        ignoreErrors,
        list: true,
        logger: loggerLocal,
        ...(pkgCwd ? { pkgCwd } : {}),
        rootPath,
        shell: shell ?? bag.shell ?? false,
      });
      return;
    }

    // Join positional args as the command to execute.
    const input = args.map(String).join(' ');
    // Optional: round-trip parent merged options if present (shipped CLI).
    const envBag = (
      (batchCmd.parent as
        | (GetDotenvCliPublic & {
            getDotenvCliOptions?: Record<string, unknown>;
          })
        | undefined) ?? undefined
    )?.getDotenvCliOptions;

    const bag = readMergedOptions(batchCmd);
    const scriptsExec = scripts ?? bag.scripts;
    const shellExec = shell ?? bag.shell;
    const resolved = resolveCommand(scriptsExec, input);
    const shellSetting = resolveShell(scriptsExec, input, shellExec);
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
      dotenvEnv,
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
