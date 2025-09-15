import type { Command } from '@commander-js/extra-typings';

import { createRootCommand } from './buildRootCommand';
import {
  type GetDotenvCliGenerateOptions,
  resolveGetDotenvCliGenerateOptions,
} from './GetDotenvCliGenerateOptions';
import {
  makePreSubcommandHook,
  type PreSubHookContext,
} from './preSubcommandHook';

/**
 * Generate a Commander CLI Command for get-dotenv. * Orchestration only: delegates building and lifecycle hooks.
 */
export const generateGetDotenvCli = async (
  customOptions: Pick<GetDotenvCliGenerateOptions, 'importMetaUrl'> &
    Partial<Omit<GetDotenvCliGenerateOptions, 'importMetaUrl'>>,
): Promise<Command> => {
  const options = await resolveGetDotenvCliGenerateOptions(customOptions);

  const program = createRootCommand(options);

  // Build defaults while respecting exactOptionalPropertyTypes:
  // Only include keys when defined (do not assign undefined).
  type DefaultsShape = Partial<
    Pick<
      GetDotenvCliGenerateOptions,
      | 'debug'
      | 'excludeDynamic'
      | 'excludeEnv'
      | 'excludeGlobal'
      | 'excludePrivate'
      | 'excludePublic'
      | 'loadProcess'
      | 'log'
      | 'scripts'
      | 'shell'
    >
  >;
  const defaults: DefaultsShape = {};
  if (options.debug !== undefined) defaults.debug = options.debug;
  if (options.excludeDynamic !== undefined)
    defaults.excludeDynamic = options.excludeDynamic;
  if (options.excludeEnv !== undefined)
    defaults.excludeEnv = options.excludeEnv;
  if (options.excludeGlobal !== undefined)
    defaults.excludeGlobal = options.excludeGlobal;
  if (options.excludePrivate !== undefined)
    defaults.excludePrivate = options.excludePrivate;
  if (options.excludePublic !== undefined)
    defaults.excludePublic = options.excludePublic;
  if (options.loadProcess !== undefined)
    defaults.loadProcess = options.loadProcess;
  if (options.log !== undefined) defaults.log = options.log;
  if (options.scripts !== undefined) defaults.scripts = options.scripts;
  if (options.shell !== undefined) defaults.shell = options.shell;

  const ctx: PreSubHookContext = {
    logger: options.logger ?? console,
    defaults,
    ...(options.preHook ? { preHook: options.preHook } : {}),
    ...(options.postHook ? { postHook: options.postHook } : {}),
  };

  program.hook('preSubcommand', makePreSubcommandHook(ctx));

  return program;
};
