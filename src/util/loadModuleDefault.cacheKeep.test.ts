/**
 * Regression tests for #85: a `GETDOTENV_CACHE_KEEP` that isn't an integer
 * falls back to the default (2) instead of deleting every cached build.
 *
 * The baseline couldn't record #85 (Vitest loads TS itself, so the compile
 * path never runs in-process). The cleanup is tested here in-process, and the
 * issue's repro runs in a plain Node child, which strips types but can't
 * import a TS `enum`, so the module is compiled and cached.
 */
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadInChild } from '@/test/support/childLoader';
import { withEnv } from '@/test/support/fixtureCli';

import { cleanupOldCacheFiles } from './loadModuleDefault';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'gdv-cache-keep-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Seed `count` cached builds of `mod.ts`, oldest first, plus an unrelated file. */
const seed = (count: number) => {
  const now = Date.now() / 1000;
  for (let i = 0; i < count; i++) {
    const f = path.join(dir, `mod.ts.hash${String(i)}.mjs`);
    writeFileSync(f, '');
    utimesSync(f, now - 100 + i, now - 100 + i);
  }
  writeFileSync(path.join(dir, 'other.ts.x.mjs'), '');
};

const builds = () =>
  readdirSync(dir)
    .filter((f) => f.startsWith('mod.ts.'))
    .sort();

describe('#85 GETDOTENV_CACHE_KEEP', () => {
  it.each([
    ['abc', ['mod.ts.hash2.mjs', 'mod.ts.hash3.mjs']],
    ['', ['mod.ts.hash2.mjs', 'mod.ts.hash3.mjs']],
    ['2.5', ['mod.ts.hash2.mjs', 'mod.ts.hash3.mjs']],
    [undefined, ['mod.ts.hash2.mjs', 'mod.ts.hash3.mjs']],
    ['3', ['mod.ts.hash1.mjs', 'mod.ts.hash2.mjs', 'mod.ts.hash3.mjs']],
    ['0', ['mod.ts.hash3.mjs']],
    ['-4', ['mod.ts.hash3.mjs']],
  ])('keep=%j leaves the newest builds', async (keep, expected) => {
    seed(4);
    await withEnv({ GETDOTENV_CACHE_KEEP: keep }, () =>
      cleanupOldCacheFiles(dir, 'mod.ts'),
    );
    expect(builds()).toEqual(expected);
    expect(readdirSync(dir)).toContain('other.ts.x.mjs');
  });

  it('the issue repro: a compiled module keeps its build with keep=abc', async () => {
    const src = path.join(dir, 'src');
    mkdirSync(src);
    const mod = path.join(src, 'mod.ts');
    // An enum can't be type-stripped, so plain Node must compile the module.
    writeFileSync(
      mod,
      'enum Color { Red = "red" }\nexport default { color: Color.Red };\n',
    );
    const cache = path.join(dir, 'cache');
    const run = await loadInChild({
      modulePath: mod,
      cacheDirName: cache,
      env: { GETDOTENV_CACHE_KEEP: 'abc' },
    });
    expect(run.stderr).toBe('');
    expect(run.stdout).toBe('{"color":"red"}');
    expect(
      readdirSync(cache).filter((f) => f.startsWith('mod.ts.')),
    ).toHaveLength(1);
  });
});
