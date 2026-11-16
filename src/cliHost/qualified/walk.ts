/**
 * The argv walk (spec 4.4, step 3).
 *
 * Replays Commander 15's own parse over the tokens left after extraction:
 * each command runs Commander's `parseOptions` loop over the tokens it is
 * given, and `_parseCommand`'s dispatch picks the next command. The walk
 * records what step 4 needs (the invoked path, where each command was
 * entered and whether it takes options there, the gaps that need a
 * terminator) and what step 6 needs (the plain options each command took).
 *
 * Two departures from a plain replay make the walk describe the normalized
 * argv rather than the typed one:
 *
 * - A gap (a claimed qualified token) is an option token no command owns. It
 *   ends an optional option's value and a variadic run; a required value
 *   that would come from across it is an error. Otherwise it is stepped over.
 * - A default subcommand entered at a token is written in before that token
 *   (Decision 30), so Commander dispatches it by name: the parent's help
 *   check does not see the tokens that follow. A help token at the point of
 *   entry stays the parent's (`vc -h` is top-level help).
 */
import type { CommandUnknownOpts, Option } from '@commander-js/extra-typings';

import {
  canBeValue,
  defaultSwitchOf,
  findCommand,
  findOption,
  helpCommandOf,
  isHelpFlag,
  maybeOption,
  negativeNumberArg,
  parseFlagsOf,
} from './commander';
import { NormalizeArgvError } from './errors';

/** A token left after extraction. */
export interface WalkToken {
  /** Always `token`. */
  kind: 'token';
  /** The token. */
  text: string;
}

/** The gap a claimed qualified token left (Decision 34). */
export interface WalkGap {
  /** Always `gap`. */
  kind: 'gap';
  /** The claimed token as typed, for messages. */
  text: string;
}

/** A token left after extraction, or the gap a claimed token left. */
export type WalkItem = WalkToken | WalkGap;

/** How the walk entered a command. */
export type WalkEntryKind =
  /** The root. */
  | 'root'
  /** By its name token (`at`). */
  | 'name'
  /** A default subcommand written in before item `at`. */
  | 'written'
  /** A default subcommand entered with nothing to write: at the end of the
   *  argv, or from operands Commander does not parse for options. */
  | 'implicit';

/** One command on the invoked path. */
export interface WalkEntry {
  /** The command. */
  command: CommandUnknownOpts;
  /** How it was entered. */
  kind: WalkEntryKind;
  /** The name token (`name`), or the item the name is written before
   *  (`written`). */
  at: number | undefined;
  /** Whether Commander parses options right after its name: false when the
   *  name was an operand after `--` or the command was entered implicitly. */
  takesOptions: boolean;
  /** For `written`: the parent was waiting for an optional or variadic value,
   *  so its terminator goes before the written name. */
  terminatorBefore: boolean;
}

/** A plain option the walk assigned to a command. */
export interface WalkAssignment {
  /** The command that took it. */
  command: CommandUnknownOpts;
  /** The option. */
  option: Option;
  /** The flag as typed (`--env`, `-e`). */
  flag: string;
  /** The item that held it. */
  item: number;
}

/** What the walk saw. */
export interface Walk {
  /** The invoked path, root first. */
  path: WalkEntry[];
  /** Gaps that ended a value or a variadic run, with the parsing command. */
  terminators: ReadonlyMap<number, CommandUnknownOpts>;
  /** The plain options assigned, in argv order per command. */
  assigned: WalkAssignment[];
  /** The command whose help Commander renders, if the argv asks for help. */
  help: CommandUnknownOpts | undefined;
  /** The last command's arguments (Commander's `args`), as items. */
  args: number[];
  /** Commander stops before dispatch: a required value is missing at the
   *  end of the argv. */
  incomplete: boolean;
}

/** Options for {@link walkArgv}. */
export interface WalkOptions {
  /** Options a command is given before its own tokens (the claimed
   *  qualified options inserted after its name): the walk applies their
   *  default-subcommand switches. */
  preset?: (command: CommandUnknownOpts) => readonly Option[];
}

/** A token routed to a command's operands or unknown list. */
interface Slot {
  item: number;
  /** Whether the parse loop examined it (false: carried in bulk after `--`,
   *  after a pass-through operand, or from a parent's operands). */
  parsed: boolean;
}

/**
 * Walk the items as Commander would parse them.
 *
 * @param root - The host root.
 * @param items - The tokens and gaps, in argv order.
 * @param options - Walk options.
 * @returns What the walk saw.
 * @throws NormalizeArgvError when a required value would come from across a
 *   gap.
 */
export const walkArgv = (
  root: CommandUnknownOpts,
  items: readonly WalkItem[],
  options: WalkOptions = {},
): Walk => {
  const walk: Walk = {
    path: [],
    terminators: new Map(),
    assigned: [],
    help: undefined,
    args: [],
    incomplete: false,
  };
  const terminators = walk.terminators as Map<number, CommandUnknownOpts>;
  const isGap = (item: number) => items[item]?.kind === 'gap';
  const textOf = (slot: Slot | undefined) =>
    slot === undefined ? undefined : items[slot.item]?.text;

  const level = (
    cmd: CommandUnknownOpts,
    list: readonly number[],
    pre: readonly Slot[],
    entry: WalkEntry,
  ): void => {
    walk.path.push(entry);
    const flags = parseFlagsOf(cmd);
    let defaultName = flags.defaultName;
    const assign = (option: Option, flag: string, item: number) => {
      walk.assigned.push({ command: cmd, option, flag, item });
      defaultName = defaultSwitchOf(option) ?? defaultName;
    };
    for (const option of options.preset?.(cmd) ?? [])
      defaultName = defaultSwitchOf(option) ?? defaultName;

    const operands: Slot[] = [];
    const unknown: Slot[] = [];
    let dest = operands;
    let variadic = false;
    let bare = false;
    let first: { item: number; open: boolean } | undefined;
    let group: { arg: string; item: number } | undefined;
    let k = 0;
    const rest = (parsed: boolean): Slot[] =>
      list.slice(k).map((item) => ({ item, parsed }));

    while (k < list.length || group) {
      let arg: string;
      let item: number;
      if (group) {
        ({ arg, item } = group);
        group = undefined;
      } else {
        item = list[k++] as number;
        if (isGap(item)) {
          if (variadic || bare) terminators.set(item, cmd);
          variadic = false;
          bare = false;
          continue;
        }
        arg = (items[item] as WalkItem).text;
      }
      const open = variadic || bare;
      bare = false;

      if (arg === '--') {
        first ??= { item, open };
        if (dest === unknown) dest.push({ item, parsed: true });
        dest.push(...rest(false));
        k = list.length;
        break;
      }
      if (variadic && canBeValue(cmd, arg)) continue;
      variadic = false;

      if (maybeOption(arg)) {
        const option = findOption(cmd, arg);
        if (option) {
          if (option.required) {
            const value = list[k++];
            if (value === undefined) {
              walk.incomplete = true;
              return;
            }
            if (isGap(value))
              throw new NormalizeArgvError(
                `missing value for ${arg} (the next token, '${(items[value] as WalkItem).text}', is a qualified option)`,
              );
          } else if (option.optional) {
            const value = list[k];
            if (
              value !== undefined &&
              !isGap(value) &&
              canBeValue(cmd, (items[value] as WalkItem).text)
            )
              k++;
            else bare = true;
          }
          assign(option, arg, item);
          variadic = option.variadic;
          continue;
        }
      }

      if (arg.length > 2 && arg.startsWith('-') && arg[1] !== '-') {
        const flag = `-${arg[1] as string}`;
        const option = findOption(cmd, flag);
        if (option) {
          assign(option, flag, item);
          if (!(option.required || (option.optional && flags.combine)))
            group = { arg: `-${arg.slice(2)}`, item };
          continue;
        }
      }

      if (/^--[^=]+=/.test(arg)) {
        const flag = arg.slice(0, arg.indexOf('='));
        const option = findOption(cmd, flag);
        if (option && (option.required || option.optional)) {
          assign(option, flag, item);
          continue;
        }
      }

      if (
        dest === operands &&
        maybeOption(arg) &&
        !(cmd.commands.length === 0 && negativeNumberArg(cmd, arg))
      )
        dest = unknown;

      if (flags.positional && operands.length === 0 && unknown.length === 0) {
        if (findCommand(cmd, arg)) {
          first ??= { item, open };
          operands.push({ item, parsed: true });
          unknown.push(...rest(true));
          k = list.length;
          break;
        }
        if (arg === helpCommandOf(cmd)?.name()) {
          first ??= { item, open };
          operands.push({ item, parsed: true }, ...rest(false));
          k = list.length;
          break;
        }
        if (defaultName !== undefined) {
          first ??= { item, open };
          unknown.push({ item, parsed: true }, ...rest(true));
          k = list.length;
          break;
        }
      }

      first ??= { item, open };
      if (flags.passThrough) {
        dest.push({ item, parsed: true }, ...rest(false));
        k = list.length;
        break;
      }
      dest.push({ item, parsed: true });
    }

    // Commander's _parseCommand.
    const ops = [...pre, ...operands].filter((s) => !isGap(s.item));
    const unk = unknown;
    const head = ops[0];
    const sub = findCommand(cmd, textOf(head));
    if (sub && head) {
      level(
        sub,
        unk.map((s) => s.item),
        ops.slice(1),
        {
          command: sub,
          kind: 'name',
          at: head.item,
          takesOptions: head.parsed,
          terminatorBefore: false,
        },
      );
      return;
    }
    const helpCommand = helpCommandOf(cmd);
    if (helpCommand && textOf(head) === helpCommand.name()) {
      walk.help = findCommand(cmd, textOf(ops[1])) ?? cmd;
      return;
    }
    if (defaultName !== undefined) {
      const target = findCommand(cmd, defaultName);
      if (!target) return; // Commander reports the unknown default itself.
      if (first && pre.length === 0) {
        if (isHelpFlag(cmd, (items[first.item] as WalkItem).text)) {
          walk.help = cmd;
          return;
        }
        const from = first.item;
        const all = [...operands, ...unknown]
          .map((s) => s.item)
          .filter((item) => item > from);
        level(target, [from, ...all.sort((a, b) => a - b)], [], {
          command: target,
          kind: 'written',
          at: from,
          takesOptions: true,
          terminatorBefore: first.open,
        });
        return;
      }
      level(
        target,
        unk.map((s) => s.item),
        ops,
        {
          command: target,
          kind: 'implicit',
          at: undefined,
          takesOptions: false,
          terminatorBefore: false,
        },
      );
      return;
    }
    if (unk.some((s) => !isGap(s.item) && isHelpFlag(cmd, textOf(s) ?? '')))
      walk.help = cmd;
    walk.args = [...ops, ...unk].map((s) => s.item).filter((i) => !isGap(i));
  };

  level(
    root,
    items.map((_, i) => i),
    [],
    {
      command: root,
      kind: 'root',
      at: undefined,
      takesOptions: true,
      terminatorBefore: false,
    },
  );
  return walk;
};
