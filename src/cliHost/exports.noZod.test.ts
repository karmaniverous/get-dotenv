import { describe, expect, it } from 'vitest';

import * as cliHost from './index';

describe('cliHost public surface', () => {
  // Decision 19 / 4.1 item 3: the deprecated `z` re-export is removed in 8.0.
  // Plugin authors import `z` from 'zod' directly.
  it('does not re-export z from zod', () => {
    expect(Object.keys(cliHost)).not.toContain('z');
    expect('z' in cliHost).toBe(false);
  });

  it('still exports its plugin-author API', () => {
    expect(cliHost).toHaveProperty('GetDotenvCli');
    expect(cliHost).toHaveProperty('definePlugin');
  });
});
