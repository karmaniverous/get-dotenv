import type { Command } from '@commander-js/extra-typings';

import { createRootCommand } from './buildRootCommand';
import {
  type GetDotenvCliGenerateOptions,
  resolveGetDotenvCliGenerateOptions,
} from './GetDotenvCliGenerateOptions';
import { makePreSubcommandHook } from './preSubcommandHook';

/**
 * Generate a Commander CLI Command for get-dotenv.
 * Orchestration only: delegates building and lifecycle hooks.
 */
export const generateGetDotenvCli = async (
  customOptions: Pick<GetDotenvCliGenerateOptions, 'importMetaUrl'> &
    Partial<Omit<GetDotenvCliGenerateOptions, 'importMetaUrl'>>,
): Promise<Command> => {
  const options = await resolveGetDotenvCliGenerateOptions(customOptions);

  const program = createRootCommand(options);

  program.hook(
    'preSubcommand',
    makePreSubcommandHook({
      logger: options.logger ?? console,
      preHook: options.preHook,
      postHook: options.postHook,
      defaults: {
        debug: options.debug,
        excludeDynamic: options.excludeDynamic,
        excludeEnv: options.excludeEnv,
        excludeGlobal: options.excludeGlobal,
        excludePrivate: options.excludePrivate,
        excludePublic: options.excludePublic,
        loadProcess: options.loadProcess,
        log: options.log,
        scripts: options.scripts,
        shell: options.shell,
      },
    }),
  );

  return program;
};
