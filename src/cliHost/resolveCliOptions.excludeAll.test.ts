/**
 * Regression tests for #68: `rootOptionDefaults.excludeAll` defaults like
 * every other root option, from config and from `createCli`, and `-A` or an
 * individual flag overrides it.
 */
import { describe, expect, it } from 'vitest';

import { runFixtureCli } from '@/test/support/fixtureCli';

import { resolveCliOptions } from './resolveCliOptions';
import type { RootOptionsShape } from './types';

const ALL = {
  excludeDynamic: true,
  excludeEnv: true,
  excludeGlobal: true,
  excludePrivate: true,
  excludePublic: true,
};

const resolve = (
  raw: Record<string, unknown>,
  defaults: Partial<RootOptionsShape>,
) => resolveCliOptions<RootOptionsShape>(raw, defaults).merged;

const excludeAllConfig = {
  '.env': 'APP=base\n',
  'getdotenv.config.json': JSON.stringify({
    rootOptionDefaults: { excludeAll: true },
  }),
};

describe('#68 rootOptionDefaults.excludeAll', () => {
  it('a stacked excludeAll sets all five exclusions and leaves the bag', () => {
    const merged = resolve({}, { excludeAll: true });
    expect(merged).toMatchObject(ALL);
    expect(merged).not.toHaveProperty('excludeAll');
  });

  it('-A, an individual flag or an individual default beats it', () => {
    expect(resolve({ excludeAllOff: true }, { excludeAll: true })).toEqual(
      expect.objectContaining({ excludePrivate: false, excludePublic: false }),
    );
    expect(
      resolve({ excludePrivateOff: true }, { excludeAll: true }),
    ).toMatchObject({ excludePrivate: false, excludePublic: true });
    expect(
      resolve({}, { excludeAll: true, excludePrivate: false }),
    ).toMatchObject({ excludePrivate: false, excludePublic: true });
  });

  it('config rootOptionDefaults.excludeAll stops dotenv files loading', async () => {
    const run = await runFixtureCli(['probe'], excludeAllConfig);
    expect(run.error).toBeUndefined();
    expect(run.bag).toMatchObject(ALL);
    expect(run.ctx?.dotenv.APP).toBeUndefined();
  });

  it('createCli rootOptionDefaults.excludeAll stops dotenv files loading', async () => {
    const run = await runFixtureCli(
      ['probe'],
      { '.env': 'APP=base\n' },
      { rootOptionDefaults: { excludeAll: true } },
    );
    expect(run.bag).toMatchObject(ALL);
    expect(run.ctx?.dotenv.APP).toBeUndefined();
  });

  it('-A on the command line loads the files again', async () => {
    const run = await runFixtureCli(['-A', 'probe'], excludeAllConfig);
    expect(run.ctx?.dotenv.APP).toBe('base');
  });
});
