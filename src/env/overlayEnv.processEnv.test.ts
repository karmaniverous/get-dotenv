/**
 * Regression tests for #63: overlay layers (config `vars`/`envVars` and
 * explicit vars) expand against `process.env` overlaid with the values
 * composed so far, in both overlay services.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GetDotenvConfigResolved } from '@/src/schema';

import { overlayEnv } from './overlayEnv';
import { overlayEnvWithProvenance } from './overlayEnvWithProvenance';

const cfg = (c: Partial<GetDotenvConfigResolved>) =>
  c as GetDotenvConfigResolved;

const configs = {
  packaged: cfg({ vars: { PKG: 'p$GDV63' } }),
  project: {
    public: cfg({ envVars: { dev: { ENVV: 'e${GDV63}' } } }),
    local: cfg({ vars: { SHADOW: 's$GDV63_SHADOWED' } }),
  },
};

const expected = { PKG: 'pamb', ENVV: 'eamb', VAR: 'vamb', SHADOW: 'sbase' };

describe('#63 overlays expand against process.env', () => {
  beforeEach(() => {
    process.env.GDV63 = 'amb';
    process.env.GDV63_SHADOWED = 'ambient-loses';
  });
  afterEach(() => {
    delete process.env.GDV63;
    delete process.env.GDV63_SHADOWED;
  });

  it('overlayEnvWithProvenance', () => {
    const { env } = overlayEnvWithProvenance({
      base: { GDV63_SHADOWED: 'base' },
      env: 'dev',
      configs,
      programmaticVars: { VAR: 'v$GDV63' },
    });
    expect(env).toMatchObject(expected);
  });

  it('overlayEnv', () => {
    const env = overlayEnv({
      base: { GDV63_SHADOWED: 'base' },
      env: 'dev',
      configs,
      programmaticVars: { VAR: 'v$GDV63' },
    });
    expect(env).toMatchObject(expected);
  });

  it('process.env does not leak into the composed map', () => {
    const env = overlayEnv({ base: {}, env: undefined, configs: {} });
    expect(env).toEqual({});
  });
});
