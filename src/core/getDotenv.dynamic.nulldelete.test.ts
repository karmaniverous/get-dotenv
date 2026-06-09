import { describe, expect, it } from 'vitest';

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
});
