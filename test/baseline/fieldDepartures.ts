/**
 * Applies field-level departures (`fieldDepartures` in `departures.ts`) to a
 * stored baseline record before it is compared with the current one.
 *
 * A child also receives its options bag serialized in its env, which the
 * record keeps only as a hash. When a departure rewrites a child's decoded bag,
 * that one hash is taken from the current record instead (option A, #51
 * follow-up): the decoded bag is still compared field by field, so the hash
 * adds nothing. Every other hash, including that of a child whose bag no
 * departure rewrote, stays exact.
 */
import { isDeepStrictEqual } from 'node:util';

import type { FieldDeparture } from '../baseline-7.0.11/departures';
import type { CaseRecord, EnvDiff } from './types';

/** The env key that carries the serialized options bag to a child. */
const bagEnvKey = 'getDotenvCliOptions';

/**
 * Every options bag in a record: the merged bag, then the
 * `getDotenvCliOptions` of each child and each AWS call.
 *
 * @param record - A case record.
 * @returns The bags, in record order (missing ones skipped).
 */
const bagsOf = (record: CaseRecord): unknown[] =>
  [
    record.bag,
    ...(record.children ?? []).map((c) => c.getDotenvCliOptions),
    ...(record.aws ?? []).map((a) => a.getDotenvCliOptions),
  ].filter((b) => b !== undefined);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

/**
 * Rewrites one field of one bag from `d.from` to `d.to`, if the bag holds
 * `d.from` there.
 *
 * @param bag - An options bag (mutated).
 * @param d - The field departure.
 * @returns Whether the field was rewritten.
 */
const rewrite = (bag: unknown, d: FieldDeparture): boolean => {
  const parentPath = d.bagPath.slice(0, -1);
  const key = d.bagPath.at(-1);
  let parent: unknown = bag;
  for (const k of parentPath) parent = isObject(parent) ? parent[k] : undefined;
  if (key === undefined || !isObject(parent) || !Object.hasOwn(parent, key))
    return false;
  if (!isDeepStrictEqual(parent[key], d.from)) return false;
  parent[key] = structuredClone(d.to);
  return true;
};

/**
 * Exempts the bag hash in a rewritten child's env: where the expected env
 * holds the hash and the current env holds one in the same place (`added` or
 * `changed`), the current hash is expected.
 *
 * @param expected - The expected child env (mutated).
 * @param current - The current child env, if any.
 */
const exemptBagHash = (expected: EnvDiff, current: EnvDiff | undefined) => {
  for (const slot of ['added', 'changed'] as const) {
    const got = current?.[slot][bagEnvKey];
    if (Object.hasOwn(expected[slot], bagEnvKey) && typeof got === 'string')
      expected[slot][bagEnvKey] = got;
  }
};

/**
 * The record a case must now produce: the stored record with every field
 * departure applied. Only fields holding a departure's `from` value change;
 * everything else stays as stored, so it is still compared exactly, except
 * the env bag hash of each child whose decoded bag was rewritten.
 *
 * @param stored - The stored 7.0.11 record (not modified).
 * @param current - The record the case produced now (not modified).
 * @param list - The field departures.
 * @param used - Collects each departure that rewrote at least one field.
 * @returns The expected record.
 */
export const expectedWithFieldDepartures = (
  stored: CaseRecord,
  current: CaseRecord,
  list: readonly FieldDeparture[],
  used: Set<FieldDeparture>,
): CaseRecord => {
  const expected = structuredClone(stored);
  const rewritten = new Set<unknown>();
  for (const d of list)
    for (const bag of bagsOf(expected))
      if (rewrite(bag, d)) {
        used.add(d);
        rewritten.add(bag);
      }
  expected.children?.forEach((child, i) => {
    if (rewritten.has(child.getDotenvCliOptions))
      exemptBagHash(child.env, current.children?.[i]?.env);
  });
  return expected;
};

/**
 * Field departures that matched no stored value.
 *
 * @param list - The field departures.
 * @param used - The departures that rewrote at least one field.
 * @returns The unused departures (each one is an error).
 */
export const unusedFieldDepartures = (
  list: readonly FieldDeparture[],
  used: ReadonlySet<FieldDeparture>,
): FieldDeparture[] => list.filter((d) => !used.has(d));
