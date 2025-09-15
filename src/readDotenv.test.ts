import { describe, expect, it } from 'vitest';

import { readDotenv, readDotenvSync } from './readDotenv';

describe('readDotEnv', function () {
  describe('asynchronously', function () {
    it('reads .env', async function () {
      const output = await readDotenv('./test/full/.testenv');

      expect(output).toEqual({ APP_SETTING: 'deep_app_setting' });
    });

    it('handles missing file', async function () {
      const output = await readDotenv('./test/full/.env.prod');

      expect(output).toEqual({});
    });
  });

  describe('synchronously', function () {
    it('reads .env', function () {
      const output = readDotenvSync('./test/full/.testenv');

      expect(output).toEqual({ APP_SETTING: 'deep_app_setting' });
    });

    it('handles missing file', function () {
      const output = readDotenvSync('./test/full/.env.prod');

      expect(output).toEqual({});
    });
  });
});
