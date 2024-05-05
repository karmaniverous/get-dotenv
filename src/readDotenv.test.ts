/* eslint-env mocha */

import { expect } from 'chai';

import { readDotenv, readDotenvSync } from './readDotenv';

describe('readDotEnv', function () {
  describe('asynchronously', function () {
    it('reads .env', async function () {
      const output = await readDotenv('./test/full/.testenv');

      expect(output).to.deep.equal({ APP_SETTING: 'deep_app_setting' });
    });

    it('handles missing file', async function () {
      const output = await readDotenv('./test/full/.env.prod');

      expect(output).to.deep.equal({});
    });
  });

  describe('synchronously', function () {
    it('reads .env', function () {
      const output = readDotenvSync('./test/full/.testenv');

      expect(output).to.deep.equal({ APP_SETTING: 'deep_app_setting' });
    });

    it('handles missing file', function () {
      const output = readDotenvSync('./test/full/.env.prod');

      expect(output).to.deep.equal({});
    });
  });
});
