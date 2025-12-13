import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import { GetDotenvCli } from './GetDotenvCli';
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';

/**
 * Retrieve the merged root options bag from the current command context.
 * Climbs to the root `GetDotenvCli` instance to access the persisted options.
 *
 * @param cmd - The current command instance (thisCommand).
 * @throws Error if the root is not a GetDotenvCli or options are missing.
 */
export const readMergedOptions = (
  cmd: CommandUnknownOpts,
): GetDotenvCliOptions => {
  // Climb to the true root
  let root = cmd;
  while (root.parent) root = root.parent;

  // Assert we ended at our host
  if (!(root instanceof GetDotenvCli)) {
    throw new Error(
      'readMergedOptions: root command is not a GetDotenvCli.' +
        'Ensure your CLI is constructed with GetDotenvCli.',
    );
  }

  // Require passOptions() to have persisted the bag
  const bag = (root as GetDotenvCli).getOptions();
  if (!bag || typeof bag !== 'object') {
    throw new Error(
      'readMergedOptions: merged options are unavailable. ' +
        'Call .passOptions() on the host before parsing.',
    );
  }
  return bag;
};
