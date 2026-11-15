import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import {
  type GetDotenvCliPublic,
  maybePreserveNodeEvalArgv,
  readMergedOptions,
  resolveCommand,
  resolveShell,
  type ScriptsTable,
} from '@/src/cliHost';
import { propagateExitCode } from '@/src/cliHost/exitCode';

import type { BatchPlugin } from '.';
import { execShellCommandBatch } from './execShellCommandBatch';
import type {
  BatchParentInvokerFlags,
  BatchPluginConfig,
  BatchPluginOptions,
} from './types';

/** One batch invocation, from `batch`'s own action or its `cmd` subcommand. */
export interface BatchRequest {
  /** Positional tokens. */
  positionals: string[];
  /** `batch`'s own flags. */
  flags: BatchParentInvokerFlags;
  /**
   * `batch`: with `--list`, positionals are extra globs. `cmd`: positionals
   * are always the command.
   */
  form: 'batch' | 'cmd';
}

/**
 * Run a batch invocation: the one code path for every form
 * (`batch [command...]`, `batch -c`, `batch -l`, `batch cmd [command...]`). Every
 * form gets the merged options bag (so `--capture` and nested composition
 * apply) and exits with the batch's exit code.
 *
 * Precedence: `--list` runs nothing; positionals beat `--command`. Scripts
 * and shell come from plugin options, then plugin config, then the root
 * options.
 *
 * @param plugin - The batch plugin (for its config).
 * @param cli - The batch mount.
 * @param pluginOpts - The batch plugin's factory options.
 * @param thisCommand - The command whose action runs.
 * @param request - Positionals, flags and form.
 */
export const runBatch = async (
  plugin: BatchPlugin,
  cli: GetDotenvCliPublic,
  pluginOpts: BatchPluginOptions,
  thisCommand: CommandUnknownOpts,
  { positionals, flags, form }: BatchRequest,
): Promise<void> => {
  const merged = readMergedOptions(thisCommand);
  const { logger } = merged;
  const cfg = plugin.readConfig<BatchPluginConfig>(cli);
  const scripts = pluginOpts.scripts ?? cfg.scripts ?? merged.scripts;
  const shell = pluginOpts.shell ?? cfg.shell ?? merged.shell ?? false;
  const concurrency =
    typeof flags.concurrency === 'number' ? flags.concurrency : cfg.concurrency;
  const pkgCwd = flags.pkgCwd ?? Boolean(cfg.pkgCwd);
  const base = {
    ...(concurrency !== undefined ? { concurrency } : {}),
    getDotenvCliOptions: merged,
    ignoreErrors: Boolean(flags.ignoreErrors),
    logger,
    parallel: flags.parallel ?? Boolean(cfg.parallel),
    ...(pkgCwd ? { pkgCwd } : {}),
    rootPath:
      typeof flags.rootPath === 'string'
        ? flags.rootPath
        : (cfg.rootPath ?? './'),
  };
  const globs =
    typeof flags.globs === 'string' ? flags.globs : (cfg.globs ?? '*');

  // `batch cmd x` always runs x; `batch -l x` lists with x as extra globs.
  if (flags.list && !(form === 'cmd' && positionals.length > 0)) {
    const extra = form === 'batch' ? positionals.join(' ').trim() : '';
    propagateExitCode(
      await execShellCommandBatch({
        ...base,
        globs: extra ? `${globs} ${extra}` : globs,
        list: true,
        shell,
      }),
    );
    return;
  }

  const command =
    positionals.length > 0
      ? positionalCommand(positionals, scripts, shell)
      : typeof flags.command === 'string'
        ? {
            command: resolveCommand(scripts, flags.command),
            shell: resolveShell(scripts, flags.command, shell),
          }
        : undefined;
  if (command === undefined) {
    logger.error('No command provided. Use --command or --list.');
    process.exit(1);
  }
  propagateExitCode(
    await execShellCommandBatch({
      ...base,
      ...command,
      dotenvEnv: cli.getCtx().dotenv,
      globs,
      list: false,
    }),
  );
};

/**
 * Positionals as the command. A script name runs its script; otherwise the
 * argv array is kept (no lossy re-tokenization), so each token is quoted for
 * the shell or passed as is with the shell off.
 */
const positionalCommand = (
  positionals: string[],
  scripts: ScriptsTable | undefined,
  shell: string | boolean,
) => {
  const input = positionals.join(' ');
  const resolved = resolveCommand(scripts, input);
  const shellSetting = resolveShell(scripts, input, shell);
  const command: string | string[] =
    resolved !== input
      ? resolved
      : shellSetting === false
        ? maybePreserveNodeEvalArgv(positionals)
        : positionals;
  return { command, shell: shellSetting };
};
