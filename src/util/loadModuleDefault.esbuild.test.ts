/**
 * A compiled TS module that imports installed packages loads, and gets the
 * very package instances Node resolves from the module's own directory, even
 * when the working directory (where the compiled build is cached) is
 * elsewhere. One installed package imports the unprefixed
 * `readline/promises`, as get-dotenv 8.2.0 itself did (#100).
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

/** Load `modulePath` in a child; compare its packages with Node's own. */
const load = async (modulePath: string) => {
  const probeUrl = url.pathToFileURL(fx.probe).href;
  const run = await loadInChild({
    modulePath,
    cacheDirName: 'compiled',
    cwd: elsewhere,
    report: [
      `const probe = await import(${JSON.stringify(probeUrl)});`,
      'console.log(JSON.stringify({ value, probe: { ...probe },',
      '  sameMarker: value.marker === probe.marker,',
      '  sameLinked: value.linked === undefined || value.linked === probe.linked }));',
    ],
  });
  expect(run.stderr).toBe('');
  return JSON.parse(run.stdout) as {
    value: Record<string, unknown>;
    probe: { marker: { from: string } };
    sameMarker: boolean;
    sameLinked: boolean;
  };
};

describe('loadModuleDefault: esbuild compile of a module importing packages', () => {
  it('loads it, sharing the package instances Node resolves (exports conditions included)', async () => {
    const r = await load(fx.entry);
    expect(r.value).toEqual({
      marker: { ...r.probe.marker, rl: 'function' },
      json: 'json-value',
      linked: { id: 'linked' },
      cjsDefault: 'cjs-default',
      helper: 'alias-value',
      jsAlias: 'js-alias-value',
      mjs: 'mjs-value',
      dual: 'dual-value',
      local: 'local-value',
      rel: 'rel-value',
      cjs: 'cjs-value',
      fs: 'function',
    });
    expect(r.probe.marker.from).not.toBe('module');
    expect(r.sameMarker).toBe(true);
    expect(r.sameLinked).toBe(true);
  });

  it('loads a config shipped inside node_modules, with its relative TS import', async () => {
    const r = await load(fx.hostConfig);
    expect(r.value).toEqual({
      marker: { ...r.probe.marker, rl: 'function' },
      hostHelper: 'host-helper',
    });
    expect(r.sameMarker).toBe(true);
  });
});
