/* eslint-env mocha */

// mocha imports
import chai from 'chai';
const should = chai.should();

// subject imports
import { getDotenv, getDotenvSync } from './getDotenv.js';

describe('getDotEnv', function () {
  beforeEach(function () {
    delete process.env.APP_SETTING;
    delete process.env.APP_SECRET;
    delete process.env.ENV_SETTING;
    delete process.env.ENV_SECRET;
  });

  describe('asynchronous', function () {
    describe('root dir', function () {
      it('no options', async function () {
        const output = await getDotenv({ privateToken: 'secret' });

        output.should.deep.equal({
          APP_SECRET: 'root_app_secret',
          APP_SETTING: 'root_app_setting',
        });
        should.not.exist(process.env.APP_SETTING);
      });

      it('exclude private', async function () {
        const output = await getDotenv({
          excludePrivate: true,
          privateToken: 'secret',
        });

        output.should.deep.equal({ APP_SETTING: 'root_app_setting' });
        should.not.exist(process.env.APP_SETTING);
      });

      it('exclude public & private', async function () {
        const output = await getDotenv({
          excludePrivate: true,
          excludePublic: true,
          privateToken: 'secret',
        });

        output.should.deep.equal({});
      });

      it('load process', async function () {
        const output = await getDotenv({
          excludePrivate: true,
          loadProcess: true,
          privateToken: 'secret',
        });

        output.should.deep.equal({ APP_SETTING: 'root_app_setting' });
        process.env.APP_SETTING.should.equal('root_app_setting');
      });

      it('load env', async function () {
        const output = await getDotenv({
          env: 'dev',
          excludePrivate: true,
          loadProcess: true,
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          ENV_SETTING: 'root_dev_setting',
        });
        process.env.APP_SETTING.should.equal('root_app_setting');
        process.env.ENV_SETTING.should.equal('root_dev_setting');
      });
    });

    describe('deep dir', function () {
      it('just path', async function () {
        const output = await getDotenv({
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
          APP_SECRET: 'deep_app_secret',
        });
        should.not.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('exclude private', async function () {
        const output = await getDotenv({
          excludePrivate: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
        });
        should.not.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('exclude public', async function () {
        const output = await getDotenv({
          excludePublic: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SECRET: 'deep_app_secret',
        });
        should.not.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('exclude public & private', async function () {
        const output = await getDotenv({
          excludePublic: true,
          excludePrivate: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({});
        should.not.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('load process', async function () {
        const output = await getDotenv({
          loadProcess: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
          APP_SECRET: 'deep_app_secret',
        });
        process.env.APP_SETTING.should.equal('deep_app_setting');
        process.env.APP_SECRET.should.equal('deep_app_secret');
      });

      it('load env', async function () {
        const output = await getDotenv({
          env: 'test',
          loadProcess: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
          APP_SECRET: 'deep_app_secret',
          ENV_SETTING: 'deep_test_setting',
          ENV_SECRET: 'deep_test_secret',
        });
        process.env.APP_SETTING.should.equal('deep_app_setting');
        process.env.APP_SECRET.should.equal('deep_app_secret');
        process.env.ENV_SETTING.should.equal('deep_test_setting');
        process.env.ENV_SECRET.should.equal('deep_test_secret');
      });
    });

    describe('partial deep dir', function () {
      it('load env', async function () {
        const output = await getDotenv({
          env: 'test',
          loadProcess: true,
          paths: ['./', './test/partial'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          APP_SECRET: 'root_app_secret',
          ENV_SETTING: 'deep_test_setting',
          ENV_SECRET: 'deep_test_secret',
        });
        process.env.APP_SETTING.should.equal('root_app_setting');
        process.env.APP_SECRET.should.equal('root_app_secret');
        process.env.ENV_SETTING.should.equal('deep_test_setting');
        process.env.ENV_SECRET.should.equal('deep_test_secret');
      });
    });
  });

  describe('synchronous', function () {
    describe('root dir', function () {
      it('no options', function () {
        const output = getDotenvSync();

        // No deep equal because .env.local has GITHUB_TOKEN.
        output.APP_SETTING.should.equal('root_app_setting');
        should.not.exist(process.env.APP_SETTING);
      });

      it('exclude private', function () {
        const output = getDotenvSync({ excludePrivate: true });

        output.should.deep.equal({ APP_SETTING: 'root_app_setting' });
        should.not.exist(process.env.APP_SETTING);
      });

      it('exclude public & private', function () {
        const output = getDotenvSync({
          excludePrivate: true,
          excludePublic: true,
        });

        output.should.deep.equal({});
      });

      it('load process', function () {
        const output = getDotenvSync({
          excludePrivate: true,
          loadProcess: true,
        });

        output.should.deep.equal({ APP_SETTING: 'root_app_setting' });
        process.env.APP_SETTING.should.equal('root_app_setting');
      });

      it('load env', function () {
        const output = getDotenvSync({
          env: 'dev',
          excludePrivate: true,
          loadProcess: true,
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          ENV_SETTING: 'root_dev_setting',
        });
        process.env.APP_SETTING.should.equal('root_app_setting');
        process.env.ENV_SETTING.should.equal('root_dev_setting');
      });
    });

    describe('deep dir', function () {
      it('just path', function () {
        const output = getDotenvSync({
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
          APP_SECRET: 'deep_app_secret',
        });
        should.not.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('exclude private', function () {
        const output = getDotenvSync({
          excludePrivate: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
        });
        should.not.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('exclude public', function () {
        const output = getDotenvSync({
          excludePublic: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SECRET: 'deep_app_secret',
        });
        should.not.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('exclude public & private', function () {
        const output = getDotenvSync({
          excludePublic: true,
          excludePrivate: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({});
        should.not.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('load process', function () {
        const output = getDotenvSync({
          loadProcess: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
          APP_SECRET: 'deep_app_secret',
        });
        process.env.APP_SETTING.should.equal('deep_app_setting');
        process.env.APP_SECRET.should.equal('deep_app_secret');
      });

      it('load env', function () {
        const output = getDotenvSync({
          env: 'test',
          loadProcess: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
          APP_SECRET: 'deep_app_secret',
          ENV_SETTING: 'deep_test_setting',
          ENV_SECRET: 'deep_test_secret',
        });
        process.env.APP_SETTING.should.equal('deep_app_setting');
        process.env.APP_SECRET.should.equal('deep_app_secret');
        process.env.ENV_SETTING.should.equal('deep_test_setting');
        process.env.ENV_SECRET.should.equal('deep_test_secret');
      });
    });

    describe('partial deep dir', function () {
      it('load env', function () {
        const output = getDotenvSync({
          env: 'test',
          loadProcess: true,
          paths: ['./', './test/partial'],
          privateToken: 'secret',
        });

        delete output.GITHUB_TOKEN;
        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          APP_SECRET: 'root_app_secret',
          ENV_SETTING: 'deep_test_setting',
          ENV_SECRET: 'deep_test_secret',
        });
        process.env.APP_SETTING.should.equal('root_app_setting');
        process.env.APP_SECRET.should.equal('root_app_secret');
        process.env.ENV_SETTING.should.equal('deep_test_setting');
        process.env.ENV_SECRET.should.equal('deep_test_secret');
      });
    });
  });
});
