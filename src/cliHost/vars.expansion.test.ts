/**
 * Regression tests for #63 and #89: the host expands config `vars`/`envVars`
 * and explicit vars against `process.env` overlaid with the values composed
 * so far, and a CLI `-v` value is expanded once, in the vars layer.
 */
import { describe, expect, it } from 'vitest';

import { runFixtureCli, withEnv } from '@/test/support/fixtureCli';

const config = (cfg: unknown) => ({
  'getdotenv.config.json': JSON.stringify(cfg),
});

describe('#63 host layers expand against process.env', () => {
  it('the issue repro: config vars see process.env, like a .env file', async () => {
    const run = await withEnv({ GDV_AMBIENT: 'amb' }, () =>
      runFixtureCli(['-P', 'probe'], {
        '.env': 'FILEV=f${GDV_AMBIENT}\n',
        ...config({ vars: { CFGHOME: 'x${GDV_AMBIENT}' } }),
      }),
    );
    expect(run.ctx?.dotenv.FILEV).toBe('famb');
    expect(run.ctx?.dotenv.CFGHOME).toBe('xamb');
  });

  it('config envVars see process.env', async () => {
    const run = await withEnv({ GDV_AMBIENT: 'amb' }, () =>
      runFixtureCli(
        ['-P', '-e', 'dev', 'probe'],
        config({ envVars: { dev: { ENVV: 'e$GDV_AMBIENT' } } }),
      ),
    );
    expect(run.ctx?.dotenv.ENVV).toBe('eamb');
  });

  it('config rootOptionDefaults.vars see process.env', async () => {
    const run = await withEnv({ GDV_AMBIENT: 'amb' }, () =>
      runFixtureCli(
        ['-P', 'probe'],
        config({ rootOptionDefaults: { vars: 'RV=r$GDV_AMBIENT' } }),
      ),
    );
    expect(run.ctx?.dotenv.RV).toBe('ramb');
  });

  it('composed values win over process.env', async () => {
    const run = await withEnv({ GDV_AMBIENT: 'amb' }, () =>
      runFixtureCli(['-P', '-v', 'V=v$GDV_AMBIENT', 'probe'], {
        '.env': 'GDV_AMBIENT=file\n',
        ...config({ vars: { CFGHOME: 'x${GDV_AMBIENT}' } }),
      }),
    );
    expect(run.ctx?.dotenv.CFGHOME).toBe('xfile');
    expect(run.ctx?.dotenv.V).toBe('vfile');
  });
});

describe('#89 -v is expanded once, in the vars layer', () => {
  it("the issue repro: -v 'P=\\$5' sets P to $5", async () => {
    const run = await runFixtureCli([
      '-P',
      '-v',
      'P=\\$5 Q=\\\\$6 R=lit',
      'probe',
    ]);
    expect(run.ctx?.dotenv).toMatchObject({ P: '$5', Q: '\\$6', R: 'lit' });
  });

  it('the bag keeps the -v string as given', async () => {
    const run = await runFixtureCli(['-P', '-v', 'P=\\$5', 'probe']);
    expect(run.bag?.vars).toBe('P=\\$5');
  });

  it('-v sees values composed by earlier layers', async () => {
    const run = await runFixtureCli(['-P', '-v', 'V=v${APP}', 'probe'], {
      '.env': 'APP=base\n',
    });
    expect(run.ctx?.dotenv.V).toBe('vbase');
  });
});
