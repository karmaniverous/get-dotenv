// Ensure attachRootOptions() and passOptions() are available whenever the
// /cliHost subpath is imported (unconditional for downstream hosts).
import '../cliCore/enhanceGetDotenvCli';

import type { Command } from 'commander';

import type { GetDotenvCliOptions } from '../cliCore/GetDotenvCliOptions';

export type { DefineSpec, GetDotenvCliPlugin } from './definePlugin';
export type { GetDotenvCliPublic } from './definePlugin';
export { definePlugin } from './definePlugin';
export type { GetDotenvCliCtx } from './GetDotenvCli';
export { GetDotenvCli } from './GetDotenvCli';
// Downstream-friendly type re-exports (single import path)
export type { GetDotenvCliOptions } from '../cliCore/GetDotenvCliOptions';
export type { ScriptsTable } from '../cliCore/types';

/**
 * Helper to retrieve the merged root options bag from any action handler
 * that only has access to thisCommand. Avoids structural casts.
 */
export const readMergedOptions = (
  cmd: Command,
): GetDotenvCliOptions | undefined => {
  // Ascend to the root command
  let root: Command = cmd;
  while ((root as unknown as { parent?: Command }).parent) {
    root = (root as unknown as { parent?: Command }).parent as Command;
  }
  const hostAny = root as unknown as { getOptions?: () => unknown };
  return typeof hostAny.getOptions === 'function'
    ? (hostAny.getOptions() as GetDotenvCliOptions)
    : ((root as unknown as { getDotenvCliOptions?: unknown })
        .getDotenvCliOptions as GetDotenvCliOptions | undefined);
};
