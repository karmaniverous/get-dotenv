import { Command } from '@commander-js/extra-typings';

import { GetDotenvCliCommand } from '../GetDotenvCliGenerateOptions';
import { resolveCommand, resolveShell } from '../resolve';
import { BatchCommandOptions } from '.';
import { execShellCommandBatch } from './execShellCommandBatch';

export const cmdCommand = new Command()
  .name('cmd')
  .description(
    'execute shell command, conflicts with --command option (default command)',
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

    // Execute shell command.
    {
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
        shell: resolveShell(
          getDotenvCliOptions.scripts,
          command,
          getDotenvCliOptions.shell,
        ),
      });
    }
  });
