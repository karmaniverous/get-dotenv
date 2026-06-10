import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

import {
  type GetDotenvCliPublic,
  maybePreserveNodeEvalArgv,
  readMergedOptions,
  resolveCommand,
  resolveShell,
} from '@/src/cliHost';

import type { BatchPlugin } from '.';
import { execShellCommandBatch } from './execShellCommandBatch';
import type { BatchPluginConfig, BatchPluginOptions } from './types';
import type { BatchCmdSubcommandOptions } from './types';

/**
 * Attach the default "cmd" subcommand action with contextual typing.
 */
export const attachBatchCmdAction = (
  plugin: BatchPlugin,
  cli: GetDotenvCliPublic,
  batchCmd: CommandUnknownOpts,
  pluginOpts: BatchPluginOptions,
  cmd: Command<[string[]]>,
) => {
  cmd.action(
    async (
      commandParts: string[],
      _subOpts: BatchCmdSubcommandOptions,
      thisCommand: CommandUnknownOpts,
    ) => {
      const mergedBag = readMergedOptions(batchCmd);
      const logger = mergedBag.logger;

      // Guard: when invoked without positional args (e.g., `batch --list`), defer to parent.
      const args = commandParts.map(String);

      // Access merged per-plugin config from host context (if any).
      const cfg = plugin.readConfig<BatchPluginConfig>(cli);
      const dotenvEnv = cli.getCtx().dotenv;

      // Resolve batch flags from the parent (batch) command.
      const gSrc: unknown = (() => {
        // Safely retrieve merged parent flags (prefer optsWithGlobals when present)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - accessed reflectively; contextual typing supplied by Commander
        const maybe = (
          thisCommand as unknown as { optsWithGlobals?: () => unknown }
        ).optsWithGlobals;
        return typeof maybe === 'function' ? maybe.call(thisCommand) : {};
      })();
      const g = gSrc as {
        list?: boolean;
        ignoreErrors?: boolean;
        globs?: string;
        parallel?: boolean;
        concurrency?: number;
        pkgCwd?: boolean;
        rootPath?: string;
        command?: string;
      };

      const ignoreErrors = Boolean(g.ignoreErrors);
      const globs =
        typeof g.globs === 'string'
          ? g.globs
          : typeof cfg.globs === 'string'
            ? cfg.globs
            : '*';
      const pkgCwd = g.pkgCwd !== undefined ? g.pkgCwd : Boolean(cfg.pkgCwd);
      const rootPath =
        typeof g.rootPath === 'string'
          ? g.rootPath
          : typeof cfg.rootPath === 'string'
            ? cfg.rootPath
            : './';
      const parallel =
        g.parallel !== undefined ? g.parallel : Boolean(cfg.parallel);
      const concurrency =
        typeof g.concurrency === 'number' ? g.concurrency : cfg.concurrency;

      // Resolve scripts/shell with precedence:
      // plugin opts → plugin config → merged root CLI options
      const scripts =
        pluginOpts.scripts ?? cfg.scripts ?? mergedBag.scripts ?? undefined;
      const shell = pluginOpts.shell ?? cfg.shell ?? mergedBag.shell;

      // If no positional args were given, bridge to --command/--list paths here.
      if (args.length === 0) {
        const commandOpt =
          typeof g.command === 'string' ? g.command : undefined;
        if (typeof commandOpt === 'string') {
          await execShellCommandBatch({
            command: resolveCommand(scripts, commandOpt),
            ...(concurrency !== undefined ? { concurrency } : {}),
            dotenvEnv,
            globs,
            ignoreErrors,
            list: false,
            logger,
            parallel,
            ...(pkgCwd ? { pkgCwd } : {}),
            rootPath,
            shell: resolveShell(scripts, commandOpt, shell),
          });
          return;
        }
        if (g.list) {
          // Resolve shell fallback to a concrete value (never undefined)
          const rootShell = mergedBag.shell;
          const listShell: string | boolean =
            shell !== undefined
              ? shell
              : rootShell !== undefined
                ? rootShell
                : false;
          await execShellCommandBatch({
            ...(concurrency !== undefined ? { concurrency } : {}),
            globs,
            ignoreErrors,
            list: true,
            logger,
            parallel,
            ...(pkgCwd ? { pkgCwd } : {}),
            rootPath,
            shell: listShell,
          });
          return;
        }
        {
          logger.error('No command provided. Use --command or --list.');
        }
        process.exit(0);
      }

      // Note: Local "-l/--list" tokens are no longer interpreted here.
      // List-only mode must be requested via the parent flag ("batch -l ...").

      // Join positional args as the command to execute.
      const input = args.map(String).join(' ');

      // Optional: round-trip parent merged options if present (shipped CLI).
      const envBag = (
        batchCmd.parent as
          | (GetDotenvCliPublic & {
              getDotenvCliOptions?: Record<string, unknown>;
            })
          | undefined
      )?.getDotenvCliOptions;

      const scriptsExec = scripts ?? mergedBag.scripts ?? undefined;
      const shellExec = shell ?? mergedBag.shell;
      const resolved = resolveCommand(scriptsExec, input);
      const shellSetting = resolveShell(scriptsExec, input, shellExec);

      // Preserve argv array to avoid lossy re-tokenization (Windows/
      // PowerShell quoting). When the command was not resolved to a script
      // (i.e. resolved === input), keep the original argv tokens so that
      // _execNormalized can pass them individually to execa — both in
      // shell-off mode (where stripOuterQuotes handles argv) and in shell
      // mode (where execa applies per-platform shell escaping per arg).
      let commandArg: string | string[] = resolved;
      if (resolved === input) {
        if (shellSetting === false) {
          const preserved = maybePreserveNodeEvalArgv(args);
          if (preserved !== args) commandArg = preserved;
        } else {
          // Shell mode: always pass argv array so execa can shell-escape
          // each token individually, preventing quoting loss.
          commandArg = args;
        }
      }

      await execShellCommandBatch({
        command: commandArg,
        ...(concurrency !== undefined ? { concurrency } : {}),
        dotenvEnv,
        ...(envBag ? { getDotenvCliOptions: envBag } : {}),
        globs,
        ignoreErrors,
        list: false,
        logger,
        parallel,
        ...(pkgCwd ? { pkgCwd } : {}),
        rootPath,
        shell: shellSetting,
      });
    },
  );
};
