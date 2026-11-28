import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

import { getDotenv } from './getDotenv';

// Mock esbuild so that calling build() throws and triggers the TypeScript
// fallback. vi.mock is hoisted, so it applies to every test in this file.
vi.mock('esbuild', () => ({
  // Throw on use to ensure we enter the catch branch.
  build: () => {
    throw new Error('mock esbuild failure');
  },
}));

describe('getDotenv dynamic.ts fallback/error paths', () => {
  it('falls back to TypeScript transpile when esbuild fails', async () => {
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
  });

  it('throws a clear error when both esbuild and typescript are unavailable', async () => {
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

    const err: unknown = await getDotenv({
      dotenvToken: '.testenv',
      env: 'test',
      paths: ['./test/full'],
      dynamicPath: dynTs,
    }).catch((e: unknown) => e);
    await fs.remove(dynTs);

    expect(err).toBeInstanceOf(Error);
    const dynErr = err as Error;
    expect(dynErr.message).toMatch(/Unable to load dynamic TypeScript file/i);
    // The loader's error, and under it what each compiler reported, in order.
    const loaderErr = dynErr.cause as Error;
    expect(loaderErr.message).toMatch(/Unable to load JS\/TS module/);
    expect(loaderErr.cause).toBeInstanceOf(AggregateError);
    const attempts = (loaderErr.cause as AggregateError).errors as Error[];
    expect(attempts.map((e) => e.message)).toEqual([
      'mock esbuild failure',
      'module load failure',
    ]);
  });
});
