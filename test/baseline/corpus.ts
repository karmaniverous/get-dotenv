/**
 * The full 7.0.11 behaviour baseline corpus, and its grouping into baseline
 * files.
 */
import { helpCorpus } from './cases/help';
import { issuesCorpus } from './cases/issues';
import { tablesCorpus } from './cases/tables';
import type { BaselineCase } from './types';

/** Baseline file (group) names. */
export const groups = ['getdotenv', 'vc', 'lib'] as const;

/** A baseline file (group) name. */
export type Group = (typeof groups)[number];

/**
 * The baseline file a case is stored in.
 *
 * @param c - The case.
 * @returns Its group.
 */
export const groupOf = (c: BaselineCase): Group =>
  c.kind === 'lib' ? 'lib' : c.group;

/** Every case, in run order. */
export const corpus: BaselineCase[] = [
  ...helpCorpus,
  ...tablesCorpus,
  ...issuesCorpus,
];
