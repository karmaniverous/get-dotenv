/**
 * Terminator names (Decision 28).
 *
 * Every command gets a hidden, no-op boolean option `--<alias>-<hash>`. The
 * argv normalizer writes it after a reinserted bare optional option, so the
 * option takes no value from the token that follows. The hash is a
 * deterministic function of the alias and the command path, so the same tree
 * gives the same names on every machine and every run.
 */
import { createHash } from 'node:crypto';

/** Characters kept from the base-36 digest. */
const HASH_LENGTH = 5;

/**
 * The `<hash>` of a terminator name (Decision 28, steps 1–5).
 *
 * 1. The input is the alias followed by the command path, joined by single
 *    spaces (`vc`, `vc aws`).
 * 2. Take its SHA-256 as 64 hex digits.
 * 3. Read the hex as one unsigned integer and write it in base 36.
 * 4. Drop the leading digits, so the result starts with a letter.
 * 5. Keep the first 5 characters.
 *
 * @param input - The space-joined alias and command path.
 * @returns The 5-character hash.
 */
export const terminatorHash = (input: string): string => {
  const hex = createHash('sha256').update(input, 'utf8').digest('hex');
  return BigInt(`0x${hex}`)
    .toString(36)
    .replace(/^\d+/, '')
    .slice(0, HASH_LENGTH);
};

/**
 * The terminator flag of a command (Decision 28).
 *
 * The name is `--<alias>-<hash>`, where `<hash>` is taken from the alias and
 * the command path joined by single spaces: `terminatorName('vc', [])` is
 * `--vc-q1r1s` and `terminatorName('vc', ['aws'])` is `--vc-c1ryg`.
 *
 * A host registers one terminator, hidden from help, on every command when it
 * builds its qualified-name table (the first `parseAsync`). Terminators have
 * no qualified name, are the only plain options allowed to start with
 * `<alias>-`, and never appear in `opts()` or the options bag.
 *
 * @param alias - The CLI alias: the root command's name, e.g. `vc`.
 * @param path - The command names below the root, down to the command
 *   (empty for the root). The alias is not part of it.
 * @returns The terminator flag, e.g. `--vc-q1r1s`.
 *
 * @example
 * ```ts
 * import { terminatorName } from '@karmaniverous/get-dotenv/cliHost';
 *
 * terminatorName('vc', ['aws']); // '--vc-c1ryg'
 * ```
 */
export const terminatorName = (
  alias: string,
  path: readonly string[],
): string => `--${alias}-${terminatorHash([alias, ...path].join(' '))}`;
