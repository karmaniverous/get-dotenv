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

  describe('shared env template fallback', () => {
    it('env-specific template wins over the shared one (same dir)', async () => {
      const d = path.join(ROOT, 'shared1', 'p');
      await fs.remove(path.join(ROOT, 'shared1'));
      await fs.ensureDir(d);

      await fs.writeFile(
        path.join(d, '.env.dev.local.template'),
        'A=env-specific\n',
        'utf-8',
      );
      await fs.writeFile(
        path.join(d, '.env.env.local.template'),
        'A=shared\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d],
        scope: 'env',
        privacy: 'private',
        env: 'dev',
      });

      expect(out.targetPath).toBe(path.resolve(d, '.env.dev.local'));
      expect(out.templatePath).toBe(path.resolve(d, '.env.dev.local.template'));
    });

    it('env-specific template wins over the shared one (different dirs)', async () => {
      const d1 = path.join(ROOT, 'shared2', 'p1');
      const d2 = path.join(ROOT, 'shared2', 'p2');
      await fs.remove(path.join(ROOT, 'shared2'));
      await fs.ensureDir(d1);
      await fs.ensureDir(d2);

      // Shared template in d1 (checked first in reverse order's second pass,
      // but the env-specific template loop runs to completion first).
      await fs.writeFile(
        path.join(d1, '.env.env.local.template'),
        'A=shared\n',
        'utf-8',
      );
      // Env-specific template only in d2.
      await fs.writeFile(
        path.join(d2, '.env.dev.local.template'),
        'A=env-specific\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d1, d2],
        scope: 'env',
        privacy: 'private',
        env: 'dev',
      });

      expect(out.targetPath).toBe(path.resolve(d2, '.env.dev.local'));
      expect(out.templatePath).toBe(
        path.resolve(d2, '.env.dev.local.template'),
      );
    });

    it('uses the shared template when no env-specific template exists (private)', async () => {
      const d = path.join(ROOT, 'shared3', 'p');
      await fs.remove(path.join(ROOT, 'shared3'));
      await fs.ensureDir(d);

      await fs.writeFile(
        path.join(d, '.env.env.local.template'),
        'A=shared\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d],
        scope: 'env',
        privacy: 'private',
        env: 'dev',
      });

      expect(out.targetPath).toBe(path.resolve(d, '.env.dev.local'));
      expect(out.templatePath).toBe(path.resolve(d, '.env.env.local.template'));
    });

    it('uses the shared template when no env-specific template exists (public)', async () => {
      const d = path.join(ROOT, 'shared4', 'p');
      await fs.remove(path.join(ROOT, 'shared4'));
      await fs.ensureDir(d);

      await fs.writeFile(
        path.join(d, '.env.env.template'),
        'A=shared\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d],
        scope: 'env',
        privacy: 'public',
        env: 'dev',
      });

      expect(out.targetPath).toBe(path.resolve(d, '.env.dev'));
      expect(out.templatePath).toBe(path.resolve(d, '.env.env.template'));
    });

    it('global scope never uses the shared env template', async () => {
      const d = path.join(ROOT, 'shared5', 'p');
      await fs.remove(path.join(ROOT, 'shared5'));
      await fs.ensureDir(d);

      // This file would match the shared-template naming pattern if scope were
      // 'env', but for 'global' scope it must be ignored entirely.
      await fs.writeFile(
        path.join(d, '.env.env.local.template'),
        'A=shared\n',
        'utf-8',
      );

      await expect(
        resolveDotenvTarget({
          fs: port,
          paths: [d],
          scope: 'global',
          privacy: 'private',
        }),
      ).rejects.toThrow(/Unable to locate dotenv target/i);
    });

    it('.env.local.template remains the template for .env.local only (global)', async () => {
      const d = path.join(ROOT, 'shared6', 'p');
      await fs.remove(path.join(ROOT, 'shared6'));
      await fs.ensureDir(d);

      await fs.writeFile(
        path.join(d, '.env.local.template'),
        'A=global-template\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d],
        scope: 'global',
        privacy: 'private',
      });

      expect(out.targetPath).toBe(path.resolve(d, '.env.local'));
      expect(out.templatePath).toBe(path.resolve(d, '.env.local.template'));
    });

    it('supports a custom sharedEnvTemplateToken', async () => {
      const d = path.join(ROOT, 'shared7', 'p');
      await fs.remove(path.join(ROOT, 'shared7'));
      await fs.ensureDir(d);

      await fs.writeFile(
        path.join(d, '.env.shared.local.template'),
        'A=shared\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d],
        scope: 'env',
        privacy: 'private',
        env: 'dev',
        sharedEnvTemplateToken: 'shared',
      });

      expect(out.targetPath).toBe(path.resolve(d, '.env.dev.local'));
      expect(out.templatePath).toBe(
        path.resolve(d, '.env.shared.local.template'),
      );
    });

    it('respects custom dotenvToken, privateToken, and templateExtension', async () => {
      const d = path.join(ROOT, 'shared8', 'p');
      await fs.remove(path.join(ROOT, 'shared8'));
      await fs.ensureDir(d);

      await fs.writeFile(
        path.join(d, 'env.env.priv.tmpl'),
        'A=shared\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d],
        scope: 'env',
        privacy: 'private',
        env: 'dev',
        dotenvToken: 'env',
        privateToken: 'priv',
        templateExtension: 'tmpl',
      });

      expect(out.targetPath).toBe(path.resolve(d, 'env.dev.priv'));
      expect(out.templatePath).toBe(path.resolve(d, 'env.env.priv.tmpl'));
    });

    it('finds the shared template across multiple paths (reverse order)', async () => {
      const d1 = path.join(ROOT, 'shared9', 'p1');
      const d2 = path.join(ROOT, 'shared9', 'p2');
      await fs.remove(path.join(ROOT, 'shared9'));
      await fs.ensureDir(d1);
      await fs.ensureDir(d2);

      await fs.writeFile(
        path.join(d1, '.env.env.local.template'),
        'A=p1-shared\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d1, d2],
        scope: 'env',
        privacy: 'private',
        env: 'dev',
      });

      // Reverse order checks d2 then d1 in the shared-template pass; only d1 has it.
      expect(out.targetPath).toBe(path.resolve(d1, '.env.dev.local'));
      expect(out.templatePath).toBe(
        path.resolve(d1, '.env.env.local.template'),
      );
    });

    it('finds the shared template across multiple paths (forward order)', async () => {
      const d1 = path.join(ROOT, 'shared10', 'p1');
      const d2 = path.join(ROOT, 'shared10', 'p2');
      await fs.remove(path.join(ROOT, 'shared10'));
      await fs.ensureDir(d1);
      await fs.ensureDir(d2);

      await fs.writeFile(
        path.join(d1, '.env.env.local.template'),
        'A=p1-shared\n',
        'utf-8',
      );
      await fs.writeFile(
        path.join(d2, '.env.env.local.template'),
        'A=p2-shared\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d1, d2],
        scope: 'env',
        privacy: 'private',
        env: 'dev',
        searchOrder: 'forward',
      });

      expect(out.targetPath).toBe(path.resolve(d1, '.env.dev.local'));
      expect(out.templatePath).toBe(
        path.resolve(d1, '.env.env.local.template'),
      );
    });

    it('an existing target wins over the shared template and everything else', async () => {
      const d1 = path.join(ROOT, 'shared11', 'p1');
      const d2 = path.join(ROOT, 'shared11', 'p2');
      await fs.remove(path.join(ROOT, 'shared11'));
      await fs.ensureDir(d1);
      await fs.ensureDir(d2);

      await fs.writeFile(
        path.join(d1, '.env.env.local.template'),
        'A=shared\n',
        'utf-8',
      );
      await fs.writeFile(
        path.join(d1, '.env.dev.local.template'),
        'A=env-specific\n',
        'utf-8',
      );
      await fs.writeFile(
        path.join(d2, '.env.dev.local'),
        'A=existing\n',
        'utf-8',
      );

      const out = await resolveDotenvTarget({
        fs: port,
        paths: [d1, d2],
        scope: 'env',
        privacy: 'private',
        env: 'dev',
      });

      expect(out.targetPath).toBe(path.resolve(d2, '.env.dev.local'));
      expect(out.templatePath).toBeUndefined();
    });

    it('error lists every candidate filename checked, including the shared template', async () => {
      const d1 = path.join(ROOT, 'shared12', 'p1');
      const d2 = path.join(ROOT, 'shared12', 'p2');
      await fs.remove(path.join(ROOT, 'shared12'));
      await fs.ensureDir(d1);
      await fs.ensureDir(d2);

      await expect(
        resolveDotenvTarget({
          fs: port,
          paths: [d1, d2],
          scope: 'env',
          privacy: 'private',
          env: 'dev',
        }),
      ).rejects.toThrow(
        new RegExp(
          [
            path.resolve(d2, '.env.dev.local'),
            path.resolve(d2, '.env.dev.local.template'),
            path.resolve(d1, '.env.dev.local'),
            path.resolve(d1, '.env.dev.local.template'),
            path.resolve(d2, '.env.env.local.template'),
            path.resolve(d1, '.env.env.local.template'),
          ]
            .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*'),
        ),
      );
    });
  });
});
