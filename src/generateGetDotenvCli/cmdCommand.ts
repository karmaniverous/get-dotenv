import { Command } from '@commander-js/extra-typings';
import { execaCommand } from 'execa';

import { GetDotenvCliCommand } from './GetDotenvCliGenerateOptions';

export const cmdCommand = new Command()
  .name('cmd')
  .description(
    'batch execute shell command, conflicts with --command option (default command)',
  )
  .configureHelp({ showGlobalOptions: true })
  .enablePositionalOptions()
  .passThroughOptions()
  .action(async (options, thisCommand) => {
    if (thisCommand.args.length === 0) return;

    if (!thisCommand.parent) throw new Error('parent command not found');

    const {
      getDotenvCliOptions: { debug, logger = console, shellScripts },
    } = thisCommand.parent as GetDotenvCliCommand;

    const command = thisCommand.args.join(' ');

    const shellCommand = shellScripts?.[command] ?? command;

    if (debug) logger.log('\n*** shell command ***\n', `'${shellCommand}'`);

    await execaCommand(shellCommand, {
      shell: true,
      stdio: 'inherit',
    });
  });
