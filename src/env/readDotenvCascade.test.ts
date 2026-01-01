import path from 'node:path';

import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

import { readDotenvCascadeWithProvenance } from './readDotenvCascade';

const ROOT = path.posix.join('.tsbuild', 'readDotenvCascade.tests');

describe('env/readDotenvCascadeWithProvenance', () => {
  it('records file provenance entries using as-provided path and computed filename token', async () => {
    const res = await readDotenvCascadeWithProvenance({
      dotenvToken: '.testenv',
      privateToken: 'secret',
      paths: ['./test/full'],
      env: 'test',
    });

    // Sanity: file-derived values
    expect(res.dotenv.APP_SETTING).toBe('deep_app_setting');
    expect(res.dotenv.ENV_SETTING).toBe('deep_test_setting');
    expect(res.dotenv.APP_SECRET).toBe('deep_app_secret');
    expect(res.dotenv.ENV_SECRET).toBe('deep_test_secret');

    // Provenance: at least one entry per key
    const a = res.provenance.APP_SETTING ?? [];
    expect(a.length).toBe(1);
    const first = a[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('Expected provenance entry for APP_SETTING.');
    expect(first.kind).toBe('file');
    if (first.kind !== 'file') {
      throw new Error(`Expected kind='file' for APP_SETTING provenance.`);
    }
    expect(first.path).toBe('./test/full'); // as provided
    expect(first.file).toBe('.testenv'); // global public token
  });

  it('stacks file provenance across multiple paths (ascending precedence)', async () => {
    const base = path.posix.join(ROOT, 'multi');
    const p1 = path.posix.join(base, 'p1');
    const p2 = path.posix.join(base, 'p2');

    await fs.remove(base);
    await fs.ensureDir(p1);
    await fs.ensureDir(p2);

    // Two paths, same key: later path should win in composed dotenv,
    // while provenance should record both layers (as provided).
    await fs.writeFile(path.posix.join(p1, '.testenv'), 'APP_SETTING=one\n', {
      encoding: 'utf-8',
    });
    await fs.writeFile(path.posix.join(p2, '.testenv'), 'APP_SETTING=two\n', {
      encoding: 'utf-8',
    });

    try {
      const res = await readDotenvCascadeWithProvenance({
        dotenvToken: '.testenv',
        paths: [p1, p2],
      });

      expect(res.dotenv.APP_SETTING).toBe('two');

      const hist = res.provenance.APP_SETTING ?? [];
      expect(hist.length).toBe(2);

      const first = hist[0];
      expect(first).toBeDefined();
      if (!first)
        throw new Error('Expected provenance entry 0 for APP_SETTING.');
      expect(first.kind).toBe('file');
      if (first.kind !== 'file') {
        throw new Error(`Expected kind='file' for APP_SETTING provenance[0].`);
      }
      expect(first.path).toBe(p1);
      expect(first.file).toBe('.testenv');

      const second = hist[1];
      expect(second).toBeDefined();
      if (!second)
        throw new Error('Expected provenance entry 1 for APP_SETTING.');
      expect(second.kind).toBe('file');
      if (second.kind !== 'file') {
        throw new Error(`Expected kind='file' for APP_SETTING provenance[1].`);
      }
      expect(second.path).toBe(p2);
      expect(second.file).toBe('.testenv');
    } finally {
      await fs.remove(base);
    }
  });
});
