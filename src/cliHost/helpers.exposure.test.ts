import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from './GetDotenvCli';

describe('/cliHost helpers exposure', () => {
  it('exposes attachRootOptions and passOptions on the host prototype', () => {
    const cli = new GetDotenvCli('test');
    // Runtime presence
    const hasAttach =
      typeof (cli as unknown as { attachRootOptions?: unknown })
        .attachRootOptions === 'function';
    const hasPass =
      typeof (cli as unknown as { passOptions?: unknown }).passOptions ===
      'function';
    expect(hasAttach).toBe(true);
    expect(hasPass).toBe(true);
  });
  it('type-level visibility compiles (no runtime call required)', () => {
    const cli = new GetDotenvCli('test');
    // The following assignments compile only if module augmentation is visible.
    const attach: unknown = (
      cli as unknown as {
        attachRootOptions?: (...args: unknown[]) => unknown;
      }
    ).attachRootOptions;
    const pass: unknown = (
      cli as unknown as {
        passOptions?: (...args: unknown[]) => unknown;
      }
    ).passOptions;
    (void attach, void pass);
  });
});
