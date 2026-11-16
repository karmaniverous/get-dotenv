/**
 * `GetDotenvCli.parseAsync` (spec 4.4): install, table, normalization, the
 * top-level help check, then Commander's parse of the normalized argv.
 *
 * Every command in the installed tree gets the host's help settings (spec
 * 4.6). Every step runs inside the caller's error boundary (#62). A normalization
 * error is reported through Commander's `error()`: exit code 1, honouring
 * `exitOverride()`. Under `--debug` (the root's, plain or qualified) or
 * `GETDOTENV_DEBUG`, one `[getdotenv:argv]` line on stderr shows the typed
 * and the normalized argv.
 */
import type { Option } from '@commander-js/extra-typings';

import type { GetDotenvCli } from './GetDotenvCli';
import { configureHostHelpTree } from './hostHelp';
import {
  ensureQualifiedNameTable,
  type Normalization,
  NormalizeArgvError,
  normalizeQualified,
} from './qualified';
import { renderTopLevelHelp } from './topLevelHelp';
import { userArgsOf } from './userArgs';

/** The argv the error boundary reads for the stack-trace rule. */
interface RunArgv {
  argv: readonly string[];
  normalized: boolean;
}

const RUN_ARGV = new WeakMap<GetDotenvCli, RunArgv>();

/**
 * Record the argv of the run in progress (typed until normalization
 * succeeds, normalized after).
 *
 * @param program - The host root.
 * @param argv - The user arguments.
 * @param normalized - Whether they are normalized.
 */
export const recordRunArgv = (
  program: GetDotenvCli,
  argv: readonly string[],
  normalized: boolean,
): void => {
  RUN_ARGV.set(program, { argv, normalized });
};

/**
 * The stack-trace rule (spec 3.10.5): whether the run asked for `--debug`.
 * Once normalization has succeeded it reads the normalized argv, where
 * `--<alias>-debug` is written as `--debug`; before that (install and table
 * errors) it reads the typed argv, where either form counts.
 *
 * @param program - The host root.
 * @returns Whether the run's argv asks for `--debug`.
 */
export const runArgvRequestsDebug = (program: GetDotenvCli): boolean => {
  const run = RUN_ARGV.get(program);
  if (!run) return false;
  if (run.argv.includes('--debug')) return true;
  return !run.normalized && run.argv.includes(`--${program.name()}-debug`);
};

/** Whether the walk gave the root a `--debug` (plain or qualified). */
const rootDebug = (program: GetDotenvCli, n: Normalization): boolean => {
  const isRootDebug = ({
    command,
    option,
  }: {
    command: unknown;
    option: Option;
  }): boolean =>
    command === program && !option.negate && option.attributeName() === 'debug';
  return (
    n.walk.assigned.some(isRootDebug) ||
    n.claims.some((c) => isRootDebug(c.entry))
  );
};

/**
 * Parse a host's argv.
 *
 * @param program - The host root.
 * @param argv - The argv given to `parseAsync`.
 * @param parseOptions - Commander's parse options (`from`).
 * @param parse - Commander's own `parseAsync` of user arguments.
 */
export const parseHost = async (
  program: GetDotenvCli,
  argv: readonly string[] | undefined,
  parseOptions: { from?: 'node' | 'electron' | 'user' | undefined } | undefined,
  parse: (userArgs: string[]) => Promise<unknown>,
): Promise<void> => {
  const typed = userArgsOf(argv, parseOptions);
  recordRunArgv(program, typed, false);
  await program.install();
  ensureQualifiedNameTable(program);
  // Every command renders host help, plain new Command() mounts included.
  configureHostHelpTree(program);
  let n: Normalization;
  try {
    n = normalizeQualified(program, typed);
  } catch (e) {
    if (e instanceof NormalizeArgvError) program.error(e.message);
    throw e;
  }
  recordRunArgv(program, n.argv, true);
  if (process.env.GETDOTENV_DEBUG || rootDebug(program, n))
    process.stderr.write(
      `[getdotenv:argv] typed: ${JSON.stringify(typed)} normalized: ${JSON.stringify(n.argv)}\n`,
    );
  if (n.walk.help === program) {
    await renderTopLevelHelp(program);
    return;
  }
  await parse(n.argv);
};
