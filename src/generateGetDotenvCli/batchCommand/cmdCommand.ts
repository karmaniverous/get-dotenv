import { Command } from 'commander';

import type { GetDotenvCliCommand } from '../GetDotenvCliGenerateOptions';
import { resolveCommand, resolveShell } from '../resolve';
import type { BatchCommandOptions } from '.';
import { execShellCommandBatch } from './execShellCommandBatch';
export const cmdCommand = new Command()
  .name('cmd')
  .description(
    'execute command, conflicts with --command option (default subcommand)',
  )
  .enablePositionalOptions()
  .passThroughOptions()
  .action(async (options, thisCommand) => {
    if (!thisCommand.parent)
      throw new Error(`unable to resolve parent command`);

    if (!thisCommand.parent.parent)
      throw new Error(`unable to resolve root command`);

    const {
      getDotenvCliOptions: { logger = console, ...getDotenvCliOptions },
    } = thisCommand.parent.parent as GetDotenvCliCommand;

    const { ignoreErrors, globs, list, pkgCwd, rootPath } =
      thisCommand.parent.opts() as BatchCommandOptions;

    // Execute command.
    {
      const command = thisCommand.args.join(' ');

      await execShellCommandBatch({
        command: resolveCommand(getDotenvCliOptions.scripts, command),
        getDotenvCliOptions,
        globs,
        ignoreErrors: !!ignoreErrors,
        list: !!list,
        logger,
        pkgCwd: !!pkgCwd,
        rootPath,
        // execa expects string | boolean | URL for `shell`. We normalize earlier;
        // scripts[name].shell overrides take precedence and may be boolean or string.
        shell: resolveShell(
          getDotenvCliOptions.scripts,
          command,
          getDotenvCliOptions.shell,
        ) as unknown as string | boolean | URL,
      });
    }
  });
