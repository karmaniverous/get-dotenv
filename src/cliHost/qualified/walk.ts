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
  type ParseFlags,
  parseFlagsOf,
  takesValue,
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
  /** The claimed qualified name as typed, without any `=value`, for
   *  messages (a value never appears in an error). */
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

/**
 * The command whose help Commander renders for a plain (already normalized)
 * argv, if the argv asks for help.
 *
 * @param root - The host root.
 * @param argv - The user arguments, e.g. the root's `rawArgs` during a
 *   parse.
 * @returns The command, or `undefined`.
 */
export const helpTargetOf = (
  root: CommandUnknownOpts,
  argv: readonly string[],
): CommandUnknownOpts | undefined =>
  walkArgv(
    root,
    argv.map((text): WalkItem => ({ kind: 'token', text })),
  ).help;

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

/** The first token a command did not take as an option. */
interface FirstOperand {
  item: number;
  /** Whether an optional or variadic value was still open before it. */
  open: boolean;
}

/** One command's `parseOptions` loop: its cursor and what it collected. */
interface LevelParse {
  cmd: CommandUnknownOpts;
  /** The command's parse flags. */
  flags: ParseFlags;
  list: readonly number[];
  /** The next index into `list`. */
  k: number;
  /** The default subcommand, as switched by the options taken so far. */
  defaultName: string | undefined;
  operands: Slot[];
  unknown: Slot[];
  /** Where an operand goes: `operands` until the first unknown option. */
  dest: Slot[];
  /** A variadic run is open. */
  variadic: boolean;
  /** An optional option was taken bare: its value is still open. */
  bare: boolean;
  first: FirstOperand | undefined;
  /** The rest of a combined short-flag group, still to parse. */
  group: { arg: string; item: number } | undefined;
}

/** The walk over one argv: Commander's parse, replayed command by command. */
class Walker {
  private readonly terminators = new Map<number, CommandUnknownOpts>();

  readonly walk: Walk = {
    path: [],
    terminators: this.terminators,
    assigned: [],
    help: undefined,
    args: [],
    incomplete: false,
  };

  constructor(
    private readonly items: readonly WalkItem[],
    private readonly options: WalkOptions,
  ) {}

  private isGap(item: number): boolean {
    return this.items[item]?.kind === 'gap';
  }

  private textAt(item: number): string {
    return (this.items[item] as WalkItem).text;
  }

  private textOf(slot: Slot | undefined): string | undefined {
    return slot === undefined ? undefined : this.items[slot.item]?.text;
  }

  /** Enter a command: run its parse loop, then Commander's dispatch. */
  level(
    cmd: CommandUnknownOpts,
    list: readonly number[],
    pre: readonly Slot[],
    entry: WalkEntry,
  ): void {
    this.walk.path.push(entry);
    const flags = parseFlagsOf(cmd);
    let defaultName = flags.defaultName;
    for (const option of this.options.preset?.(cmd) ?? [])
      defaultName = defaultSwitchOf(option) ?? defaultName;
    const p: LevelParse = {
      cmd,
      flags,
      list,
      k: 0,
      defaultName,
      operands: [],
      unknown: [],
      dest: [],
      variadic: false,
      bare: false,
      first: undefined,
      group: undefined,
    };
    p.dest = p.operands;
    if (this.parseOptions(p)) this.dispatch(p, pre);
  }

  /** The tokens from the cursor on, as slots; the loop ends after them. */
  private rest(p: LevelParse, parsed: boolean): Slot[] {
    const slots = p.list.slice(p.k).map((item) => ({ item, parsed }));
    p.k = p.list.length;
    return slots;
  }

  /** Record a plain option taken by the command being parsed. */
  private assign(p: LevelParse, option: Option, flag: string, item: number) {
    this.walk.assigned.push({ command: p.cmd, option, flag, item });
    p.defaultName = defaultSwitchOf(option) ?? p.defaultName;
  }

  /**
   * Commander's `parseOptions` loop for one command.
   *
   * @returns `false` when a required value is missing at the end of the
   *   argv (Commander stops before dispatch).
   */
  private parseOptions(p: LevelParse): boolean {
    while (p.k < p.list.length || p.group) {
      let arg: string;
      let item: number;
      if (p.group) {
        ({ arg, item } = p.group);
        p.group = undefined;
      } else {
        item = p.list[p.k++] as number;
        if (this.isGap(item)) {
          if (p.variadic || p.bare) this.terminators.set(item, p.cmd);
          p.variadic = false;
          p.bare = false;
          continue;
        }
        arg = this.textAt(item);
      }
      const open = p.variadic || p.bare;
      p.bare = false;

      if (arg === '--') {
        p.first ??= { item, open };
        if (p.dest === p.unknown) p.dest.push({ item, parsed: true });
        p.dest.push(...this.rest(p, false));
        break;
      }
      if (p.variadic && canBeValue(p.cmd, arg)) continue;
      p.variadic = false;

      const taken = this.takeOption(p, arg, item);
      if (taken === 'incomplete') return false;
      if (taken) continue;
      if (this.takeOperand(p, arg, item, open)) break;
    }
    return true;
  }

  /**
   * An option token: a known long or short flag (with its value), a
   * combined short-flag group, or `--flag=value`.
   *
   * @returns Whether the token was taken as an option, or `incomplete`.
   */
  private takeOption(
    p: LevelParse,
    arg: string,
    item: number,
  ): boolean | 'incomplete' {
    const { cmd } = p;
    if (maybeOption(arg)) {
      const option = findOption(cmd, arg);
      if (option) {
        if (option.required) {
          const value = p.list[p.k++];
          if (value === undefined) {
            this.walk.incomplete = true;
            return 'incomplete';
          }
          if (this.isGap(value))
            throw new NormalizeArgvError(
              `missing value for ${arg} (the next token, '${this.textAt(value)}', is a qualified option)`,
            );
        } else if (option.optional) {
          const value = p.list[p.k];
          if (
            value !== undefined &&
            !this.isGap(value) &&
            canBeValue(cmd, this.textAt(value))
          )
            p.k++;
          else p.bare = true;
        }
        this.assign(p, option, arg, item);
        p.variadic = option.variadic;
        return true;
      }
    }

    if (arg.length > 2 && arg.startsWith('-') && arg[1] !== '-') {
      const flag = `-${arg[1] as string}`;
      const option = findOption(cmd, flag);
      if (option) {
        this.assign(p, option, flag, item);
        if (!(option.required || (option.optional && p.flags.combine)))
          p.group = { arg: `-${arg.slice(2)}`, item };
        return true;
      }
    }

    if (/^--[^=]+=/.test(arg)) {
      const flag = arg.slice(0, arg.indexOf('='));
      const option = findOption(cmd, flag);
      if (option && takesValue(option)) {
        this.assign(p, option, flag, item);
        return true;
      }
    }
    return false;
  }

  /**
   * A token that is not an option of the command: an unknown option or an
   * operand, possibly the subcommand, help command or default-subcommand
   * entry that ends the command's own parse.
   *
   * @returns Whether the command's parse loop ends here.
   */
  private takeOperand(
    p: LevelParse,
    arg: string,
    item: number,
    open: boolean,
  ): boolean {
    const { cmd, flags } = p;
    if (
      p.dest === p.operands &&
      maybeOption(arg) &&
      !(cmd.commands.length === 0 && negativeNumberArg(cmd, arg))
    )
      p.dest = p.unknown;

    if (flags.positional && p.operands.length === 0 && p.unknown.length === 0) {
      if (findCommand(cmd, arg)) {
        p.first ??= { item, open };
        p.operands.push({ item, parsed: true });
        p.unknown.push(...this.rest(p, true));
        return true;
      }
      if (arg === helpCommandOf(cmd)?.name()) {
        p.first ??= { item, open };
        p.operands.push({ item, parsed: true }, ...this.rest(p, false));
        return true;
      }
      if (p.defaultName !== undefined) {
        p.first ??= { item, open };
        p.unknown.push({ item, parsed: true }, ...this.rest(p, true));
        return true;
      }
    }

    p.first ??= { item, open };
    if (flags.passThrough) {
      p.dest.push({ item, parsed: true }, ...this.rest(p, false));
      return true;
    }
    p.dest.push({ item, parsed: true });
    return false;
  }

  /** Commander's `_parseCommand`: pick the next command, or stop here. */
  private dispatch(p: LevelParse, pre: readonly Slot[]): void {
    const { cmd, operands, unknown, defaultName } = p;
    const ops = [...pre, ...operands].filter((s) => !this.isGap(s.item));
    const head = ops[0];
    const sub = findCommand(cmd, this.textOf(head));
    if (sub && head) {
      this.level(
        sub,
        unknown.map((s) => s.item),
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
    if (helpCommand && this.textOf(head) === helpCommand.name()) {
      this.walk.help = findCommand(cmd, this.textOf(ops[1])) ?? cmd;
      return;
    }
    if (defaultName !== undefined) {
      this.enterDefault(p, ops, pre, defaultName);
      return;
    }
    if (
      unknown.some(
        (s) => !this.isGap(s.item) && isHelpFlag(cmd, this.textOf(s) ?? ''),
      )
    )
      this.walk.help = cmd;
    this.walk.args = [...ops, ...unknown]
      .map((s) => s.item)
      .filter((i) => !this.isGap(i));
  }

  /**
   * Enter the default subcommand: written in before the first token the
   * command did not take (Decision 30), or implicitly.
   */
  private enterDefault(
    p: LevelParse,
    ops: readonly Slot[],
    pre: readonly Slot[],
    defaultName: string,
  ): void {
    const { cmd, operands, unknown, first } = p;
    const target = findCommand(cmd, defaultName);
    if (!target) return; // Commander reports the unknown default itself.
    if (first && pre.length === 0) {
      if (isHelpFlag(cmd, this.textAt(first.item))) {
        this.walk.help = cmd;
        return;
      }
      const from = first.item;
      const all = [...operands, ...unknown]
        .map((s) => s.item)
        .filter((item) => item > from);
      this.level(target, [from, ...all.sort((a, b) => a - b)], [], {
        command: target,
        kind: 'written',
        at: from,
        takesOptions: true,
        terminatorBefore: first.open,
      });
      return;
    }
    this.level(
      target,
      unknown.map((s) => s.item),
      ops,
      {
        command: target,
        kind: 'implicit',
        at: undefined,
        takesOptions: false,
        terminatorBefore: false,
      },
    );
  }
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
  const walker = new Walker(items, options);
  walker.level(
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
  return walker.walk;
};
