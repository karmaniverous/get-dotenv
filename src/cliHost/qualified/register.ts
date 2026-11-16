/**
 * Terminator registration (Decision 28 and its addenda).
 *
 * A terminator is a hidden boolean option. It is registered at most once per
 * command and name, so building the table again never adds a duplicate flag.
 * Its value never reaches `opts()`: a second `option:` listener clears the
 * value Commander sets, and the command's `opts` is wrapped to leave the key
 * out, on every command, plain `new Command()` mounts included.
 */
import type { EventEmitter } from 'node:events';

import {
  type CommandUnknownOpts,
  Option,
  type OptionValues,
} from '@commander-js/extra-typings';

/** Every registered terminator option (exempt from the prefix check). */
const TERMINATOR_OPTIONS = new WeakSet<Option>();

/** Terminator attribute names per command, read by the `opts` wrapper. */
const TERMINATOR_KEYS = new WeakMap<CommandUnknownOpts, Set<string>>();

/**
 * Whether `option` is a terminator registered by {@link registerTerminator}.
 *
 * @param option - A Commander option.
 * @returns `true` for a terminator.
 */
export const isTerminatorOption = (option: Option): boolean =>
  TERMINATOR_OPTIONS.has(option);

/**
 * Wrap `cmd.opts` once so it leaves out the command's terminator keys.
 *
 * @param cmd - The command.
 * @returns The command's terminator key set (shared with the wrapper).
 */
const wrapOpts = (cmd: CommandUnknownOpts): Set<string> => {
  const existing = TERMINATOR_KEYS.get(cmd);
  if (existing) return existing;
  const keys = new Set<string>();
  TERMINATOR_KEYS.set(cmd, keys);
  const original = cmd.opts.bind(cmd);
  const wrapped = (): OptionValues => {
    const values = original();
    if (!Object.keys(values).some((k) => keys.has(k))) return values;
    return Object.fromEntries(
      Object.entries(values).filter(([k]) => !keys.has(k)),
    );
  };
  (cmd as { opts: () => OptionValues }).opts = wrapped;
  return keys;
};

/**
 * The terminator `flag` already registered on `cmd`, if any.
 *
 * @param cmd - The command.
 * @param flag - The terminator flag, from `terminatorName`.
 * @returns The registered option, or `undefined`.
 */
export const findTerminator = (
  cmd: CommandUnknownOpts,
  flag: string,
): Option | undefined =>
  cmd.options.find((o) => o.long === flag && isTerminatorOption(o));

/**
 * A new terminator option: a hidden boolean with no description.
 *
 * @param flag - The terminator flag, from `terminatorName`.
 * @returns The option, not yet registered.
 */
export const createTerminator = (flag: string): Option =>
  new Option(flag).hideHelp();

/**
 * Register a terminator option on `cmd`, unless it is already registered
 * there (a rebuilt table reuses the registered option).
 *
 * @param cmd - The command.
 * @param option - The terminator, from {@link createTerminator}.
 */
export const registerTerminator = (
  cmd: CommandUnknownOpts,
  option: Option,
): void => {
  if (cmd.options.includes(option)) return;
  TERMINATOR_OPTIONS.add(option);
  wrapOpts(cmd).add(option.attributeName());
  cmd.addOption(option);
  // Runs after Commander's own listener: the value never stays set.
  (cmd as unknown as EventEmitter).on(`option:${option.name()}`, () => {
    cmd.setOptionValueWithSource(option.attributeName(), undefined, undefined);
  });
};
