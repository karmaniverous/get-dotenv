/* eslint-env mocha */

// mocha imports
import { should as chaiShould } from 'chai';
const should = chaiShould();

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
        const output = await getDotenv({
          env: 'foo',
          dotenvToken: '.testenv',
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SECRET: 'root_app_secret',
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
        });
        should.exist(process.env.APP_SETTING);
      });

      it('dynamic', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          dynamicPath: '.testenv.js',
          env: 'foo',
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SECRET: 'root_app_secret',
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
          DYNAMIC_DOUBLE:
            'root_app_setting | root_app_setting | root_app_setting | root_app_setting',
          DYNAMIC_SETTING: 'root_app_setting | root_app_setting',
        });
        should.exist(process.env.APP_SETTING);
      });

      it('exclude private', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          env: 'foo',
          excludePrivate: true,
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
        });
        should.exist(process.env.APP_SETTING);
      });

      it('exclude public & private', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          excludePrivate: true,
          excludePublic: true,
          privateToken: 'secret',
        });

        output.should.deep.equal({});
      });

      it('load process', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          env: 'foo',
          excludePrivate: true,
          loadProcess: true,
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
        });
        process.env.APP_SETTING.should.equal('root_app_setting');
      });

      it('load env', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          env: 'dev',
          excludePrivate: true,
          loadProcess: true,
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
          ENV_SETTING: 'root_dev_setting',
        });
        process.env.APP_SETTING.should.equal('root_app_setting');
        process.env.ENV_SETTING.should.equal('root_dev_setting');
      });
    });

    describe('deep dir', function () {
      it('just path', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          env: 'foo',
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
          APP_SECRET: 'deep_app_secret',
        });
        should.exist(process.env.APP_SETTING);
        should.exist(process.env.APP_SECRET);
      });

      it('dynamic', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          dynamicPath: '.testenv.js',
          env: 'foo',
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SECRET: 'deep_app_secret',
          APP_SETTING: 'deep_app_setting',
          DYNAMIC_DOUBLE:
            'deep_app_setting | deep_app_setting | deep_app_setting | deep_app_setting',
          DYNAMIC_SETTING: 'deep_app_setting | deep_app_setting',
        });
        should.exist(process.env.APP_SETTING);
      });

      it('exclude private', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          env: 'foo',
          excludePrivate: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
        });
        should.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('exclude public', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          env: 'foo',
          excludePublic: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SECRET: 'deep_app_secret',
        });
        should.not.exist(process.env.APP_SETTING);
        should.exist(process.env.APP_SECRET);
      });

      it('exclude public & private', async function () {
        const output = await getDotenv({
          dotenvToken: '.testenv',
          env: 'foo',
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
          dotenvToken: '.testenv',
          env: 'foo',
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
          dotenvToken: '.testenv',
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
          dotenvToken: '.testenv',
          env: 'test',
          loadProcess: true,
          paths: ['./', './test/partial'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
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
        const output = getDotenvSync({ dotenvToken: '.testenv' });

        // No deep equal because .env.local has GITHUB_TOKEN.
        output.APP_SETTING.should.equal('root_app_setting');
        should.exist(process.env.APP_SETTING);
      });

      it('dynamic', async function () {
        const output = await getDotenvSync({
          dotenvToken: '.testenv',
          dynamicPath: '.testenv.js',
          env: 'foo',
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SECRET: 'root_app_secret',
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
          DYNAMIC_DOUBLE:
            'root_app_setting | root_app_setting | root_app_setting | root_app_setting',
          DYNAMIC_SETTING: 'root_app_setting | root_app_setting',
        });
        should.exist(process.env.APP_SETTING);
      });

      it('exclude private', function () {
        const output = getDotenvSync({
          dotenvToken: '.testenv',
          env: 'foo',
          excludePrivate: true,
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
        });
        should.exist(process.env.APP_SETTING);
      });

      it('exclude public & private', function () {
        const output = getDotenvSync({
          env: 'foo',
          excludePrivate: true,
          excludePublic: true,
        });

        output.should.deep.equal({});
      });

      it('load process', function () {
        const output = getDotenvSync({
          dotenvToken: '.testenv',
          env: 'foo',
          excludePrivate: true,
          loadProcess: true,
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
        });
        process.env.APP_SETTING.should.equal('root_app_setting');
      });

      it('load env', function () {
        const output = getDotenvSync({
          dotenvToken: '.testenv',
          env: 'dev',
          excludePrivate: true,
          loadProcess: true,
        });

        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
          ENV_SETTING: 'root_dev_setting',
        });
        process.env.APP_SETTING.should.equal('root_app_setting');
        process.env.ENV_SETTING.should.equal('root_dev_setting');
      });
    });

    describe('deep dir', function () {
      it('just path', function () {
        const output = getDotenvSync({
          dotenvToken: '.testenv',
          env: 'foo',
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
          APP_SECRET: 'deep_app_secret',
        });
        should.exist(process.env.APP_SETTING);
        should.exist(process.env.APP_SECRET);
      });

      it('dynamic', async function () {
        const output = await getDotenvSync({
          dotenvToken: '.testenv',
          dynamicPath: '.testenv.js',
          env: 'foo',
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SECRET: 'deep_app_secret',
          APP_SETTING: 'deep_app_setting',
          DYNAMIC_DOUBLE:
            'deep_app_setting | deep_app_setting | deep_app_setting | deep_app_setting',
          DYNAMIC_SETTING: 'deep_app_setting | deep_app_setting',
        });
        should.exist(process.env.APP_SETTING);
      });

      it('exclude private', function () {
        const output = getDotenvSync({
          dotenvToken: '.testenv',
          env: 'foo',
          excludePrivate: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SETTING: 'deep_app_setting',
        });
        should.exist(process.env.APP_SETTING);
        should.not.exist(process.env.APP_SECRET);
      });

      it('exclude public', function () {
        const output = getDotenvSync({
          dotenvToken: '.testenv',
          env: 'foo',
          excludePublic: true,
          paths: ['./test/full'],
          privateToken: 'secret',
        });

        output.should.deep.equal({
          APP_SECRET: 'deep_app_secret',
        });
        should.not.exist(process.env.APP_SETTING);
        should.exist(process.env.APP_SECRET);
      });

      it('exclude public & private', function () {
        const output = getDotenvSync({
          dotenvToken: '.testenv',
          env: 'foo',
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
          dotenvToken: '.testenv',
          env: 'foo',
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
          dotenvToken: '.testenv',
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
          dotenvToken: '.testenv',
          env: 'test',
          loadProcess: true,
          paths: ['./', './test/partial'],
          privateToken: 'secret',
        });

        delete output.GITHUB_TOKEN;
        output.should.deep.equal({
          APP_SETTING: 'root_app_setting',
          DYNAMIC_APP_SETTING_1: 'root_app_setting',
          DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
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
