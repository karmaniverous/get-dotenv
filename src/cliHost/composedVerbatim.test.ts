/**
 * Regression tests for #94: a value that has already been expanded (composed)
 * is substituted verbatim when another value references it. It is never
 * expanded a second time, so an escape written once holds for every later use.
 * The rule covers every layer: dotenv files, config `vars`/`envVars`, `-v`,
 * and references to `process.env` values.
 */
import { describe, expect, it } from 'vitest';

import { getDotenv } from '@/src/core/getDotenv';
import { dotenvExpand, dotenvExpandAll } from '@/src/dotenv';
import { readDotenvCascadeWithProvenance } from '@/src/env/readDotenvCascade';
import { inFixture, runFixtureCli, withEnv } from '@/test/support/fixtureCli';

const repro = { '.env': 'P=\\$5\nQ=$P\nR=${P}x\n' };
const expected = { P: '$5', Q: '$5', R: '$5x' };

const config = (cfg: unknown) => ({
  'getdotenv.config.json': JSON.stringify(cfg),
});

describe('#94 a composed value is not expanded again', () => {
  it('the issue repro: P=\\$5, Q=$P, R=${P}x', async () => {
    await inFixture(repro, async (dir) => {
      const env = await getDotenv({ paths: [dir], loadProcess: false });
      expect({ P: env.P, Q: env.Q, R: env.R }).toEqual(expected);
    });
  });

  it('readDotenvCascadeWithProvenance', async () => {
    await inFixture(repro, async (dir) => {
      const { dotenv } = await readDotenvCascadeWithProvenance({
        paths: [dir],
      });
      expect(dotenv).toMatchObject(expected);
    });
  });

  it('the host: dotenv files', async () => {
    const run = await runFixtureCli(['-P', 'probe'], repro);
    expect(run.ctx?.dotenv).toMatchObject(expected);
  });

  it('the host: config vars and envVars reference a composed file value', async () => {
    const run = await runFixtureCli(['-P', '-e', 'dev', 'probe'], {
      '.env': 'P=\\$5\n',
      ...config({
        vars: { Q: '$P', S: 'lit\\$9' },
        envVars: { dev: { R: '${P}x', T: '$S' } },
      }),
    });
    expect(run.ctx?.dotenv).toMatchObject({
      ...expected,
      S: 'lit$9',
      T: 'lit$9',
    });
  });

  it('the host: -v references a composed value, and its own', async () => {
    const run = await runFixtureCli(
      ['-P', '-v', 'Q=$P R=${P}x V=\\$7 W=$V', 'probe'],
      { '.env': 'P=\\$5\n' },
    );
    expect(run.ctx?.dotenv).toMatchObject({ ...expected, V: '$7', W: '$7' });
  });

  it('a process.env value is substituted verbatim', async () => {
    const run = await withEnv(
      { GDV94: '$HOME/x', GDV94_SELF: '$GDV94_SELF' },
      () =>
        runFixtureCli(['-P', 'probe'], {
          '.env': 'A=$GDV94\nB=${GDV94_SELF}\n',
        }),
    );
    expect(run.ctx?.dotenv).toMatchObject({
      A: '$HOME/x',
      B: '$GDV94_SELF',
    });
  });

  it('dotenvExpand substitutes a referenced value verbatim', () => {
    expect(dotenvExpand('$Q', { Q: '$P', P: 'x' })).toBe('$P');
    expect(dotenvExpand('a${Q}b', { Q: '\\$5' })).toBe('a\\$5b');
  });

  it('a default is still expanded', () => {
    expect(dotenvExpand('${U:$P-\\$1}', { P: '$5' })).toBe('$5-$1');
  });

  it('a value being expanded counts as unset in its own pass', () => {
    expect(
      dotenvExpandAll(
        { SELF: '${SELF:d}', P: '${P:/usr/bin}:/x' },
        { ref: {}, progressive: true },
      ),
    ).toEqual({ SELF: 'd', P: '/usr/bin:/x' });
  });

  it('a self-reference sees the value composed before it', () => {
    expect(
      dotenvExpandAll(
        { P: '${P:/usr/bin}:/x' },
        { ref: { P: '$HOME' }, progressive: true },
      ),
    ).toEqual({ P: '$HOME:/x' });
  });
});
