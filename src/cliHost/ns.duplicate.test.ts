import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from './GetDotenvCli';

describe('GetDotenvCli.ns duplicate guard', () => {
  it('throws when adding a same-level duplicate command name', () => {
    const cli = new GetDotenvCli('test');
    cli.ns('foo');
    expect(() => cli.ns('foo')).toThrow(/duplicate command name/i);
  });
});
