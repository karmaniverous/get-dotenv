import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from './GetDotenvCli';

describe('GetDotenvCli help ordering', () => {
  it('places short-aliased options before long-only flags', () => {
    const cli = new GetDotenvCli('test').attachRootOptions();
    // Commander does not require parse to generate help text
    const help: string = cli.helpInformation();
    // Extract the Options: section
    const start: number = help.indexOf('Options:');
    expect(start).toBeGreaterThanOrEqual(0);
    const tail: string = help.slice(start);
    const eIdx: number = tail.indexOf('-e, --env');
    const strictIdx: number = tail.indexOf('--strict');
    // Both should be present and short-aliased appears first
    expect(eIdx).toBeGreaterThanOrEqual(0);
    expect(strictIdx).toBeGreaterThanOrEqual(0);
    expect(eIdx < strictIdx).toBe(true);
  });
});
