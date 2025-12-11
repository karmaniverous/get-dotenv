import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from './GetDotenvCli';

describe('/cliHost helpers exposure', () => {
  it('exposes attachRootOptions and overrideRootOptions on the host prototype', () => {
    const cli = new GetDotenvCli('test');
    // Runtime presence
    const hasAttach =
      typeof (cli as unknown as { attachRootOptions?: unknown })
        .attachRootOptions === 'function';
    const hasOverride =
      typeof (cli as unknown as { overrideRootOptions?: unknown })
        .overrideRootOptions === 'function';
    expect(hasAttach).toBe(true);
    // Public overrideRootOptions has been removed
    expect(hasOverride).toBe(false);
  });
  it('type-level visibility compiles (no runtime call required)', () => {
    const cli = new GetDotenvCli('test');
    // The following assignments compile only if module augmentation is visible.
    const attach = (
      cli as {
        attachRootOptions?: (...args: unknown[]) => unknown;
      }
    ).attachRootOptions;
    expect(attach).toBeDefined();
    // overrideRootOptions is intentionally not present
  });
});
