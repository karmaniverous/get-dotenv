/**
 * Regression tests for the exported `parseVarsPairs`, the pair-level parser
 * behind the root `--vars` option. A plugin option that parses vars the same
 * way (e.g. `pull-keys --vars VAR=keyName`) needs the ordered list of pairs,
 * including duplicates, which `parseVarsPairs` returns and the
 * de-duplicating `getDotenvCliOptions2Options` does not.
 */
import { describe, expect, it } from 'vitest';

import { parseVarsPairs } from './GetDotenvOptions';

describe('parseVarsPairs', () => {
  it('splits on whitespace and `=` by default', () => {
    expect(parseVarsPairs('A=1 B=2')).toEqual([
      ['A', '1'],
      ['B', '2'],
    ]);
  });

  it('honours a custom delimiter', () => {
    expect(parseVarsPairs('A=1,B=2', { varsDelimiter: ',' })).toEqual([
      ['A', '1'],
      ['B', '2'],
    ]);
  });

  it('honours a delimiter pattern', () => {
    expect(
      parseVarsPairs('A=1 ,  B=2', { varsDelimiterPattern: '\\s*,\\s*' }),
    ).toEqual([
      ['A', '1'],
      ['B', '2'],
    ]);
  });

  it('honours a custom assignor', () => {
    expect(parseVarsPairs('A:1 B:2', { varsAssignor: ':' })).toEqual([
      ['A', '1'],
      ['B', '2'],
    ]);
  });

  it('honours an assignor pattern (first match only)', () => {
    expect(
      parseVarsPairs('A -> b -> c,B->d', {
        varsDelimiter: ',',
        varsAssignorPattern: '\\s*->\\s*',
      }),
    ).toEqual([
      ['A', 'b -> c'],
      ['B', 'd'],
    ]);
  });

  it('splits a pair at its first assignor only, so the value may contain it', () => {
    expect(parseVarsPairs('A=b=c')).toEqual([['A', 'b=c']]);
  });

  it('yields an undefined value for a pair without an assignor', () => {
    expect(parseVarsPairs('A B=1')).toEqual([
      ['A', undefined],
      ['B', '1'],
    ]);
  });

  it('drops pairs with an empty key', () => {
    expect(parseVarsPairs('=1 B=2')).toEqual([['B', '2']]);
  });

  it('keeps duplicate keys, in order, instead of collapsing them', () => {
    expect(parseVarsPairs('VAR=a VAR=b VAR=c')).toEqual([
      ['VAR', 'a'],
      ['VAR', 'b'],
      ['VAR', 'c'],
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseVarsPairs('')).toEqual([]);
  });
});
