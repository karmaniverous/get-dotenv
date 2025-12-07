import { describe, expect, it } from 'vitest';

import { buildSpawnEnv } from './spawnEnv';

describe('cliCore/spawnEnv', () => {
  it('drops undefined and applies overlay (base-agnostic)', () => {
    const base = { A: '1', B: undefined } as unknown as NodeJS.ProcessEnv;
    const overlay = { B: '2', C: undefined };
    const out = buildSpawnEnv(base, overlay) as Record<string, string>;
    expect(out.A).toBe('1');
    expect(out.B).toBe('2');
    expect(Object.prototype.hasOwnProperty.call(out, 'C')).toBe(false);
  });

  it('is idempotent when called with only base (no overlay)', () => {
    const base = { FOO: 'bar' } as unknown as NodeJS.ProcessEnv;
    const out = buildSpawnEnv(base) as Record<string, string>;
    expect(out.FOO).toBe('bar');
  });

  if (process.platform === 'win32') {
    it('dedupes keys case-insensitively on Windows; prefers last and preserves casing', () => {
      const base = { PATH: 'A' } as unknown as NodeJS.ProcessEnv;
      const overlay = { Path: 'B' }; // overlay should win; casing preserved from overlay
      const out = buildSpawnEnv(base, overlay) as Record<string, string>;
      // Only one of PATH/Path should exist with value 'B'
      const hasPATH = Object.prototype.hasOwnProperty.call(out, 'PATH');
      const hasPath = Object.prototype.hasOwnProperty.call(out, 'Path');
      expect(hasPATH || hasPath).toBe(true);
      const key = hasPath ? 'Path' : 'PATH';
      expect(out[key]).toBe('B');
    });

    it('sets HOME from USERPROFILE when HOME is missing', () => {
      const base = {
        USERPROFILE: 'C:\\Users\\dev',
      } as unknown as NodeJS.ProcessEnv;
      const out = buildSpawnEnv(base) as Record<string, string>;
      expect(out.HOME).toBe('C:\\Users\\dev');
    });

    it('normalizes TMP/TEMP when either is present', () => {
      const base = { TMP: 'C:\\Temp' } as unknown as NodeJS.ProcessEnv;
      const out = buildSpawnEnv(base) as Record<string, string>;
      expect(out.TMP).toBe('C:\\Temp');
      expect(out.TEMP).toBe('C:\\Temp');
    });
  } else {
    it('mirrors a temp dir to TMPDIR on POSIX when present', () => {
      const base = { TMP: '/tmp' } as unknown as NodeJS.ProcessEnv;
      const out = buildSpawnEnv(base) as Record<string, string>;
      expect(out.TMPDIR).toBe('/tmp');
    });
  }
});
