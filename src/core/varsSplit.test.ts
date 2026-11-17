/**
 * Regression tests for #73: each `-v` pair is split at its first assignor
 * only, so the value may contain the assignor.
 */
import { describe, expect, it } from 'vitest';

import { runFixtureCli } from '@/test/support/fixtureCli';

import { getDotenvCliOptions2Options } from './GetDotenvOptions';

const varsOf = (opts: Parameters<typeof getDotenvCliOptions2Options>[0]) =>
  getDotenvCliOptions2Options(opts).vars;

describe('#73 -v splits each pair at the first assignor', () => {
  it('the issue repro: -v "A=b=c" sets A to b=c', async () => {
    const run = await runFixtureCli(['-P', '-v', 'A=b=c', 'probe']);
    expect(run.ctx?.dotenv.A).toBe('b=c');
  });

  it('keeps base64 padding and query strings', () => {
    expect(varsOf({ vars: 'K=YWJj== U=http://h/?a=1&b=2' })).toEqual({
      K: 'YWJj==',
      U: 'http://h/?a=1&b=2',
    });
  });

  it('honours a custom assignor', () => {
    expect(varsOf({ vars: 'A:b:c', varsAssignor: ':' })).toEqual({ A: 'b:c' });
  });

  it('honours an assignor pattern (first match only)', () => {
    expect(
      varsOf({
        vars: 'A -> b -> c,B->d',
        varsDelimiter: ',',
        varsAssignorPattern: '\\s*->\\s*',
      }),
    ).toEqual({ A: 'b -> c', B: 'd' });
  });

  it('an empty value after the assignor is kept', () => {
    expect(varsOf({ vars: 'A= B=1' })).toEqual({ A: '', B: '1' });
  });

  it('a pair without an assignor is ignored', () => {
    expect(varsOf({ vars: 'A B=1' })).toEqual({ B: '1' });
  });
});
