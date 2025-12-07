import type { CommandUnknownOpts } from '@commander-js/extra-typings';

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

/**
 * Build the default "cmd" subcommand action for the batch plugin.
 * Mirrors the original inline implementation with identical behavior.
 */
export const buildDefaultCmdAction =
  (
    plugin: ReturnType<typeof definePlugin>,
    cli: GetDotenvCliPublic,
    batchCmd: CommandUnknownOpts,
    pluginOpts: BatchPluginOptions,
  ) =>
  async (
    commandParts: unknown,
    _subOpts: unknown,
    thisCommand: CommandUnknownOpts,
  ): Promise<void> => {
    // Inherit logger from the merged root options bag
    const mergedForLogger = readMergedOptions(batchCmd);
    const loggerLocal: Logger = mergedForLogger.logger;

    // Guard: when invoked without positional args (e.g., `batch --list`), defer to parent.
    const args: string[] = Array.isArray(commandParts)
      ? (commandParts as string[]).map(String)
      : [];

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

    // Safely retrieve merged parent flags (prefer optsWithGlobals when present)
    let gSrc: unknown = {};
    if ('optsWithGlobals' in (thisCommand as object)) {
      // Retrieve method via Reflect to avoid unbound-method lint, then call
      const owg = Reflect.get(thisCommand as object, 'optsWithGlobals') as
        | ((this: unknown) => unknown)
        | undefined;
      if (typeof owg === 'function') {
        gSrc = owg.call(thisCommand);
      }
    } else if ('opts' in (batchCmd as object)) {
      const opts = Reflect.get(batchCmd as object, 'opts') as
        | ((this: unknown) => unknown)
        | undefined;
      if (typeof opts === 'function') {
        gSrc = opts.call(batchCmd);
      }
    }
    const g = gSrc as BatchFlags;

    const ignoreErrors = Boolean(g.ignoreErrors);
    const globs = typeof g.globs === 'string' ? g.globs : (cfg.globs ?? '*');
    const pkgCwd = g.pkgCwd !== undefined ? g.pkgCwd : Boolean(cfg.pkgCwd);
    const rootPath =
      typeof g.rootPath === 'string' ? g.rootPath : (cfg.rootPath ?? './');

    // Resolve scripts/shell with precedence:
    // plugin opts → plugin config → merged root CLI options
    const mergedBag = readMergedOptions(batchCmd);
    const scripts =
      pluginOpts.scripts ?? cfg.scripts ?? mergedBag.scripts ?? undefined;
    const shell = pluginOpts.shell ?? cfg.shell ?? mergedBag.shell;

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
      if (g.list) {
        // Resolve shell fallback without chained nullish checks (lint-friendly)
        const rootShell = readMergedOptions(batchCmd).shell;
        const listShell = shell !== undefined ? shell : rootShell;
        await execShellCommandBatch({
          globs,
          ignoreErrors,
          list: true,
          logger: loggerLocal,
          ...(pkgCwd ? { pkgCwd } : {}),
          rootPath,
          shell: listShell,
        });
        return;
      }
      {
        const emit = loggerLocal.error ?? loggerLocal.log;
        emit('No command provided. Use --command or --list.');
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

    const bag = readMergedOptions(batchCmd);
    const scriptsExec = scripts ?? bag.scripts ?? undefined;
    const shellExec = shell ?? bag.shell;
    const resolved = resolveCommand(scriptsExec, input);
    const shellSetting = resolveShell(scriptsExec, input, shellExec);

    // Preserve argv array only for shell-off Node -e snippets to avoid
    // lossy re-tokenization (Windows/PowerShell quoting). For simple
    // commands (e.g., "echo OK") keep string form to satisfy unit tests.
    let commandArg: string | string[] = resolved;
    if (shellSetting === false && resolved === input) {
      const first = (args[0] ?? '').toLowerCase();
      const hasEval = args.some((t: string) => t === '-e' || t === '--eval');
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
