import path from 'node:path';

import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from '@/src/cliHost/GetDotenvCli';

type DynamicProvEntry = {
  kind: 'dynamic';
  op: 'set' | 'unset';
  dynamicSource: 'config' | 'programmatic' | 'dynamicPath';
  dynamicPath?: string;
};

const isDynamicProvEntry = (v: unknown): v is DynamicProvEntry => {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  if (obj['kind'] !== 'dynamic') return false;
  const op = obj['op'];
  if (op !== 'set' && op !== 'unset') return false;
  const src = obj['dynamicSource'];
  return src === 'config' || src === 'programmatic' || src === 'dynamicPath';
};

const ROOT = path.resolve(
  '.tsbuild',
  `dotenv-provenance-dynamic.${String(process.pid)}.${process.env.VITEST_WORKER_ID ?? '0'}`,
);

const writeJson = async (p: string, v: unknown) =>
  fs.writeFile(p, JSON.stringify(v, null, 2), 'utf-8');

const withCwd = async (dir: string, fn: () => Promise<void>) => {
  const prev = process.cwd();
  process.chdir(dir);
  try {
    await fn();
  } finally {
    process.chdir(prev);
  }
};

describe('cliHost dotenvProvenance (dynamic precedence)', () => {
  it('records dynamic provenance in A2 order: config < programmatic < dynamicPath', async () => {
    const dir = path.join(ROOT, 'case-order');
    await fs.remove(dir);
    await fs.ensureDir(dir);

    // Ensure Node treats local .mjs ESM imports predictably.
    await writeJson(path.join(dir, 'package.json'), {
      name: 'dotenv-provenance-dynamic-tests',
      type: 'module',
    });

    // Project config provides dynamic (lowest dynamic tier).
    await fs.writeFile(
      path.join(dir, 'getdotenv.config.mjs'),
      [
        'export default {',
        '  dynamic: {',
        '    PROV_KEY: () => "from-config",',
        '  },',
        '};',
        '',
      ].join('\n'),
      'utf-8',
    );

    // dynamicPath is the highest dynamic tier.
    const dynamicPath = './dynamic.mjs';
    await fs.writeFile(
      path.join(dir, 'dynamic.mjs'),
      ['export default { PROV_KEY: "from-dynamicPath" };', ''].join('\n'),
      'utf-8',
    );

    const cli = new GetDotenvCli('test');

    await withCwd(dir, async () => {
      const ctx = await cli.resolveAndLoad({
        // Do not rely on any dotenv files for this test.
        paths: [],
        log: false,
        loadProcess: false,
        // Programmatic dynamic overrides config dynamic.
        dynamic: {
          PROV_KEY: () => 'from-programmatic',
        },
        // dynamicPath overrides everything.
        dynamicPath,
      });

      expect(ctx.dotenv.PROV_KEY).toBe('from-dynamicPath');

      const hist = ctx.dotenvProvenance.PROV_KEY ?? [];
      const dyn = hist.filter(isDynamicProvEntry);
      expect(dyn.length).toBeGreaterThanOrEqual(3);

      const sources = dyn.map((e) => e.dynamicSource);
      expect(sources).toEqual(['config', 'programmatic', 'dynamicPath']);

      const last = dyn[dyn.length - 1];
      expect(last).toBeDefined();
      expect(last?.dynamicSource).toBe('dynamicPath');
      // Provenance should record dynamicPath "as provided" (not resolved absolute).
      expect(last?.dynamicPath).toBe(dynamicPath);
      expect(last?.op).toBe('set');
    });

    await fs.remove(dir);
  });

  it('records op=unset when a dynamic function returns undefined', async () => {
    const dir = path.join(ROOT, 'case-unset');
    await fs.remove(dir);
    await fs.ensureDir(dir);

    await writeJson(path.join(dir, 'package.json'), {
      name: 'dotenv-provenance-dynamic-tests',
      type: 'module',
    });

    const cli = new GetDotenvCli('test');

    await withCwd(dir, async () => {
      const ctx = await cli.resolveAndLoad({
        paths: [],
        log: false,
        loadProcess: false,
        dynamic: {
          PROV_UNSET: () => undefined,
        },
      });

      expect(ctx.dotenv.PROV_UNSET).toBeUndefined();

      const hist = ctx.dotenvProvenance.PROV_UNSET ?? [];
      const dyn = hist.filter(isDynamicProvEntry);
      expect(dyn.length).toBeGreaterThanOrEqual(1);

      const last = dyn[dyn.length - 1];
      expect(last?.dynamicSource).toBe('programmatic');
      expect(last?.op).toBe('unset');
    });

    await fs.remove(dir);
  });
});
