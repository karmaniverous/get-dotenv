import { describe, expect, it } from 'vitest';

import type { FieldDeparture } from '../baseline-7.0.11/departures';
import {
  expectedWithFieldDepartures,
  unusedFieldDepartures,
} from './fieldDepartures';
import type { CaseRecord, EnvDiff } from './types';

const OLD = 'git branch --show-current && git status -s -u';
const NEW = 'git status -s -u -b';

/** Stand-ins for the env hash of each bag. */
const HASH = { [OLD]: 'aaaaaaaaaaaa', [NEW]: 'bbbbbbbbbbbb' } as Record<
  string,
  string
>;

const departure: FieldDeparture = {
  bagPath: ['scripts', 'git-status', 'cmd'],
  from: OLD,
  to: NEW,
  issueOrDecision: '#51 (follow-up)',
  note: 'test entry',
};

const bag = (cmd: string) => ({
  shell: true,
  scripts: { 'git-status': { cmd, shell: true } },
});

const env = (cmd: string): EnvDiff => ({
  added: { getDotenvCliOptions: HASH[cmd] ?? 'cccccccccccc' },
  changed: {},
  removed: [],
});

const record = (cmd: string, stdout = 'out'): CaseRecord => ({
  source: '#51',
  exitCode: 0,
  stdout,
  stderr: '',
  bag: bag(cmd),
  children: [
    {
      argv: ['x'],
      cwd: '<TMP>',
      env: env(cmd),
      getDotenvCliOptions: bag(cmd),
    },
  ],
  aws: [
    {
      kind: 'run',
      command: 'aws',
      shell: false,
      getDotenvCliOptions: bag(cmd),
    },
  ],
});

/** Compares `current` with `stored` as the baseline test does. */
const compare = (stored: CaseRecord, current: CaseRecord) => {
  const used = new Set<FieldDeparture>();
  const expected = expectedWithFieldDepartures(
    stored,
    current,
    [departure],
    used,
  );
  return { expected, used };
};

describe('baseline field departures', () => {
  it('passes a case where the field changed from the old to the new value in every bag', () => {
    const stored = record(OLD);
    const current = record(NEW);
    const { expected, used } = compare(stored, current);
    expect(current).toEqual(expected);
    expect([...used]).toEqual([departure]);
    expect(unusedFieldDepartures([departure], used)).toEqual([]);
    // Neither record is modified.
    expect(stored).toEqual(record(OLD));
    expect(current).toEqual(record(NEW));
  });

  it('fails a case where the field has any other value', () => {
    for (const current of [record('git status'), record(OLD)])
      expect(current).not.toEqual(compare(record(OLD), current).expected);
  });

  it('fails a case where one bag kept the old value', () => {
    const current = record(NEW);
    current.children = record(OLD).children ?? [];
    expect(current).not.toEqual(compare(record(OLD), current).expected);
  });

  it('still fails an unrelated change in the same case', () => {
    const current = record(NEW, 'other');
    expect(current).not.toEqual(compare(record(OLD), current).expected);
  });

  it('compares a stored value other than the old one exactly', () => {
    const same = compare(record('custom'), record('custom'));
    expect(record('custom')).toEqual(same.expected);
    expect(same.used.size).toBe(0);
    const changed = record(NEW);
    expect(changed).not.toEqual(compare(record('custom'), changed).expected);
  });

  it('reports a field departure that matches no case', () => {
    const used = new Set<FieldDeparture>();
    const help: CaseRecord = {
      source: 'help',
      exitCode: 0,
      stdout: '',
      stderr: '',
    };
    expectedWithFieldDepartures(help, help, [departure], used);
    expectedWithFieldDepartures(
      record('custom'),
      record('custom'),
      [departure],
      used,
    );
    expect(unusedFieldDepartures([departure], used)).toEqual([departure]);
  });

  describe('env bag hash (option A)', () => {
    it('passes the new hash of a child whose decoded bag was rewritten', () => {
      const stored = record(OLD);
      const current = record(NEW);
      expect(current.children?.[0]?.env).not.toEqual(stored.children?.[0]?.env);
      expect(current).toEqual(compare(stored, current).expected);
    });

    it('fails a hash difference when the decoded bag is untouched', () => {
      // The stored bag never held the old command, so the departure leaves it
      // as is; the decoded bags match and the hash alone differs.
      const current = record('custom');
      const child = current.children?.[0];
      if (child) child.env.added.getDotenvCliOptions = 'dddddddddddd';
      expect(current).not.toEqual(compare(record('custom'), current).expected);
    });

    it('fails a hash difference on a child the departure did not rewrite', () => {
      // Two children; only the first held the old command.
      const stored = record(OLD);
      const other = {
        argv: ['y'],
        cwd: '<TMP>',
        env: env('custom'),
        getDotenvCliOptions: bag('custom'),
      };
      stored.children?.push(structuredClone(other));
      const current = record(NEW);
      const changedOther = structuredClone(other);
      changedOther.env.added.getDotenvCliOptions = 'dddddddddddd';
      current.children?.push(changedOther);
      expect(current).not.toEqual(compare(stored, current).expected);
      // With the other child's hash unchanged, the case passes.
      current.children?.splice(1, 1, structuredClone(other));
      expect(current).toEqual(compare(stored, current).expected);
    });

    it('fails a rewritten child whose hash moved from added to changed', () => {
      const current = record(NEW);
      const child = current.children?.[0];
      if (child)
        child.env = {
          added: {},
          changed: { getDotenvCliOptions: HASH[NEW] ?? '' },
          removed: [],
        };
      expect(current).not.toEqual(compare(record(OLD), current).expected);
    });
  });
});
