import { Command } from '@commander-js/extra-typings';
import { execaCommand } from 'execa';

import { GetDotenvCliCommand } from '../types';

export const cmd = new Command()
  .name('cmd')
  .description('execute shell command string (default command)')
  .enablePositionalOptions()
  .passThroughOptions()
  .action(async (options, command) => {
    const {
      args,
      getDotenvOptions: { debug, logger },
    } = command.parent as GetDotenvCliCommand;

    if (args.length) {
      if (debug && logger) logger.log('\n*** raw shell args ***\n', args);

      const shellCommand = args.join(' ');

      if (debug && logger)
        logger.log('\n*** shell command ***\n', shellCommand);

      await execaCommand(shellCommand, {
        stdio: 'inherit',
        shell: true,
      });
    }
  });
