/**
 * The cmd plugin's parent-level option alias (e.g. `-c, --cmd`).
 *
 * The alias is not a second implementation of `cmd`: giving it routes the
 * parse to the cmd mount (as its parent's default subcommand) unless an
 * explicit subcommand follows, and the cmd action runs the alias value.
 */
import { type CommandUnknownOpts, Option } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost';

import type { CmdOptionAlias, CmdPluginOptions } from './types';

/**
 * The alias spec in object form.
 *
 * @param optionAlias - The factory's `optionAlias` (flags string or object).
 * @returns The spec, or `undefined` when no alias is configured.
 */
export const resolveAliasSpec = (
  optionAlias: CmdPluginOptions['optionAlias'],
): CmdOptionAlias | undefined =>
  typeof optionAlias === 'string'
    ? { flags: optionAlias, expand: true }
    : optionAlias;

/** The alias as the cmd action sees it. */
export interface CmdAlias {
  /** The alias's long flag (e.g. `--cmd`), for messages. */
  flag: string;
  /**
   * The factory's expansion setting (`optionAlias.expand`); config
   * `plugins.cmd.expand` beats it.
   */
  expand: boolean | undefined;
  /**
   * The alias value given on `parent` in this parse, joined with spaces.
   *
   * @param parent - The cmd mount's parent command.
   * @returns The value, or `undefined` when the alias was not given.
   */
  valueOn: (parent: CommandUnknownOpts) => string | undefined;
}

/**
 * Commander's default-subcommand slot: what `addCommand(cmd, { isDefault })`
 * sets. Commander has no public API to choose the default for one parse.
 *
 * @remarks
 * `_defaultCommandName` is private Commander API, checked against commander
 * 15.1.0 (and `@commander-js/extra-typings` 15.1.0). The guard test
 * `alias.commanderPrivate.test.ts` fails if an upgrade renames or removes the
 * field, or stops dispatching a bare parse through it.
 */
interface DefaultCommandSlot {
  _defaultCommandName: string | null;
}

/**
 * Attach the alias option to the cmd mount's parent.
 *
 * A parse that gives the alias dispatches to the cmd mount when no explicit
 * subcommand is in subcommand position (Commander's own subcommand lookup,
 * so the alias's own values never count as one). The parent's default
 * subcommand is restored as soon as the parse dispatches.
 *
 * @param cmdMount - The cmd plugin's mount.
 * @param spec - The alias spec.
 * @returns The alias for the cmd action.
 */
export const attachCmdAlias = (
  cmdMount: GetDotenvCliPublic,
  spec: CmdOptionAlias,
): CmdAlias => {
  const parent =
    (cmdMount.parent as unknown as GetDotenvCliPublic | null) ?? cmdMount;
  const option = new Option(
    spec.flags,
    spec.description ??
      'alias of cmd subcommand; provide command tokens (variadic)',
  );
  parent.addOption(option);
  parent.setOptionGroup(option, 'plugin:cmd');

  const slot = parent as unknown as DefaultCommandSlot;
  let saved: { name: string | null } | undefined;
  parent.on(`option:${option.name()}`, () => {
    saved ??= { name: slot._defaultCommandName };
    slot._defaultCommandName = cmdMount.name();
  });
  parent.hook('preSubcommand', () => {
    if (saved === undefined) return;
    slot._defaultCommandName = saved.name;
    saved = undefined;
  });

  const key = option.attributeName();
  return {
    flag: option.long ?? `--${key}`,
    expand: spec.expand,
    valueOn: (p) => {
      const value: unknown = p.opts()[key];
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && value.length > 0)
        return value.map(String).join(' ');
      return undefined;
    },
  };
};
