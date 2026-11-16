/**
 * Argv normalization (spec 4.4): rewrite the typed argv so that Commander,
 * parsing it unchanged, gives every qualified option to the command that
 * owns it, and so that a default subcommand an option or `-h` would have
 * skipped is written in (Decision 30).
 *
 * Steps: extract the claimed qualified tokens and drop typed terminators
 * (`extract.ts`), walk the rest with Commander's rules (`walk.ts`), check
 * each owner is invoked and takes options, reject plain + qualified
 * duplicates, then emit: root-owned options at index 0, every other owner's
 * right after its name token, always as `--<plain>=<value>` (booleans bare,
 * one token per variadic value), and a terminator only where an optional
 * value or a variadic run would otherwise continue.
 */
import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import { canBeValue } from './commander';
import { NormalizeArgvError } from './errors';
import { type Claim, extractQualified } from './extract';
import { commandLabel } from './names';
import { ensureQualifiedNameTable, type QualifiedNameTable } from './table';
import { type Walk, walkArgv, type WalkEntry, type WalkItem } from './walk';

/** A normalized argv with what normalization saw. */
export interface Normalization {
  /** The normalized user arguments. */
  argv: string[];
  /** The walk over the typed argv. */
  walk: Walk;
  /** The claimed qualified options. */
  claims: Claim[];
  /** The host's qualified-name table. */
  table: QualifiedNameTable;
}

/** A terminator slot: kept only if the next token could be a value. */
interface TerminatorSlot {
  terminatorOf: CommandUnknownOpts;
}

type Emitted = string | TerminatorSlot;

/** The long flag a duplicate message names: the positive form. */
const positiveLong = (claim: Claim): string => {
  const { command, option } = claim.entry;
  const attribute = option.attributeName();
  const positive = command.options.find(
    (o) => !o.negate && o.attributeName() === attribute && o.long,
  );
  return (positive ?? option).long ?? claim.name;
};

/** Step 5: every owner is invoked and takes options. */
const checkOwners = (
  claims: readonly Claim[],
  walk: Walk,
  alias: string,
): void => {
  const entries = new Map(walk.path.map((e) => [e.command, e]));
  for (const claim of claims) {
    const label = commandLabel(alias, claim.entry.path);
    const entry = entries.get(claim.entry.command);
    if (!entry)
      throw new NormalizeArgvError(
        `'${claim.name}' applies to '${label}', which is not being invoked.`,
      );
    if (!entry.takesOptions)
      throw new NormalizeArgvError(
        `'${claim.name}' applies to '${label}', which takes no options at this point.`,
      );
  }
};

/** Step 6: no option in both its plain and qualified forms. */
const checkDuplicates = (claims: readonly Claim[], walk: Walk): void => {
  for (const claim of claims) {
    const attribute = claim.entry.option.attributeName();
    const plain = walk.assigned.find(
      (a) =>
        a.command === claim.entry.command &&
        a.option.attributeName() === attribute,
    );
    if (plain)
      throw new NormalizeArgvError(
        `'${positiveLong(claim)}' given twice (as ${plain.flag} and ${claim.name})`,
      );
  }
};

/**
 * The tokens inserted for one owner, in claim order: a repeated
 * single-value option (or `--no-` pair) once, with its last value, at its
 * first position; every variadic value as its own token (Decision 26).
 */
const insertionsOf = (
  claims: readonly Claim[],
  owner: CommandUnknownOpts,
): Emitted[] => {
  const slots: Emitted[][] = [];
  const single = new Map<string, number>();
  for (const claim of claims) {
    const { command, option } = claim.entry;
    if (command !== owner) continue;
    const long = option.long ?? claim.name;
    const tokens: Emitted[] =
      claim.value !== undefined
        ? [`${long}=${claim.value}`]
        : option.optional
          ? [long, { terminatorOf: owner }]
          : [long];
    if (option.variadic) {
      slots.push(tokens);
      continue;
    }
    const at = single.get(option.attributeName());
    if (at === undefined) {
      single.set(option.attributeName(), slots.length);
      slots.push(tokens);
    } else slots[at] = tokens;
  }
  return slots.flat();
};

/**
 * Step 4: emit the normalized argv from the walk.
 *
 * @param items - The items the walk ran over.
 * @param walk - The walk.
 * @param claims - The claims.
 * @param table - The host's qualified-name table.
 * @returns The normalized user arguments.
 */
const emit = (
  items: readonly WalkItem[],
  walk: Walk,
  claims: readonly Claim[],
  table: QualifiedNameTable,
): string[] => {
  const entriesAt = new Map<number, WalkEntry[]>();
  for (const entry of walk.path)
    if (entry.at !== undefined)
      entriesAt.set(entry.at, [...(entriesAt.get(entry.at) ?? []), entry]);
  const parentOf = (entry: WalkEntry): CommandUnknownOpts =>
    (walk.path[walk.path.indexOf(entry) - 1] ?? entry).command;

  const out: Emitted[] = [];
  const root = walk.path[0];
  if (root) out.push(...insertionsOf(claims, root.command));
  items.forEach((item, i) => {
    const here = entriesAt.get(i) ?? [];
    for (const entry of here)
      if (entry.kind === 'written') {
        if (entry.terminatorBefore) out.push({ terminatorOf: parentOf(entry) });
        out.push(entry.command.name(), ...insertionsOf(claims, entry.command));
      }
    if (item.kind === 'gap') {
      const parser = walk.terminators.get(i);
      if (parser) out.push({ terminatorOf: parser });
      return;
    }
    out.push(item.text);
    for (const entry of here)
      if (entry.kind === 'name')
        out.push(...insertionsOf(claims, entry.command));
  });

  // Keep a terminator only where the token after it could be a value.
  const argv: string[] = [];
  for (let j = out.length - 1; j >= 0; j--) {
    const x = out[j] as Emitted;
    if (typeof x === 'string') {
      argv.unshift(x);
      continue;
    }
    const next = argv[0];
    const flag = table.terminators.get(x.terminatorOf);
    if (
      next !== undefined &&
      flag !== undefined &&
      canBeValue(x.terminatorOf, next)
    )
      argv.unshift(flag);
  }
  return argv;
};

/**
 * Normalize argv and return what normalization saw (the walk, the claims,
 * the table). Builds the host's qualified-name table on first use.
 *
 * @param program - The host root.
 * @param argv - The user arguments.
 * @returns The normalization.
 * @throws NormalizeArgvError on a usage error (spec 4.4).
 */
export const normalizeQualified = (
  program: CommandUnknownOpts,
  argv: readonly string[],
): Normalization => {
  const table = ensureQualifiedNameTable(program);
  const { items, claims } = extractQualified(argv, table);
  const walk = walkArgv(program, items, {
    preset: (command) =>
      claims
        .filter((c) => c.entry.command === command)
        .map((c) => c.entry.option),
  });
  if (!walk.incomplete) {
    checkOwners(claims, walk, table.alias);
    checkDuplicates(claims, walk);
  }
  return { argv: emit(items, walk, claims, table), walk, claims, table };
};

/**
 * Normalize a typed argv for a get-dotenv host (spec 4.4).
 *
 * Every qualified option (`--<alias>-<path>-<long>`, such as `--vc-env` or
 * `--vc-aws-profile`) is moved to the command that owns it and written in
 * its plain form (`--env=bali`), wherever it was typed: after a subcommand,
 * after `--`, or among a forwarded command's arguments. Typed terminators
 * are dropped. A default subcommand that an option or `-h` would have
 * skipped is written in, so `vc node -h` runs `node -h` (Decision 30).
 * Plain options are left where they are.
 *
 * `GetDotenvCli.parseAsync` calls this for every host. A custom host that
 * parses argv some other way can call it first and hand the result to
 * Commander with `{ from: 'user' }`.
 *
 * The first call builds the host's qualified-name table from the command
 * tree as it stands (and registers each command's hidden terminator), so on
 * a `GetDotenvCli` call it after `install()` and `brand()`; the table is not
 * rebuilt.
 *
 * @param program - The host root.
 * @param argv - The user arguments (no `node` or script entries).
 * @returns The normalized user arguments.
 * @throws NormalizeArgvError on a usage error: an unknown `--<alias>-*`
 *   token, a missing or unexpected qualified value, a qualified option whose
 *   owner isn't invoked or takes no options there, or an option given in
 *   both its plain and qualified forms.
 */
export const normalizeArgv = (
  program: CommandUnknownOpts,
  argv: readonly string[],
): string[] => normalizeQualified(program, argv).argv;
