import { Command } from 'commander';

import type { GetDotenvCliCommand } from '../GetDotenvCliGenerateOptions';
import { resolveCommand, resolveShell } from '../resolve';
import { execShellCommandBatch } from './execShellCommandBatch';
export const cmdCommand = new Command()
  .name('cmd')
  .description(
    'execute command, conflicts with --command option (default subcommand)',
  )
  .enablePositionalOptions()
  .passThroughOptions()
  .action(async (_options: unknown, thisCommand: Command) => {
    if (!thisCommand.parent)
      throw new Error(`unable to resolve parent command`);

    if (!thisCommand.parent.parent)
      throw new Error(`unable to resolve root command`);

    const {
      getDotenvCliOptions: { logger = console, ...getDotenvCliOptions },
    } = thisCommand.parent.parent as GetDotenvCliCommand;

    const raw = thisCommand.parent.opts();
    const ignoreErrors = !!raw.ignoreErrors;
    const globs = typeof raw.globs === 'string' ? raw.globs : '*';
    const list = !!raw.list;
    const pkgCwd = !!raw.pkgCwd;
    const rootPath = typeof raw.rootPath === 'string' ? raw.rootPath : './';

    // Execute command.
    const command = thisCommand.args.join(' ');

    await execShellCommandBatch({
      command: resolveCommand(getDotenvCliOptions.scripts, command),
      getDotenvCliOptions,
      globs,
      ignoreErrors,
      list,
      logger,
      pkgCwd,
      rootPath,
      // execa expects string | boolean | URL for `shell`. We normalize earlier;
      // scripts[name].shell overrides take precedence and may be boolean or string.
      shell: resolveShell(
        getDotenvCliOptions.scripts,
        command,
        getDotenvCliOptions.shell,
      ) as unknown as string | boolean | URL,
    });
  });
