import { Command } from 'commander';
import { execaCommand } from 'execa';

import type { GetDotenvCliCommand } from './GetDotenvCliGenerateOptions';
import { resolveCommand, resolveShell } from './resolve';
export const cmdCommand = new Command()
  .name('cmd')
  .description(
    'Batch execute command according to the --shell option, conflicts with --command option (default subcommand)',
  )
  .configureHelp({ showGlobalOptions: true })
  .enablePositionalOptions()
  .passThroughOptions()
  .action(async (_options: unknown, thisCommand: Command) => {
    const args = (thisCommand.args ?? []) as unknown[];
    if (args.length === 0) return;

    if (!thisCommand.parent) throw new Error('parent command not found');

    const {
      getDotenvCliOptions: { logger = console, ...getDotenvCliOptions },
    } = thisCommand.parent as GetDotenvCliCommand;

    const command = args.map(String).join(' ');

    const cmd = resolveCommand(getDotenvCliOptions.scripts, command);

    if (getDotenvCliOptions.debug)
      logger.log('\n*** command ***\n', `'${cmd}'`);
    await execaCommand(cmd, {
      env: {
        ...process.env,
        getDotenvCliOptions: JSON.stringify(getDotenvCliOptions),
      },
      // execa expects string | boolean | URL; we normalize in generator
      // and allow script-level overrides.
      shell: resolveShell(
        getDotenvCliOptions.scripts,
        command,
        getDotenvCliOptions.shell,
      ) as unknown as string | boolean | URL,
      stdio: 'inherit',
    });
  });
