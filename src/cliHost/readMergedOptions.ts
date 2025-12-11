/** src/cliHost/readMergedOptions.ts
 * Helper to retrieve the merged root options bag from any action handler
 * that only has access to thisCommand. Avoids structural casts.
 */
import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import { GetDotenvCli } from './GetDotenvCliq';
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';

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
