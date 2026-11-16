/**
 * Commander 15's parse rules, as the argv walk (spec 4.4, step 3) needs them.
 *
 * Commander keeps `maybeOption` and `negativeNumberArg` as closures inside
 * `parseOptions`, so they are restated here verbatim; everything else is read
 * from the command (its options, subcommands, help option and implicit help
 * command) or from the parse flags Commander keeps on it. The private members
 * read here are pinned by `commander.test.ts`.
 */
import type { CommandUnknownOpts, Option } from '@commander-js/extra-typings';

/** The private Commander members the walk reads. */
interface CommanderInternals {
  _enablePositionalOptions: boolean;
  _passThroughOptions: boolean;
  _combineFlagAndOptionalValue: boolean;
  _defaultCommandName: string | null;
  _getHelpOption(): Option | null;
  _getHelpCommand(): CommandUnknownOpts | null;
}

const internals = (cmd: CommandUnknownOpts): CommanderInternals =>
  cmd as unknown as CommanderInternals;

/**
 * Commander's `maybeOption`: a token that could be an option.
 *
 * @param arg - The token.
 * @returns Whether it is longer than one character and starts with `-`.
 */
export const maybeOption = (arg: string): boolean =>
  arg.length > 1 && arg.startsWith('-');

/**
 * Commander's `negativeNumberArg` for a command being parsed: a negative
 * number, unless the command or an ancestor has a digit short option.
 *
 * @param cmd - The command being parsed.
 * @param arg - The token.
 * @returns Whether the token is a negative number for `cmd`.
 */
export const negativeNumberArg = (
  cmd: CommandUnknownOpts,
  arg: string,
): boolean => {
  if (!/^-(\d+|\d*\.\d+)([eE][+-]?\d+)?$/.test(arg)) return false;
  for (let c: CommandUnknownOpts | null = cmd; c; c = c.parent)
    if (c.options.some((o) => /^-\d$/.test(o.short ?? ''))) return false;
  return true;
};

/**
 * Whether a token can be an option value for a command being parsed
 * (Commander's test for an optional value or a further variadic value).
 *
 * @param cmd - The command being parsed.
 * @param arg - The token.
 * @returns Whether the token can be a value.
 */
export const canBeValue = (cmd: CommandUnknownOpts, arg: string): boolean =>
  !maybeOption(arg) || negativeNumberArg(cmd, arg);

/**
 * Commander's `Option.is`: the option's short or long flag.
 *
 * @param option - The option.
 * @param flag - The token.
 * @returns Whether the token is one of its flags.
 */
const isFlagOf = (option: Option, flag: string): boolean =>
  option.short === flag || option.long === flag;

/**
 * Commander's `_findOption`: the command's own option with this flag.
 *
 * @param cmd - The command.
 * @param flag - A short or long flag.
 * @returns The option, if any.
 */
export const findOption = (
  cmd: CommandUnknownOpts,
  flag: string,
): Option | undefined => cmd.options.find((o) => isFlagOf(o, flag));

/**
 * Commander's `_findCommand`: the subcommand with this name or alias.
 *
 * @param cmd - The parent.
 * @param name - The token.
 * @returns The subcommand, if any.
 */
export const findCommand = (
  cmd: CommandUnknownOpts,
  name: string | undefined,
): CommandUnknownOpts | undefined =>
  name === undefined
    ? undefined
    : cmd.commands.find((c) => c.name() === name || c.aliases().includes(name));

/** The parse flags of a command, as Commander keeps them. */
export interface ParseFlags {
  /** `enablePositionalOptions()` or `passThroughOptions()`. */
  positional: boolean;
  /** `passThroughOptions()`. */
  passThrough: boolean;
  /** `combineFlagAndOptionalValue()` (on by default). */
  combine: boolean;
  /** The default subcommand's name, if any. */
  defaultName: string | undefined;
}

/**
 * The parse flags of a command.
 *
 * @param cmd - The command.
 * @returns Its flags.
 */
export const parseFlagsOf = (cmd: CommandUnknownOpts): ParseFlags => {
  const c = internals(cmd);
  return {
    positional: c._enablePositionalOptions || c._passThroughOptions,
    passThrough: c._passThroughOptions,
    combine: c._combineFlagAndOptionalValue,
    defaultName: c._defaultCommandName ?? undefined,
  };
};

/**
 * Whether a token is the command's help option (`-h`/`--help` by default).
 *
 * @param cmd - The command.
 * @param arg - The token.
 * @returns Whether Commander would treat it as a help request.
 */
export const isHelpFlag = (cmd: CommandUnknownOpts, arg: string): boolean => {
  const help = internals(cmd)._getHelpOption();
  return help !== null && isFlagOf(help, arg);
};

/**
 * The command's help command (Commander's implicit `help` subcommand, or a
 * custom one), if it has one.
 *
 * @param cmd - The command.
 * @returns The help command, if any.
 */
export const helpCommandOf = (
  cmd: CommandUnknownOpts,
): CommandUnknownOpts | undefined =>
  internals(cmd)._getHelpCommand() ?? undefined;

const DEFAULT_SWITCHES = new WeakMap<Option, string>();

/**
 * Register an option that, when given, makes a subcommand its command's
 * default subcommand for the rest of that parse (the `cmd` plugin's parent
 * alias does this). The argv walk applies the same switch.
 *
 * @param option - The option.
 * @param subcommand - The subcommand's name.
 */
export const registerDefaultSwitch = (
  option: Option,
  subcommand: string,
): void => {
  DEFAULT_SWITCHES.set(option, subcommand);
};

/**
 * The subcommand an option makes the default, if it was registered.
 *
 * @param option - The option.
 * @returns The subcommand's name, if any.
 */
export const defaultSwitchOf = (option: Option): string | undefined =>
  DEFAULT_SWITCHES.get(option);
