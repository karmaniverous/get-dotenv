/**
 * The cmd plugin's parent-level option alias (e.g. `-c, --cmd`).
 */
import { camel } from 'radash';

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

/**
 * The options-bag key of the alias option: its long flag, camel-cased
 * (`--cmd` gives `cmd`; `--cmd` when the flags have no long flag).
 *
 * @param flags - The alias option's flags.
 * @returns The key.
 */
export const aliasOptionKey = (flags: string): string => {
  const long = flags.split(/[ ,|]+/).find((f) => f.startsWith('--')) ?? '--cmd';
  return camel(long.replace(/^--/, ''));
};
