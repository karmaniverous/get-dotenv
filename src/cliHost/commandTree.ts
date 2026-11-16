/**
 * Command-tree traversal shared by the host: the qualified-name table, host
 * help configuration and dynamic option evaluation all visit the same tree.
 */
import type { CommandUnknownOpts } from '@commander-js/extra-typings';

/**
 * Every command in the tree under `root`, in pre-order (`root` first, then
 * each subcommand's subtree in registration order). Plugin mounts and plain
 * `new Command()` mounts are included.
 *
 * @param root - The command to start from.
 * @returns The commands, root first.
 */
export const commandTree = (root: CommandUnknownOpts): CommandUnknownOpts[] => [
  root,
  ...root.commands.flatMap((c) => commandTree(c)),
];
