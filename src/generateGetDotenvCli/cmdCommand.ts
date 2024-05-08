import { Command } from '@commander-js/extra-typings';
import { execaCommand } from 'execa';

import { GetDotenvCliCommand } from './types';

export const cmdCommand = new Command()
  .name('cmd')
  .description(
    'batch execute shell command, conflicts with --command option (default command)',
  )
  .configureHelp({ showGlobalOptions: true })
  .enablePositionalOptions()
  .passThroughOptions()
  .action(async (options, thisCommand) => {
    if (!thisCommand.parent) throw new Error('parent command not found');

    const {
      getDotenvOptions: { debug, logger = console, shellScripts },
    } = thisCommand.parent as GetDotenvCliCommand;

    const command = thisCommand.args.join(' ');

    const shellCommand = shellScripts?.[command] ?? command;

    if (debug) logger.log('\n*** shell command ***\n', shellCommand);

    await execaCommand(shellCommand, {
      shell: true,
      stdio: 'inherit',
    });
  });
