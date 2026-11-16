/**
 * The user arguments of a parse (spec 4.4, `{ from }`).
 *
 * Mirrors Commander 15's `_prepareUserArgs`: the same leading entries are
 * dropped for the same `from`, and with no argv and no `from` the same
 * auto-detection applies. The host normalizes only the user arguments and
 * hands them to Commander with `{ from: 'user' }`.
 */

/** Commander's documented argv conventions. */
type ArgvFrom = 'node' | 'electron' | 'user';

/** Where the user arguments start, including Commander's internal `eval`. */
type ArgvSource = ArgvFrom | 'eval';

/** `node` options after which the user arguments follow the executable. */
const EVAL_FLAGS = ['-e', '--eval', '-p', '--print'];

/**
 * The argv convention Commander would use.
 *
 * @param explicit - Whether an argv was given to the parse.
 * @param from - The `from` given to the parse, if any.
 * @returns The convention.
 */
const sourceOf = (
  explicit: boolean,
  from: ArgvFrom | undefined,
): ArgvSource => {
  if (from !== undefined) return from;
  if (explicit) return 'node';
  if (EVAL_FLAGS.some((f) => process.execArgv.includes(f))) return 'eval';
  const versions = process.versions as Record<string, string | undefined>;
  return typeof versions.electron === 'string' ? 'electron' : 'node';
};

/**
 * The user arguments of a parse, as Commander 15 extracts them.
 *
 * - `'node'` (the default for an explicit argv): drops two entries.
 * - `'user'`: drops none.
 * - `'electron'`: drops two when `process.defaultApp` is set, else one.
 * - argv omitted and no `from`: reads `process.argv`; `node -e`/`-p`
 *   (`--eval`, `--print`) drops one and wins over Electron detection
 *   (`process.versions.electron`).
 *
 * @param argv - The argv given to the parse; `process.argv` when omitted.
 * @param parseOptions - Commander's parse options (`from`).
 * @returns The user arguments (a new array).
 * @throws On a non-array argv or an unknown `from`, as Commander does.
 */
export const userArgsOf = (
  argv: readonly string[] | undefined,
  parseOptions?: { from?: ArgvFrom | undefined },
): string[] => {
  if (argv !== undefined && !Array.isArray(argv))
    throw new Error('first parameter to parse must be array or undefined');
  const source = sourceOf(argv !== undefined, parseOptions?.from);
  const all: readonly string[] = argv ?? process.argv;
  switch (source) {
    case 'node':
      return all.slice(2);
    case 'user':
      return all.slice();
    case 'eval':
      return all.slice(1);
    case 'electron':
      return (process as { defaultApp?: boolean }).defaultApp
        ? all.slice(2)
        : all.slice(1);
    default:
      throw new Error(`unexpected parse option { from: '${String(source)}' }`);
  }
};
