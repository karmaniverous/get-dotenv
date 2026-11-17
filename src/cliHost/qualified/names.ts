/**
 * Qualified-name construction (spec 4.2).
 *
 * A long option `--<opt>` declared on the command at path `p1 … pn` has the
 * qualified name `--<alias>-<p1>-…-<pn>-<opt>`. The path is the names of the
 * mounted commands below the root (after `ns` overrides, `cli.ns()` and plain
 * `new Command()` subcommands included); the root's own name, the alias, is
 * not part of it. A negated option keeps its `no-` after the prefix.
 */
import type { CommandUnknownOpts, Option } from '@commander-js/extra-typings';

/** The only long option with no qualified form (Decision 20). */
const UNQUALIFIED_LONG = '--help';

/**
 * The command path of `cmd`: the names of the commands from just below the
 * root down to `cmd`. The root's path is empty.
 *
 * @param cmd - A command in the tree.
 * @returns Its command path.
 */
export const commandPathOf = (cmd: CommandUnknownOpts): string[] => {
  const names: string[] = [];
  for (let node = cmd; node.parent; node = node.parent) names.push(node.name());
  return names.reverse();
};

/**
 * The qualified name of a long option.
 *
 * @param alias - The CLI alias.
 * @param path - The owning command's path.
 * @param long - The option's plain long flag, e.g. `--no-login-on-demand`.
 * @returns The qualified flag, e.g. `--vc-aws-no-login-on-demand`.
 */
export const qualifiedName = (
  alias: string,
  path: readonly string[],
  long: string,
): string => `--${[alias, ...path, long.replace(/^--/, '')].join('-')}`;

/**
 * Whether an option gets a qualified name: it has a long flag, and the flag
 * isn't `--help`.
 *
 * @param option - A Commander option.
 * @returns Its long flag when it qualifies, else `undefined`.
 */
export const qualifiableLong = (option: Option): string | undefined => {
  const { long } = option;
  return typeof long === 'string' && long !== UNQUALIFIED_LONG
    ? long
    : undefined;
};

/**
 * A command's display label for messages: the alias and the path joined by
 * spaces (`vc aws secrets pull`).
 *
 * @param alias - The CLI alias.
 * @param path - The command path.
 * @returns The label.
 */
export const commandLabel = (alias: string, path: readonly string[]): string =>
  [alias, ...path].join(' ');
