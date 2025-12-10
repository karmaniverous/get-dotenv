import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { getDotenv } from './getDotenv';

describe('getDotenv dynamic.ts auto-compile', () => {
  it('compiles and loads dynamic.ts via esbuild when available', async () => {
    // Skip if esbuild is not available in the environment
    try {
      await import('esbuild');
    } catch {
      // esbuild not installed; skip the assertion silently
      return;
    }

    const dir = path.posix.join('.tsbuild', 'getdotenv-tests');
    const dynTs = path.posix.join(dir, 'dynamic.ts');
    await fs.ensureDir(dir);
    await fs.writeFile(
      dynTs,
      `
        export default {
          TS_DYNAMIC: ({ APP_SETTING = '' }) => APP_SETTING + '-ts'
        }
      `,
      'utf-8',
    );

    const vars = await getDotenv({
      dotenvToken: '.testenv',
      env: 'test',
      paths: ['./test/full'],
      dynamicPath: dynTs,
    });
    expect(vars.TS_DYNAMIC).toBe('deep_app_setting-ts');

    await fs.remove(dynTs);
  });
});
