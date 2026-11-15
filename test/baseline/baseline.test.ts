/**
 * 7.0.11 behaviour baseline (dev plan step S1).
 *
 * Runs the corpus (`corpus.ts`) and compares each case's normalized record
 * with the stored 7.0.11 record in `test/baseline-7.0.11/<platform>/`. A case
 * whose output differs fails unless `departures.ts` lists it with the issue or
 * decision that changes it, or unless every difference is a field listed in
 * `fieldDepartures` (one options-bag field changed in every case that records
 * it; the rest of the case is still compared, see `fieldDepartures.ts`). The
 * current output is always written to
 * `.tsbuild/baseline-actual/<platform>/` (CI uploads it when this test fails).
 *
 * With `BASELINE_RECORD_DIR` set (see `tools/baseline-record.js`), the run only
 * writes the current output to that directory and compares nothing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it, vi } from 'vitest';

import type * as ExecModule from '@/src/cliHost/exec';

import {
  departures,
  type FieldDeparture,
  fieldDepartures,
} from '../baseline-7.0.11/departures';
import { corpus, type Group, groupOf, groups } from './corpus';
import {
  expectedWithFieldDepartures,
  unusedFieldDepartures,
} from './fieldDepartures';
import { runCase } from './harness';
import type { CaseRecord } from './types';

vi.mock('@/src/cliHost/exec', async (importOriginal) => {
  const actual = await importOriginal<typeof ExecModule>();
  const { interceptAws } = await import('./awsStub');
  return {
    ...actual,
    runCommand: async (
      command: string | readonly string[],
      shell: string | boolean | URL,
      opts: ExecModule.RunCommandOptions,
    ): Promise<number> => {
      const stub = interceptAws('run', command, shell, opts.env);
      return stub ? stub.exitCode : actual.runCommand(command, shell, opts);
    },
    runCommandResult: async (
      command: string | readonly string[],
      shell: string | boolean | URL,
      opts?: ExecModule.RunCommandResultOptions,
    ): Promise<ExecModule.RunCommandResult> => {
      const stub = interceptAws('result', command, shell, opts?.env);
      return stub ?? actual.runCommandResult(command, shell, opts);
    },
  };
});

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const platform = process.platform;
const baselineDir = path.join(repoRoot, 'test', 'baseline-7.0.11', platform);
const recordDir = process.env.BASELINE_RECORD_DIR;
const actualDir =
  recordDir ?? path.join(repoRoot, '.tsbuild', 'baseline-actual', platform);

const loadGroup = (group: Group): Record<string, CaseRecord> | undefined => {
  const file = path.join(baselineDir, `${group}.json`);
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, CaseRecord>)
    : undefined;
};

const baseline = Object.fromEntries(
  groups.map((g) => [g, loadGroup(g)]),
) as Record<Group, Record<string, CaseRecord> | undefined>;

const actual = Object.fromEntries(groups.map((g) => [g, {}])) as Record<
  Group,
  Record<string, CaseRecord>
>;

const departed = new Map(departures.map((d) => [d.case, d]));

/** Field departures that rewrote a stored field in at least one case. */
const usedFieldDepartures = new Set<FieldDeparture>();

describe('7.0.11 behaviour baseline', () => {
  afterAll(() => {
    mkdirSync(actualDir, { recursive: true });
    for (const g of groups) {
      const sorted = Object.fromEntries(
        Object.keys(actual[g])
          .sort()
          .map((k) => [k, actual[g][k]]),
      );
      writeFileSync(
        path.join(actualDir, `${g}.json`),
        JSON.stringify(sorted, null, 2) + '\n',
      );
    }
  });

  it('has unique case ids', () => {
    const ids = corpus.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists departures only for known cases, each citing an issue or decision', () => {
    const ids = new Set(corpus.map((c) => c.id));
    for (const d of departures) {
      expect({ case: d.case, known: ids.has(d.case) }).toEqual({
        case: d.case,
        known: true,
      });
      expect(d.issueOrDecision).toMatch(/^(#|D)\d+$/);
      expect({ case: d.case, note: d.note.trim() }).not.toEqual({
        case: d.case,
        note: '',
      });
    }
  });

  it('lists field departures, each with a path, a change and a citation', () => {
    for (const d of fieldDepartures) {
      const field = d.bagPath.join('.');
      expect({ field, empty: d.bagPath.length === 0 }).toEqual({
        field,
        empty: false,
      });
      expect({ field, same: d.from === d.to }).toEqual({ field, same: false });
      expect(d.issueOrDecision).toMatch(/^(#\d+( \(follow-up\))?|D\d+)$/);
      expect({ field, note: d.note.trim() }).not.toEqual({ field, note: '' });
    }
  });

  it(`stores a baseline for exactly the corpus on ${platform}`, () => {
    // Recording writes the baseline; there is nothing to compare yet.
    if (recordDir !== undefined) return;
    for (const g of groups) {
      const stored = baseline[g];
      expect({
        file: path.join(baselineDir, `${g}.json`),
        present: stored !== undefined,
      }).toEqual({ file: path.join(baselineDir, `${g}.json`), present: true });
      const expected = corpus
        .filter((c) => groupOf(c) === g && !departed.has(c.id))
        .map((c) => c.id)
        .sort();
      const recorded = Object.keys(stored ?? {})
        .filter((id) => !departed.has(id))
        .sort();
      expect(recorded).toEqual(expected);
    }
  });

  for (const c of corpus) {
    it(c.id, async () => {
      const record = await runCase(c);
      const g = groupOf(c);
      actual[g][c.id] = record;
      if (recordDir !== undefined || departed.has(c.id)) return;
      const expected = baseline[g]?.[c.id];
      expect({ case: c.id, stored: expected !== undefined }).toEqual({
        case: c.id,
        stored: true,
      });
      expect(record).toEqual(
        expected &&
          expectedWithFieldDepartures(
            expected,
            record,
            fieldDepartures,
            usedFieldDepartures,
          ),
      );
    });
  }

  // Runs after the corpus (tests in a file run in order).
  it('uses every field departure in at least one case', () => {
    if (recordDir !== undefined) return;
    expect(
      unusedFieldDepartures(fieldDepartures, usedFieldDepartures).map((d) =>
        d.bagPath.join('.'),
      ),
    ).toEqual([]);
  });
});
