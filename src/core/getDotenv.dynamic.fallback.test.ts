import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

import { getDotenv } from './getDotenv';

describe('getDotenv dynamic.ts fallback/error paths', () => {
  it('falls back to TypeScript transpile when esbuild fails', async () => {
    // Mock esbuild so that calling build() throws and triggers fallback.
    vi.mock('esbuild', () => ({
      // Throw on use to ensure we enter the catch branch.
      build: () => {
        throw new Error('mock esbuild failure');
      },
    }));

    const dir = path.posix.join('.tsbuild', 'getdotenv-tests');
    const dynTs = path.posix.join(dir, 'dynamic.fallback.ts');
    await fs.ensureDir(dir);
    await fs.writeFile(
      dynTs,
      `
        export default {
          TS_FALLBACK: ({ APP_SETTING = '' }) => APP_SETTING + '-ts-fb'
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
    expect(vars.TS_FALLBACK).toBe('deep_app_setting-ts-fb');

    await fs.remove(dynTs);
    vi.unmock('esbuild');
    vi.resetModules();
  });

  it('throws a clear error when both esbuild and typescript are unavailable', async () => {
    // Force esbuild "successfully mocked" but unusable (skip to TS fallback).
    vi.mock('esbuild', () => ({
      build: () => {
        throw new Error('mock esbuild failure');
      },
    }));

    const dir = path.posix.join('.tsbuild', 'getdotenv-tests');
    const dynTs = path.posix.join(dir, 'dynamic.fallback.error.ts');
    await fs.ensureDir(dir);
    // Force both direct import and compiled import to fail at evaluation time.
    await fs.writeFile(
      dynTs,
      `
        throw new Error('module load failure');
        export default {};
      `,
      'utf-8',
    );

    await expect(
      getDotenv({
        dotenvToken: '.testenv',
        env: 'test',
        paths: ['./test/full'],
        dynamicPath: dynTs,
      }),
    ).rejects.toThrow(/Unable to load dynamic TypeScript file/i);

    await fs.remove(dynTs);
    vi.unmock('esbuild');
    vi.resetModules();
  });
});
