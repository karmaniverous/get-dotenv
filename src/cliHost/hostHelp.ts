/**
 * Host help (spec 4.6, Decision 27): the one help configuration every command
 * of a get-dotenv host renders with, `GetDotenvCli` commands and plain
 * `new Command()` mounts alike.
 *
 * A command's help has these option sections, before its commands:
 * - **Options**: its own options that Commander would show (not hidden; the
 *   implicit `-h, --help` included), except those tagged for a group below.
 *   At the root that is every untagged or `base` root option, with `-h` and
 *   `-V` (#76).
 * - **App options** and **Plugin options — `<ns>`**: options tagged `app` or
 *   `plugin:<ns>` (a command's own plugin tag stays under Options).
 * - **`<owner> options (anywhere)`**: one section per ancestor, root first,
 *   listing the ancestor's visible options by their qualified names (the
 *   names a user can type at this point, Decision 27).
 *
 * Every option line with a qualified name ends with `(anywhere: --<name>)`.
 * The annotation is added here, at render time, so it survives
 * `evaluateDynamicOptions`, which rewrites dynamic options' descriptions.
 * Qualified names come from the host's qualified-name table; before the
 * first `parseAsync` builds it, help has no annotations and no inherited
 * sections.
 *
 * Hidden options (root option visibility, terminators) appear in no section,
 * and a subcommand whose options are all hidden is listed without
 * `[options]`.
 */
import {
  type CommandUnknownOpts,
  Help,
  type HelpConfiguration,
  type Option,
} from '@commander-js/extra-typings';

import { commandTree } from './commandTree';
import { getRootCommand } from './getRootCommand';
import { GROUP_TAG } from './groups';
import {
  commandLabel,
  commandPathOf,
  type QualifiedNameEntry,
  type QualifiedNameTable,
  qualifiedNameTableOf,
} from './qualified';

/** Commander's own help, for the parts the host doesn't change. */
const BASE = new Help();

const OPTIONS_HEADING = 'Options:';
const OPTIONS_TERM = ' [options]';

/** One help section: a heading and its `[term, description]` rows. */
interface Section {
  heading: string;
  rows: Array<[string, string]>;
}

/** Table entries by option, per table. */
const ENTRIES = new WeakMap<
  QualifiedNameTable,
  Map<Option, QualifiedNameEntry>
>();

/** The table of `cmd`'s host and its entries by option, if built. */
const qualifiedOf = (
  cmd: CommandUnknownOpts,
):
  | { table: QualifiedNameTable; byOption: Map<Option, QualifiedNameEntry> }
  | undefined => {
  const table = qualifiedNameTableOf(getRootCommand(cmd));
  if (!table) return undefined;
  let byOption = ENTRIES.get(table);
  if (!byOption) {
    byOption = new Map();
    for (const e of table.entries.values())
      if (e.kind === 'option') byOption.set(e.option, e);
    ENTRIES.set(table, byOption);
  }
  return { table, byOption };
};

const hasShort = (option: Option): boolean =>
  /(^|\s|,)-[A-Za-z]/.test(option.flags);

/** Short-flagged options first, then by flags. */
const sortOptions = (options: Option[]): Option[] =>
  options.sort(
    (a, b) =>
      Number(hasShort(b)) - Number(hasShort(a)) ||
      a.flags.localeCompare(b.flags),
  );

/**
 * The options Commander would show for `cmd` (not hidden, the implicit help
 * option included), sorted.
 *
 * @param cmd - The command.
 * @returns Its visible options.
 */
const visibleOptions = (cmd: CommandUnknownOpts): Option[] =>
  sortOptions(BASE.visibleOptions(cmd));

/** The section heading an option of `cmd` is listed under. */
const headingOf = (cmd: CommandUnknownOpts, option: Option): string => {
  const tag = GROUP_TAG.get(option);
  if (tag === 'app') return 'App options:';
  if (tag?.startsWith('plugin:')) {
    const ns = tag.slice('plugin:'.length) || '(unknown)';
    if (ns !== cmd.name()) return `Plugin options — ${ns}:`;
  }
  return option.helpGroupHeading ?? OPTIONS_HEADING;
};

/** Section order: Options, App options, plugin groups by name, the rest. */
const rank = (heading: string): number =>
  heading === OPTIONS_HEADING
    ? 0
    : heading === 'App options:'
      ? 1
      : heading.startsWith('Plugin options')
        ? 2
        : 3;

/**
 * An option's description with its qualified name, `(anywhere: --name)`.
 *
 * @param description - The rendered description.
 * @param entry - The option's table entry, if it has a qualified name.
 * @returns The annotated description.
 */
const annotate = (
  description: string,
  entry: QualifiedNameEntry | undefined,
): string => {
  if (!entry) return description;
  const note = `(anywhere: ${entry.name})`;
  return description ? `${description} ${note}` : note;
};

/** The value placeholder of an option's flags (` <string>`), if any. */
const placeholderOf = (flags: string): string =>
  /\s[<[].*$/.exec(flags)?.[0] ?? '';

/** `cmd`'s own option sections. */
const ownSections = (cmd: CommandUnknownOpts, helper: Help): Section[] => {
  const byOption = qualifiedOf(cmd)?.byOption;
  const sections = new Map<string, Section>();
  for (const option of helper.visibleOptions(cmd)) {
    const heading = headingOf(cmd, option);
    const section = sections.get(heading) ?? { heading, rows: [] };
    section.rows.push([
      helper.styleOptionTerm(helper.optionTerm(option)),
      helper.styleOptionDescription(
        annotate(helper.optionDescription(option), byOption?.get(option)),
      ),
    ]);
    sections.set(heading, section);
  }
  return [...sections.values()].sort(
    (a, b) =>
      rank(a.heading) - rank(b.heading) ||
      (rank(a.heading) === 2 ? a.heading.localeCompare(b.heading) : 0),
  );
};

/** One section per ancestor of `cmd`, root first: its qualified options. */
const inheritedSections = (
  cmd: CommandUnknownOpts,
  helper: Help,
): Section[] => {
  const q = qualifiedOf(cmd);
  if (!q) return [];
  const ancestors: CommandUnknownOpts[] = [];
  for (let a = cmd.parent; a; a = a.parent) ancestors.unshift(a);
  return ancestors.flatMap((ancestor): Section[] => {
    const rows = visibleOptions(ancestor)
      .flatMap((option): Array<[string, string]> => {
        const entry = q.byOption.get(option);
        return entry
          ? [
              [
                `${entry.name}${placeholderOf(option.flags)}`,
                helper.optionDescription(option),
              ],
            ]
          : [];
      })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([term, description]): [string, string] => [
        helper.styleOptionTerm(term),
        helper.styleOptionDescription(description),
      ]);
    const owner = commandLabel(q.table.alias, commandPathOf(ancestor));
    return rows.length > 0
      ? [{ heading: `${owner} options (anywhere):`, rows }]
      : [];
  });
};

/** `cmd`'s subcommands, grouped by their help group. */
const commandSections = (cmd: CommandUnknownOpts, helper: Help): Section[] => {
  const sections = new Map<string, Section>();
  for (const sub of helper.visibleCommands(cmd)) {
    const heading = sub.helpGroup() || 'Commands:';
    const section = sections.get(heading) ?? { heading, rows: [] };
    section.rows.push([
      helper.styleSubcommandTerm(helper.subcommandTerm(sub)),
      helper.styleSubcommandDescription(helper.subcommandDescription(sub)),
    ]);
    sections.set(heading, section);
  }
  return [...sections.values()];
};

/**
 * Commander's subcommand term, without `[options]` when every option of the
 * subcommand is hidden (terminators included).
 *
 * @param sub - The subcommand being listed.
 * @returns Its term.
 */
const subcommandTerm = (sub: CommandUnknownOpts): string => {
  const term = BASE.subcommandTerm(sub);
  return sub.options.every((o) => o.hidden)
    ? term.replace(OPTIONS_TERM, '')
    : term;
};

/**
 * The host's help text for `cmd`. Ends with a blank line.
 *
 * @param cmd - The command.
 * @param helper - The configured help.
 * @returns The help text.
 */
const formatHelp = (cmd: CommandUnknownOpts, helper: Help): string => {
  const argumentRows = helper
    .visibleArguments(cmd)
    .map((argument): [string, string] => [
      helper.styleArgumentTerm(helper.argumentTerm(argument)),
      helper.styleArgumentDescription(helper.argumentDescription(argument)),
    ]);
  const sections: Section[] = [
    { heading: 'Arguments:', rows: argumentRows },
    ...ownSections(cmd, helper),
    ...inheritedSections(cmd, helper),
    ...commandSections(cmd, helper),
  ];
  const termWidth = Math.max(
    0,
    ...sections.flatMap((s) => s.rows.map(([t]) => helper.displayWidth(t))),
  );
  const helpWidth = helper.helpWidth ?? 80;
  const description = helper.commandDescription(cmd);
  const lines = [
    `${helper.styleTitle('Usage:')} ${helper.styleUsage(helper.commandUsage(cmd))}`,
    '',
    ...(description.length > 0
      ? [
          helper.boxWrap(
            helper.styleCommandDescription(description),
            helpWidth,
          ),
          '',
        ]
      : []),
    ...sections.flatMap((s) =>
      helper.formatItemList(
        s.heading,
        s.rows.map(([term, desc]) =>
          helper.formatItem(term, termWidth, desc, helper),
        ),
        helper,
      ),
    ),
  ];
  return `${lines.join('\n')}\n`;
};

/** The host's help settings. */
const HOST_HELP: HelpConfiguration = {
  visibleOptions,
  subcommandTerm,
  formatHelp,
};

/**
 * Give `cmd` the host's help settings, keeping its other help settings.
 *
 * @param cmd - A command of a get-dotenv host.
 */
export const configureHostHelp = (cmd: CommandUnknownOpts): void => {
  cmd.configureHelp({ ...cmd.configureHelp(), ...HOST_HELP });
};

/**
 * Give every command under `root` (plugin mounts and plain
 * `new Command()` mounts included) the host's help settings.
 *
 * @param root - The host root.
 */
export const configureHostHelpTree = (root: CommandUnknownOpts): void => {
  for (const cmd of commandTree(root)) configureHostHelp(cmd);
};
