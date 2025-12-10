/** src/cliHost/getRootCommand.ts
 * Typed helper to retrieve the true root command (host) starting from any mount.
 */
import type { CommandUnknownOpts } from '@commander-js/extra-typings';

/**
 * Return the top-level root command for a given mount or action's thisCommand.
 *
 * @param cmd - any command (mount or thisCommand inside an action)
 * @returns the root command instance
 */
export const getRootCommand = (cmd: CommandUnknownOpts): CommandUnknownOpts => {
  let node: CommandUnknownOpts = cmd;
  while (node.parent) node = node.parent;
  return node;
};
