import { describe, expect, it } from 'vitest';

import { getDotenv } from './getDotenv';

describe('getDotenv dynamic exclusion', () => {
  it('does not evaluate dynamic variables when excludeDynamic is true', async () => {
    const output = await getDotenv({
      dotenvToken: '.testenv',
      dynamicPath: '.testenv.js',
      env: 'foo',
      privateToken: 'secret',
      excludeDynamic: true,
    });

    expect(output).toEqual({
      APP_SECRET: 'root_app_secret',
      APP_SETTING: 'root_app_setting',
      DYNAMIC_APP_SETTING_1: 'root_app_setting',
      DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
    });
    expect('DYNAMIC_SETTING' in output).toBe(false);
    expect('DYNAMIC_DOUBLE' in output).toBe(false);
  });
});
