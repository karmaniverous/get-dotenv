/* eslint-env mocha */

// mocha imports
import chai from 'chai';
chai.should();

// subject imports
import { readDotenv, readDotenvSync } from './readDotenv.js';

describe('readDotEnv', function () {
  describe('asynchronously', function () {
    it('reads .env', async function () {
      const output = await readDotenv('./test/full/.testenv');

      output.should.deep.equal({ APP_SETTING: 'deep_app_setting' });
    });

    it('handles missing file', async function () {
      const output = await readDotenv('./test/full/.env.prod');

      output.should.deep.equal({});
    });
  });

  describe('synchronously', function () {
    it('reads .env', function () {
      const output = readDotenvSync('./test/full/.testenv');

      output.should.deep.equal({ APP_SETTING: 'deep_app_setting' });
    });

    it('handles missing file', function () {
      const output = readDotenvSync('./test/full/.env.prod');

      output.should.deep.equal({});
    });
  });
});
