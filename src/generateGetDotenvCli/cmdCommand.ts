import { Command } from '@commander-js/extra-typings';
import { execaCommand } from 'execa';

import { GetDotenvCliCommand } from './GetDotenvCliGenerateOptions';
import { resolveCommand, resolveShell } from './resolve';

export const cmdCommand = new Command()
  .name('cmd')
  .description(
    'batch execute command string according to the --shell option, conflicts with --command option (default command)',
  )
  .configureHelp({ showGlobalOptions: true })
  .enablePositionalOptions()
  .passThroughOptions()
  .action(async (options, thisCommand) => {
    if (thisCommand.args.length === 0) return;

    if (!thisCommand.parent) throw new Error('parent command not found');

    const {
      getDotenvCliOptions: { logger = console, ...getDotenvCliOptions },
    } = thisCommand.parent as GetDotenvCliCommand;

    const command = thisCommand.args.join(' ');

    const cmd = resolveCommand(getDotenvCliOptions.scripts, command);

    if (getDotenvCliOptions.debug)
      logger.log('\n*** command ***\n', `'${cmd}'`);

    await execaCommand(cmd, {
      env: { getDotenvCliOptions: JSON.stringify(getDotenvCliOptions) },
      shell: resolveShell(
        getDotenvCliOptions.scripts,
        command,
        getDotenvCliOptions.shell,
      ),
      stdio: 'inherit',
    });
  });
