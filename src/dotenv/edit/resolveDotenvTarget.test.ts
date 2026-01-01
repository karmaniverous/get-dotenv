import path from 'node:path';

import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

import {
  buildDotenvTargetFilename,
  resolveDotenvTarget,
} from './resolveDotenvTarget';
import type { DotenvFs } from './types';

const ROOT = path.resolve(
  '.tsbuild',
  `dotenv-target-tests.${String(process.pid)}.${process.env.VITEST_WORKER_ID ?? '0'}`,
);

const port: DotenvFs = {
  pathExists: async (p) => fs.pathExists(p),
  readFile: async (p) => fs.readFile(p, 'utf-8'),
  writeFile: async (p, contents) => fs.writeFile(p, contents, 'utf-8'),
  copyFile: async (src, dest) => fs.copyFile(src, dest),
};

describe('dotenv/edit/resolveDotenvTarget', () => {
  it('selects the last path by default (reverse order)', async () => {
    const d1 = path.join(ROOT, 'case1', 'p1');
    const d2 = path.join(ROOT, 'case1', 'p2');
    await fs.remove(path.join(ROOT, 'case1'));
    await fs.ensureDir(d1);
    await fs.ensureDir(d2);

    await fs.writeFile(path.join(d1, '.env'), 'A=1\n', 'utf-8');
    await fs.writeFile(path.join(d2, '.env'), 'A=2\n', 'utf-8');

    const out = await resolveDotenvTarget({
      fs: port,
      paths: [d1, d2],
      scope: 'global',
      privacy: 'public',
    });

    expect(out.filename).toBe('.env');
    expect(out.targetPath).toBe(path.resolve(d2, '.env'));
    expect(out.templatePath).toBeUndefined();
  });

  it('supports forward search order', async () => {
    const d1 = path.join(ROOT, 'case2', 'p1');
    const d2 = path.join(ROOT, 'case2', 'p2');
    await fs.remove(path.join(ROOT, 'case2'));
    await fs.ensureDir(d1);
    await fs.ensureDir(d2);

    await fs.writeFile(path.join(d1, '.env'), 'A=1\n', 'utf-8');
    await fs.writeFile(path.join(d2, '.env'), 'A=2\n', 'utf-8');

    const out = await resolveDotenvTarget({
      fs: port,
      paths: [d1, d2],
      scope: 'global',
      privacy: 'public',
      searchOrder: 'forward',
    });

    expect(out.targetPath).toBe(path.resolve(d1, '.env'));
  });

  it('returns templatePath when target is missing but template exists', async () => {
    const d = path.join(ROOT, 'case3', 'p');
    await fs.remove(path.join(ROOT, 'case3'));
    await fs.ensureDir(d);

    await fs.writeFile(
      path.join(d, '.env.local.template'),
      'A=tmpl\n',
      'utf-8',
    );

    const out = await resolveDotenvTarget({
      fs: port,
      paths: [d],
      scope: 'global',
      privacy: 'private',
      privateToken: 'local',
    });

    expect(out.filename).toBe('.env.local');
    expect(out.targetPath).toBe(path.resolve(d, '.env.local'));
    expect(out.templatePath).toBe(path.resolve(d, '.env.local.template'));
  });

  it('buildDotenvTargetFilename throws when env-scoped but env is missing', () => {
    expect(() =>
      buildDotenvTargetFilename({ scope: 'env', privacy: 'public' }),
    ).toThrow(/env is required/i);
  });
});
