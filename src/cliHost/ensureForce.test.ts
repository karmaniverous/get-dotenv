import { afterEach, describe, expect, it, vi } from 'vitest';

import { ensureForce } from './ensureForce';

describe('cliHost/ensureForce', () => {
  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it('returns true when force is truthy', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(ensureForce(true, 'delete')).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it('returns false, warns, and sets exitCode 2 when force is falsy', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Precondition
    process.exitCode = 0;

    expect(ensureForce(false, 'delete')).toBe(false);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('delete requires confirmation'),
    );
    expect(process.exitCode).toBe(2);
  });

  it('uses custom flag name in warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.exitCode = 0;

    expect(ensureForce(false, 'delete', '--confirm')).toBe(false);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Re-run with --confirm to proceed'),
    );
  });
});
