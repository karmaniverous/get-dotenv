import { describe, expect, it } from 'vitest';

import { type OverlayConfigSources, overlayEnv } from './overlayEnv';

describe('env/overlay', () => {
  it('applies precedence: base < packaged < project (public < local) and env > global', () => {
    const base = { A: 'a0', B: 'b0', C: 'c0', D: 'd0' };
    const configs: OverlayConfigSources = {
      packaged: {
        vars: { A: 'a1', P: 'p1' }, // global
        envVars: { dev: { A: 'a1d', B: 'b1d' } }, // env overrides global
      },
      project: {
        public: {
          vars: { A: 'a2', Q: 'q2' },
          envVars: { dev: { A: 'a2d', C: 'c2d' } },
        },
        local: {
          vars: { A: 'a3', R: 'r3' },
          envVars: { dev: { A: 'a3d', D: 'd3d' } },
        },
      },
    };
    const out = overlayEnv({ base, env: 'dev', configs });
    expect(out).toEqual({
      // A flows: base a0 -> packaged a1 -> packaged env a1d -> project pub a2 -> project pub env a2d -> project local a3 -> project local env a3d
      A: 'a3d',
      // B from packaged env
      B: 'b1d',
      // C from project public env
      C: 'c2d',
      // D from project local env
      D: 'd3d',
      // globals carried
      P: 'p1',
      Q: 'q2',
      R: 'r3',
    });
  });

  it('applies programmatic explicit vars last and expands progressively', () => {
    const base = { APP: 'root' };
    const configs: OverlayConfigSources = {
      packaged: {
        vars: { BASELINE: '$APP:missing' },
        envVars: { dev: { FROM_GLOBAL: '${BASELINE}-dev' } },
      },
      project: {
        public: {
          vars: { PUB: 'p' },
        },
      },
    };
    const programmatic = {
      FINAL: '${FROM_GLOBAL}-${PUB}',
    };
    const out = overlayEnv({
      base,
      env: 'dev',
      configs,
      programmaticVars: programmatic,
    });
    expect(out).toEqual({
      APP: 'root',
      BASELINE: 'root',
      FROM_GLOBAL: 'root-dev',
      PUB: 'p',
      FINAL: 'root-dev-p',
    });
  });
});
