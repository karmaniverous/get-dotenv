import { afterEach, describe, expect, it } from 'vitest';

import type { ResolvedConfigSources } from '@/src/config';
import { baseRootOptionDefaults } from '@/src/defaults';

import { resolveRootOptionsBag } from './rootOptionsStack';

const saved = process.env.getDotenvCliOptions;
afterEach(() => {
  if (saved === undefined) delete process.env.getDotenvCliOptions;
  else process.env.getDotenvCliOptions = saved;
});

describe('resolveRootOptionsBag', () => {
  it('with no host defaults and no config, gives the base defaults and base scripts', () => {
    delete process.env.getDotenvCliOptions;
    const bag = resolveRootOptionsBag({}, undefined, {});
    expect(bag.scripts).toEqual(baseRootOptionDefaults.scripts);
    expect(bag.paths).toEqual(baseRootOptionDefaults.paths);
  });

  it('merges config scripts: packaged < project/public < project/local', () => {
    delete process.env.getDotenvCliOptions;
    const sources = {
      packaged: { scripts: { a: 'packaged', b: 'packaged' } },
      project: {
        public: { scripts: { b: 'public', c: 'public' } },
        local: { scripts: { c: 'local' } },
      },
    } as unknown as ResolvedConfigSources;
    const bag = resolveRootOptionsBag({}, { env: 'dev' }, sources);
    expect(bag.env).toBe('dev');
    expect(bag.scripts).toMatchObject({
      a: 'packaged',
      b: 'public',
      c: 'local',
    });
  });
});
