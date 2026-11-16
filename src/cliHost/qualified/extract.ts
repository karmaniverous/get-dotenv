/**
 * Extraction (spec 4.4, steps 1 and 2): claim every qualified token, with
 * its value, anywhere in argv (including after `--` and inside a
 * pass-through command's arguments), and drop typed terminators.
 *
 * A claimed token, with its separate value if it takes one, leaves a gap at
 * its position (Decision 34). A dropped terminator leaves nothing (Decision
 * 31).
 */
import { takesValue } from './commander';
import { NormalizeArgvError } from './errors';
import type { QualifiedNameEntry, QualifiedNameTable } from './table';
import type { WalkItem } from './walk';

/** One claimed qualified option. */
export interface Claim {
  /** Its table entry (an option entry: owner and option). */
  entry: QualifiedNameEntry;
  /** The qualified name as typed, without any `=value`. */
  name: string;
  /** Its value; `undefined` for a boolean or a bare optional option. */
  value: string | undefined;
  /** The item index of its gap. */
  gap: number;
}

/** What extraction leaves. */
export interface Extraction {
  /** The remaining tokens, with a gap per claimed token. */
  items: WalkItem[];
  /** The claims, in argv order. */
  claims: Claim[];
}

/**
 * Claim the qualified tokens and drop the terminators.
 *
 * @param argv - The user arguments.
 * @param table - The host's qualified-name table.
 * @returns The remaining items and the claims.
 * @throws NormalizeArgvError on an unknown `--<alias>-*` token, a value given
 *   to a boolean, or a missing value.
 */
export const extractQualified = (
  argv: readonly string[],
  table: QualifiedNameTable,
): Extraction => {
  const prefix = `--${table.alias}-`;
  const items: WalkItem[] = [];
  const claims: Claim[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string;
    if (!token.startsWith(prefix)) {
      items.push({ kind: 'token', text: token });
      continue;
    }
    const eq = token.indexOf('=');
    const name = eq < 0 ? token : token.slice(0, eq);
    const inline = eq < 0 ? undefined : token.slice(eq + 1);
    const entry = table.entries.get(name);
    if (!entry)
      throw new NormalizeArgvError(
        `Unknown option '${name}' (the '${prefix}' prefix is reserved for ${table.alias})`,
      );
    if (entry.kind === 'terminator' || !takesValue(entry.option)) {
      if (inline !== undefined)
        throw new NormalizeArgvError(`'${name}' takes no value`);
      if (entry.kind === 'terminator') continue;
    }
    let value = inline;
    if (value === undefined && entry.option.required) {
      const next = argv[i + 1];
      if (entry.option.variadic || next === undefined || next.startsWith('--'))
        throw new NormalizeArgvError(`missing value for ${name}`);
      value = next;
      i++;
    }
    items.push({ kind: 'gap', text: token });
    claims.push({
      entry,
      name,
      value,
      gap: items.length - 1,
    });
  }
  return { items, claims };
};
