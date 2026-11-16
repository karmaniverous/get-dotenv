/**
 * The qualified-name table (spec 4.3).
 *
 * Built once per host instance, in the first `GetDotenvCli.parseAsync`, after
 * `install()` has mounted the plugin tree and after `brand()`. It maps every
 * qualified name to the command and Commander option that own it, and holds
 * every command's terminator as a reserved entry. Building it registers the
 * terminators and throws on a collision or a plain option that uses the
 * reserved `<alias>-` prefix.
 */
import type { CommandUnknownOpts, Option } from '@commander-js/extra-typings';

import { hideTerminatorsInSubcommandTerms } from './help';
import {
  commandLabel,
  commandPathOf,
  qualifiableLong,
  qualifiedName,
} from './names';
import {
  createTerminator,
  findTerminator,
  isTerminatorOption,
  registerTerminator,
} from './register';
import { terminatorName } from './terminator';

/** A table entry: what owns one qualified name. */
export interface QualifiedNameEntry {
  /** `option`: a qualified long option. `terminator`: a reserved terminator. */
  kind: 'option' | 'terminator';
  /** The qualified name (for a terminator, its flag). */
  name: string;
  /** The owning command. */
  command: CommandUnknownOpts;
  /** The owning command's path (names below the root). */
  path: readonly string[];
  /** The option: the declared one, or the registered terminator. */
  option: Option;
}

/** A host's qualified-name table. */
export interface QualifiedNameTable {
  /** The alias the names were built from: the root's name at build time. */
  alias: string;
  /** Every qualified name and reserved terminator, by name. */
  entries: ReadonlyMap<string, QualifiedNameEntry>;
  /** Each command's terminator flag. */
  terminators: ReadonlyMap<CommandUnknownOpts, string>;
}

const TABLES = new WeakMap<CommandUnknownOpts, QualifiedNameTable>();

/** Pre-order walk of the command tree. */
const walk = (cmd: CommandUnknownOpts): CommandUnknownOpts[] => [
  cmd,
  ...cmd.commands.flatMap((c) => walk(c)),
];

/** An entry's owner, for messages. */
const describe = (alias: string, e: QualifiedNameEntry): string =>
  e.kind === 'terminator'
    ? `the terminator of '${commandLabel(alias, e.path)}'`
    : `${e.option.long ?? e.option.flags} on '${commandLabel(alias, e.path)}'`;

/**
 * Build the qualified-name table for the tree under `root` and register the
 * terminators. Every check runs before any terminator is registered.
 *
 * @param root - The host root.
 * @returns The table.
 * @throws On a qualified-name collision (naming both owners) or a plain long
 *   option that starts with `<alias>-`.
 */
export const buildQualifiedNameTable = (
  root: CommandUnknownOpts,
): QualifiedNameTable => {
  const alias = root.name();
  const prefix = `--${alias}-`;
  const entries = new Map<string, QualifiedNameEntry>();
  const terminators = new Map<CommandUnknownOpts, string>();
  const add = (entry: QualifiedNameEntry) => {
    const prior = entries.get(entry.name);
    if (prior)
      throw new Error(
        `Qualified option name collision: '${entry.name}' is claimed by ${describe(alias, prior)} and by ${describe(alias, entry)}. Rename one of the options.`,
      );
    entries.set(entry.name, entry);
  };

  const pending: Array<[CommandUnknownOpts, Option]> = [];
  for (const command of walk(root)) {
    const path = commandPathOf(command);
    const flag = terminatorName(alias, path);
    const terminator = findTerminator(command, flag) ?? createTerminator(flag);
    pending.push([command, terminator]);
    terminators.set(command, flag);
    add({ kind: 'terminator', name: flag, command, path, option: terminator });
    for (const option of command.options) {
      if (isTerminatorOption(option)) continue;
      const long = qualifiableLong(option);
      if (long === undefined) continue;
      if (long.startsWith(prefix))
        throw new Error(
          `Option '${long}' on '${commandLabel(alias, path)}' starts with '${prefix}', a prefix reserved for ${alias}'s qualified options. Rename the option.`,
        );
      add({
        kind: 'option',
        name: qualifiedName(alias, path, long),
        command,
        path,
        option,
      });
    }
  }
  for (const [command, option] of pending) {
    registerTerminator(command, option);
    hideTerminatorsInSubcommandTerms(command);
  }
  return { alias, entries, terminators };
};

/**
 * The host's qualified-name table, building it (and registering the
 * terminators) on the first call. Later calls return the same table.
 *
 * @param root - The host root.
 * @returns The table.
 */
export const ensureQualifiedNameTable = (
  root: CommandUnknownOpts,
): QualifiedNameTable => {
  const existing = TABLES.get(root);
  if (existing) return existing;
  const table = buildQualifiedNameTable(root);
  TABLES.set(root, table);
  return table;
};

/**
 * Internal accessor: the table built by the host's first `parseAsync`.
 *
 * @param root - The host root.
 * @returns The table, or `undefined` before the first `parseAsync`.
 */
export const qualifiedNameTableOf = (
  root: CommandUnknownOpts,
): QualifiedNameTable | undefined => TABLES.get(root);
