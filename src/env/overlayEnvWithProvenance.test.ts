import { describe, expect, it } from 'vitest';

import { overlayEnvWithProvenance } from './overlayEnvWithProvenance';

describe('env/overlayEnvWithProvenance', () => {
  it('records config and vars provenance in ascending precedence order', () => {
    const base = { A: 'a0' };
    const out = overlayEnvWithProvenance({
      base,
      env: 'dev',
      configs: {
        packaged: { vars: { A: 'a1' } },
        project: {
          public: { envVars: { dev: { A: 'a2' } } },
          local: { vars: { A: 'a3' } },
        },
      },
      programmaticVars: { A: 'a4' },
    });

    expect(out.env.A).toBe('a4');

    const hist = out.provenance.A ?? [];
    // base is not represented in provenance (only overlays and files are recorded)
    expect(hist.length).toBeGreaterThanOrEqual(3);

    // Ensure final entry is vars (highest static tier here)
    const last = hist[hist.length - 1];
    expect(last?.kind).toBe('vars');
  });

  it('records unset when an overlay yields undefined', () => {
    const out = overlayEnvWithProvenance({
      base: { A: 'a0' },
      env: 'dev',
      configs: {
        packaged: { vars: { A: '' } }, // dotenvExpandAll turns empty string into undefined
      },
    });

    expect(out.env.A).toBeUndefined();
    const hist = out.provenance.A ?? [];
    expect(hist.length).toBeGreaterThanOrEqual(1);
    const last = hist[hist.length - 1];
    expect(last?.kind).toBe('config');
    expect(last?.op).toBe('unset');
  });
});
