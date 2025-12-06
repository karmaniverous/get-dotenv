import type { Command } from 'commander';

import type {
  definePlugin,
  GetDotenvCliPublic,
} from '../../../cliHost/definePlugin';
import { readMergedOptions } from '../../../cliHost/GetDotenvCli';
import type { Logger } from '../../../GetDotenvOptions';
import { execShellCommandBatch } from '../../../services/batch/execShellCommandBatch';
import type { Scripts } from '../../../services/batch/resolve';
import { resolveCommand, resolveShell } from '../../../services/batch/resolve';
import type { BatchPluginOptions } from '../types';
import type { BatchConfig } from '../types';

/**
 * Build the parent "batch" action handler (no explicit subcommand).
 */
export const buildParentAction =
  (
    plugin: ReturnType<typeof definePlugin>,
    cli: GetDotenvCliPublic,
    opts: BatchPluginOptions,
  ) =>
  async (
    commandParts: string[] | undefined,
    thisCommand: Command,
  ): Promise<void> => {
    const loggerLocal: Logger = opts.logger ?? console;

    // Ensure context exists (host preSubcommand on root creates if missing).
    const dotenvEnv = (cli.getCtx()?.dotenv ?? {}) as Record<
      string,
      string | undefined
    >;
    const cfg = plugin.readConfig<BatchConfig>(cli);

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
      const bag = readMergedOptions(thisCommand);
      const scriptsAll =
        opts.scripts ??
        cfg.scripts ??
        (bag.scripts as Scripts | undefined) ??
        undefined;
      const shellAll = opts.shell ?? cfg.shell ?? bag.shell;

      const resolved = resolveCommand(scriptsAll, input);
      const shellSetting = resolveShell(scriptsAll, input, shellAll);
      // Parent path: pass a string; executor handles shell-specific details.
      const commandArg = resolved;

      await execShellCommandBatch({
        command: commandArg,
        dotenvEnv,
        globs,
        ignoreErrors,
        list: false,
        logger: loggerLocal,
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

      const bag = readMergedOptions(thisCommand);
      const shellMerged = opts.shell ?? cfg.shell ?? bag.shell ?? false;

      await execShellCommandBatch({
        globs,
        ignoreErrors,
        list: true,
        logger: loggerLocal,
        ...(pkgCwd ? { pkgCwd } : {}),
        rootPath,
        shell: shellMerged,
      });
      return;
    }

    if (!commandOpt && !list) {
      loggerLocal.error(`No command provided. Use --command or --list.`);
      process.exit(0);
    }
    if (typeof commandOpt === 'string') {
      const bag = readMergedOptions(thisCommand);
      const scriptsOpt =
        opts.scripts ??
        cfg.scripts ??
        (bag.scripts as Scripts | undefined) ??
        undefined;
      const shellOpt = opts.shell ?? cfg.shell ?? bag.shell;

      await execShellCommandBatch({
        command: resolveCommand(scriptsOpt, commandOpt),
        dotenvEnv,
        globs,
        ignoreErrors,
        list,
        logger: loggerLocal,
        ...(pkgCwd ? { pkgCwd } : {}),
        rootPath,
        shell: resolveShell(scriptsOpt, commandOpt, shellOpt),
      });
      return;
    }

    // list only (explicit --list without --command)
    const bag = readMergedOptions(thisCommand);
    const shellOnly = opts.shell ?? cfg.shell ?? bag.shell ?? false;

    await execShellCommandBatch({
      globs,
      ignoreErrors,
      list: true,
      logger: loggerLocal,
      ...(pkgCwd ? { pkgCwd } : {}),
      rootPath,
      shell: shellOnly,
    });
  };
