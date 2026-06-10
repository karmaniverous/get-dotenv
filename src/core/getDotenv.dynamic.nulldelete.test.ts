import { afterEach, describe, expect, it } from 'vitest';

import { getDotenv } from './getDotenv';

describe('getDotenv dynamic null/undefined semantics', () => {
  it('dynamic function returning null deletes a previously-set key', async () => {
    const vars = await getDotenv({
      dotenvToken: '.testenv',
      paths: ['./test/full'],
      env: 'test',
      dynamic: {
        // APP_SETTING is loaded from dotenv files; returning null should delete it
        APP_SETTING: () => null,
      },
    });
    expect('APP_SETTING' in vars).toBe(false);
  });

  it('dynamic function returning undefined leaves existing value unchanged', async () => {
    const vars = await getDotenv({
      dotenvToken: '.testenv',
      paths: ['./test/full'],
      env: 'test',
      dynamic: {
        APP_SETTING: () => undefined,
      },
    });
    // APP_SETTING should still have its dotenv-loaded value
    expect(vars.APP_SETTING).toBe('deep_app_setting');
  });

  it('dynamic literal null deletes a key', async () => {
    const vars = await getDotenv({
      dotenvToken: '.testenv',
      paths: ['./test/full'],
      env: 'test',
      dynamic: {
        APP_SETTING: null,
      },
    });
    expect('APP_SETTING' in vars).toBe(false);
  });

  it('dynamic literal undefined is a no-op', async () => {
    const vars = await getDotenv({
      dotenvToken: '.testenv',
      paths: ['./test/full'],
      env: 'test',
      dynamic: {
        APP_SETTING: undefined,
      },
    });
    expect(vars.APP_SETTING).toBe('deep_app_setting');
  });

  it('dynamic function returning string sets the key (unchanged behavior)', async () => {
    const vars = await getDotenv({
      dotenvToken: '.testenv',
      paths: ['./test/full'],
      env: 'test',
      dynamic: {
        NEW_KEY: () => 'hello',
      },
    });
    expect(vars.NEW_KEY).toBe('hello');
  });

  describe('loadProcess null-delete', () => {
    const SENTINEL_KEY = '__GETDOTENV_NULL_DELETE_TEST__';

    afterEach(() => {
      Reflect.deleteProperty(process.env, SENTINEL_KEY);
    });

    it('dynamic null removes an existing key from process.env when loadProcess is true', async () => {
      // Pre-seed process.env so the key exists before getDotenv runs.
      process.env[SENTINEL_KEY] = 'should-be-removed';

      await getDotenv({
        dotenvToken: '.testenv',
        paths: ['./test/full'],
        env: 'test',
        loadProcess: true,
        dynamic: {
          [SENTINEL_KEY]: () => null,
        },
      });

      expect(SENTINEL_KEY in process.env).toBe(false);
    });
  });
});
