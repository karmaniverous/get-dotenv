/**
 * Keep terminators out of help (Decision 28).
 *
 * Commander already leaves hidden options out of a command's option list, but
 * its subcommand term (`cmd [options] [command...]` in the parent's command
 * list) adds `[options]` whenever the subcommand has any option, hidden ones
 * included. A command whose only option is its terminator keeps the term it
 * had before the terminator was registered.
 */
import {
  type CommandUnknownOpts,
  Help,
  type HelpConfiguration,
} from '@commander-js/extra-typings';

import { isTerminatorOption } from './register';

const OPTIONS_TERM = ' [options]';

/**
 * Commander's subcommand term, without `[options]` when every option of the
 * subcommand is a terminator.
 *
 * @param sub - The subcommand being listed.
 * @returns Its term.
 */
const subcommandTerm = (sub: CommandUnknownOpts): string => {
  const term = new Help().subcommandTerm(sub);
  return sub.options.every((o) => isTerminatorOption(o))
    ? term.replace(OPTIONS_TERM, '')
    : term;
};

/**
 * Make `cmd`'s help list its subcommands without counting terminators. Keeps
 * the rest of the command's help configuration.
 *
 * @param cmd - A command whose subcommands may carry terminators.
 */
export const hideTerminatorsInSubcommandTerms = (
  cmd: CommandUnknownOpts,
): void => {
  const config: HelpConfiguration = cmd.configureHelp();
  cmd.configureHelp({ ...config, subcommandTerm });
};
