/**
 * Regression tests for #82: library `getDotenv()` treats an empty `env` as
 * unset, so `defaultEnv` applies and no filename has an empty env segment.
 */
import { describe, expect, it } from 'vitest';

import { inFixture } from '@/test/support/fixtureCli';

import { getDotenv } from './getDotenv';

const files = {
  '.env.': 'XPUBLIC=read-dot\n',
  '.env..local': 'XLOCAL=read-dot-dot-local\n',
  '.env.dev': 'XPUBLIC=dev\n',
  '.env.dev.local': 'XLOCAL=dev\n',
};

describe('#82 an empty library env counts as unset', () => {
  it('the issue repro: env "" with defaultEnv reads the defaultEnv files', async () => {
    await inFixture(files, async (dir) => {
      const vars = await getDotenv({
        paths: [dir],
        env: '',
        defaultEnv: 'dev',
      });
      expect(vars).toMatchObject({ XPUBLIC: 'dev', XLOCAL: 'dev' });
    });
  });

  it('env "" without defaultEnv reads no env files', async () => {
    await inFixture(files, async (dir) => {
      const vars = await getDotenv({ paths: [dir], env: '' });
      expect(vars.XPUBLIC).toBeUndefined();
      expect(vars.XLOCAL).toBeUndefined();
    });
  });

  it('dynamic functions receive the selected env', async () => {
    await inFixture(files, async (dir) => {
      const vars = await getDotenv({
        paths: [dir],
        env: '',
        defaultEnv: 'dev',
        dynamic: { SEEN: (_v, env) => env ?? 'none' },
      });
      expect(vars.SEEN).toBe('dev');
    });
  });
});
