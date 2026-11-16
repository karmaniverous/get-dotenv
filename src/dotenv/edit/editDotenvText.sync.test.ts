/**
 * #67 (Decision 22): `sync` makes the file contain exactly the given keys.
 * Existing keys are updated in place, missing keys are appended as `merge`
 * appends them, and keys that weren't given are removed. Comments, blank lines
 * and unrecognised lines are kept.
 */
import { parse } from 'dotenv';
import { describe, expect, it } from 'vitest';

import { editDotenvText } from './editDotenvText';

const sync = (text: string, updates: Parameters<typeof editDotenvText>[1]) =>
  editDotenvText(text, updates, { mode: 'sync' });

describe('editDotenvText sync mode upserts (#67)', () => {
  it('issue repro: updates A, removes C, appends B', () => {
    expect(sync('A=1\nC=3\n', { A: '9', B: '2' })).toBe('A=9\nB=2\n');
  });

  it('keeps comments, blank lines and unrecognised lines; the file reads back as exactly the given keys', () => {
    const out = sync('# head\nA=1\n\nC=3 # c\nmy-key=x\n', { A: '9', B: '2' });
    expect(out).toBe('# head\nA=9\n\nmy-key=x\nB=2\n');
    // dotenv itself accepts `my-key`; the editor keeps it as an unrecognised line.
    const { 'my-key': _kept, ...rest } = parse(out);
    expect(rest).toEqual({ A: '9', B: '2' });
  });

  it('appends missing keys in update-map order, after the existing lines', () => {
    expect(sync('Z=1\n', { Y: '2', Z: '1', X: '3' })).toBe('Z=1\nY=2\nX=3\n');
  });

  it('a key given as undefined is kept if present and not added if missing', () => {
    expect(sync('A=1\nC=3\n', { A: undefined, D: undefined, B: '2' })).toBe(
      'A=1\nB=2\n',
    );
  });

  it('a key given as null is deleted and not added', () => {
    expect(sync('A=1\nC=3\n', { A: null, D: null, B: '2' })).toBe('B=2\n');
  });

  it('a bare-key placeholder for a given key becomes its assignment in place', () => {
    expect(sync('A\nC=3\n', { A: '1', B: '2' })).toBe('A=1\nB=2\n');
  });

  it('into an empty file', () => {
    expect(sync('', { A: '1', B: '2' })).toBe('A=1\nB=2');
  });

  it('a file with no final newline keeps none, and the new key has its own line', () => {
    expect(sync('A=1\nC=3', { A: '9', B: '2' })).toBe('A=9\nB=2');
  });

  it('merge mode still keeps keys that were not given', () => {
    expect(editDotenvText('A=1\nC=3\n', { A: '9', B: '2' })).toBe(
      'A=9\nC=3\nB=2\n',
    );
  });
});
