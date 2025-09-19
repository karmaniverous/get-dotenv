import { Command } from 'commander';

import { attachRootOptions } from '../cliCore/attachRootOptions';
import { batchCommand } from './batchCommand';
import { cmdCommand } from './cmdCommand';
import type { GetDotenvCliGenerateOptions } from './GetDotenvCliGenerateOptions';

/**
 * Create the root Commander command with legacy root options (via cliCore)
 * and built-in subcommands. Pure builder: no side-effects; the caller attaches
 * lifecycle hooks separately.
 */
export const createRootCommand = (
  opts: GetDotenvCliGenerateOptions,
): Command => {
  const program = new Command().name(opts.alias).description(opts.description);

  // Attach legacy root flags using shared cliCore builder to keep parity.
  attachRootOptions(program, opts as unknown as Record<string, unknown>, {
    includeCommandOption: true,
  });

  // Subcommands
  program.addCommand(batchCommand).addCommand(cmdCommand, { isDefault: true });
  return program;
};
