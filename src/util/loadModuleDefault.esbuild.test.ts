/**
 * A compiled TS module that imports an installed package which esbuild can't
 * bundle (it imports the unprefixed `readline/promises`, as get-dotenv 8.2.0
 * itself did) loads, and gets the very package instance Node resolves from
 * the module's own directory, even when the working directory (where the
 * compiled build is cached) is elsewhere.
 *
 * Runs in a plain Node child: in-process, Vitest loads TS itself and the
 * compile path never runs.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadInChild } from '@/test/support/childLoader';
import {
  type EsbuildFixture,
  writeEsbuildFixture,
} from '@/test/support/esbuildFixture';

let fx: EsbuildFixture;
let elsewhere: string;
beforeEach(() => {
  fx = writeEsbuildFixture();
  elsewhere = mkdtempSync(path.join(os.tmpdir(), 'gdv-cwd-'));
});
afterEach(() => {
  rmSync(fx.root, { recursive: true, force: true });
  rmSync(elsewhere, { recursive: true, force: true });
});

describe('loadModuleDefault: esbuild compile of a module importing packages', () => {
  it('loads it, sharing the installed package instance Node resolves', async () => {
    const pkgUrl = url.pathToFileURL(fx.pkgImportFile).href;
    const run = await loadInChild({
      modulePath: fx.entry,
      cacheDirName: 'compiled',
      cwd: elsewhere,
      report: [
        `const { marker } = await import(${JSON.stringify(pkgUrl)});`,
        'console.log(JSON.stringify({ ...value, same: value.marker === marker }));',
      ],
    });
    expect(run.stderr).toBe('');
    expect(JSON.parse(run.stdout)).toEqual({
      marker: { from: 'import', rl: 'function' },
      helper: 'alias-value',
      local: 'local-value',
      cjs: 'cjs-value',
      fs: 'function',
      same: true,
    });
  });
});
