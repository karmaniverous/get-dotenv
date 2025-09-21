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
  .argument('[command...]')
  .action(
    async (
      commandParts: string[] | undefined,
      _options: unknown,
      thisCommand: Command,
    ) => {
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
      const args = Array.isArray(commandParts) ? commandParts : [];
      // When no positional tokens are provided (e.g., option form `-c/--command`),
      // the preSubcommand hook handles execution. Avoid a duplicate call here.
      if (args.length === 0) return;
      const command = args.map(String).join(' ');

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
    },
  );
