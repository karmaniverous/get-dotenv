import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

import type {
  definePlugin,
  GetDotenvCliPublic,
} from '@/src/cliHost/definePlugin';
import { readMergedOptions } from '@/src/cliHost/readMergedOptions';
import type { Logger } from '@/src/GetDotenvOptions';
import type { BatchPluginOptions } from '@/src/plugins/batch/types';
import type { BatchConfig } from '@/src/plugins/batch/types';
import { execShellCommandBatch } from '@/src/services/batch/execShellCommandBatch';
import { resolveCommand, resolveShell } from '@/src/services/batch/resolve';

export const attachParentAction = (
  plugin: ReturnType<typeof definePlugin>,
  cli: GetDotenvCliPublic,
  pluginOpts: BatchPluginOptions,
  parent: Command,
) => {
  parent.action(
    async (
      commandParts,
      opts: {
        command?: string;
        globs?: string;
        list?: boolean;
        ignoreErrors?: boolean;
        pkgCwd?: boolean;
        rootPath?: string;
      },
      thisCommand: CommandUnknownOpts,
    ) => {
      // Inherit logger from merged root options
      const mergedForLogger = readMergedOptions(thisCommand);
      const loggerLocal: Logger = mergedForLogger.logger;

      // Ensure context exists (host preSubcommand on root creates if missing).
      const dotenvEnv = cli.getCtx().dotenv;
      const cfg = plugin.readConfig<BatchConfig>(cli);

      const commandOpt =
        typeof opts.command === 'string' ? opts.command : undefined;
      const ignoreErrors = Boolean(opts.ignoreErrors);
      let globs =
        typeof opts.globs === 'string' ? opts.globs : (cfg.globs ?? '*');
      const list = Boolean(opts.list);
      const pkgCwd =
        opts.pkgCwd !== undefined ? opts.pkgCwd : Boolean(cfg.pkgCwd);
      const rootPath =
        typeof opts.rootPath === 'string'
          ? opts.rootPath
          : (cfg.rootPath ?? './');

      // Treat parent positional tokens as the command when no explicit 'cmd' is used.
      const argsParent = Array.isArray(commandParts)
        ? (commandParts as string[])
        : [];
      if (argsParent.length > 0 && !list) {
        const input = argsParent.map(String).join(' ');
        const bag = readMergedOptions(thisCommand);
        const scriptsAll =
          pluginOpts.scripts ?? cfg.scripts ?? bag.scripts ?? undefined;
        const shellAll = pluginOpts.shell ?? cfg.shell ?? bag.shell;

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
      // List-only (parent flag): merge extra positional tokens into globs when no --command is present.
      if (list && !commandOpt) {
        const extra = argsParent.map(String).join(' ').trim();
        if (extra.length > 0) globs = [globs, extra].filter(Boolean).join(' ');

        const bag = readMergedOptions(thisCommand);
        const shellMerged = pluginOpts.shell ?? cfg.shell ?? bag.shell ?? false;

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
          pluginOpts.scripts ?? cfg.scripts ?? bag.scripts ?? undefined;
        const shellOpt = pluginOpts.shell ?? cfg.shell ?? bag.shell;

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
      const shellOnly = pluginOpts.shell ?? cfg.shell ?? bag.shell ?? false;

      await execShellCommandBatch({
        globs,
        ignoreErrors,
        list: true,
        logger: loggerLocal,
        ...(pkgCwd ? { pkgCwd } : {}),
        rootPath,
        shell: shellOnly,
      });
    },
  );
};
