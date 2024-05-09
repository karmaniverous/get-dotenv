/* eslint-env mocha */

import { expect } from 'chai';

import { getDotenv } from './getDotenv';

describe('getDotEnv', function () {
  beforeEach(function () {
    delete process.env.APP_SETTING;
    delete process.env.APP_SECRET;
    delete process.env.ENV_SETTING;
    delete process.env.ENV_SECRET;
  });

  describe('root dir', function () {
    it('no options', async function () {
      const output = await getDotenv({
        env: 'foo',
        dotenvToken: '.testenv',
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SECRET: 'root_app_secret',
        APP_SETTING: 'root_app_setting',
        DYNAMIC_APP_SETTING_1: 'root_app_setting',
        DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
      });

      expect(process.env.APP_SETTING).to.exist;
    });

    it('dynamic', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        dynamicPath: '.testenv.js',
        env: 'foo',
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SECRET: 'root_app_secret',
        APP_SETTING: 'root_app_setting',
        DYNAMIC_APP_SETTING_1: 'root_app_setting',
        DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
        DYNAMIC_DOUBLE:
          'root_app_setting | root_app_setting | root_app_setting | root_app_setting',
        DYNAMIC_SETTING: 'root_app_setting | root_app_setting',
      });
      expect(process.env.APP_SETTING).to.exist;
    });

    it('exclude private', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        env: 'foo',
        excludePrivate: true,
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SETTING: 'root_app_setting',
        DYNAMIC_APP_SETTING_1: 'root_app_setting',
        DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
      });
      expect(process.env.APP_SETTING).to.exist;
    });

    it('exclude public & private', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        excludePrivate: true,
        excludePublic: true,
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({});
    });

    it('load process', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        env: 'foo',
        excludePrivate: true,
        loadProcess: true,
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SETTING: 'root_app_setting',
        DYNAMIC_APP_SETTING_1: 'root_app_setting',
        DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
      });

      expect(process.env.APP_SETTING).to.equal('root_app_setting');
    });

    it('load env', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        env: 'dev',
        excludePrivate: true,
        loadProcess: true,
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SETTING: 'root_app_setting',
        DYNAMIC_APP_SETTING_1: 'root_app_setting',
        DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
        ENV_SETTING: 'root_dev_setting',
      });

      expect(process.env.APP_SETTING).to.equal('root_app_setting');
      expect(process.env.ENV_SETTING).to.equal('root_dev_setting');
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

      expect(output).to.deep.equal({
        APP_SETTING: 'deep_app_setting',
        APP_SECRET: 'deep_app_secret',
      });

      expect(process.env.APP_SETTING).to.exist;
      expect(process.env.APP_SECRET).to.exist;
    });

    it('dynamic', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        dynamicPath: '.testenv.js',
        env: 'foo',
        paths: ['./test/full'],
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SECRET: 'deep_app_secret',
        APP_SETTING: 'deep_app_setting',
        DYNAMIC_DOUBLE:
          'deep_app_setting | deep_app_setting | deep_app_setting | deep_app_setting',
        DYNAMIC_SETTING: 'deep_app_setting | deep_app_setting',
      });

      expect(process.env.APP_SETTING).to.exist;
    });

    it('exclude private', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        env: 'foo',
        excludePrivate: true,
        paths: ['./test/full'],
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SETTING: 'deep_app_setting',
      });

      expect(process.env.APP_SETTING).to.exist;
      expect(process.env.APP_SECRET).to.not.exist;
    });

    it('exclude public', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        env: 'foo',
        excludePublic: true,
        paths: ['./test/full'],
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SECRET: 'deep_app_secret',
      });

      expect(process.env.APP_SETTING).to.not.exist;
      expect(process.env.APP_SECRET).to.exist;
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

      expect(output).to.deep.equal({});
      expect(process.env.APP_SETTING).to.not.exist;
      expect(process.env.APP_SECRET).to.not.exist;
    });

    it('load process', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        env: 'foo',
        loadProcess: true,
        paths: ['./test/full'],
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SETTING: 'deep_app_setting',
        APP_SECRET: 'deep_app_secret',
      });
      expect(process.env.APP_SETTING).to.equal('deep_app_setting');
      expect(process.env.APP_SECRET).to.equal('deep_app_secret');
    });

    it('load env', async function () {
      const output = await getDotenv({
        dotenvToken: '.testenv',
        env: 'test',
        loadProcess: true,
        paths: ['./test/full'],
        privateToken: 'secret',
      });

      expect(output).to.deep.equal({
        APP_SETTING: 'deep_app_setting',
        APP_SECRET: 'deep_app_secret',
        ENV_SETTING: 'deep_test_setting',
        ENV_SECRET: 'deep_test_secret',
      });

      expect(process.env.APP_SETTING).to.equal('deep_app_setting');
      expect(process.env.APP_SECRET).to.equal('deep_app_secret');
      expect(process.env.ENV_SETTING).to.equal('deep_test_setting');
      expect(process.env.ENV_SECRET).to.equal('deep_test_secret');
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

      expect(output).to.deep.equal({
        APP_SETTING: 'root_app_setting',
        DYNAMIC_APP_SETTING_1: 'root_app_setting',
        DYNAMIC_APP_SETTING_2: 'abcroot_app_setting123',
        APP_SECRET: 'root_app_secret',
        ENV_SETTING: 'deep_test_setting',
        ENV_SECRET: 'deep_test_secret',
      });

      expect(process.env.APP_SETTING).to.equal('root_app_setting');
      expect(process.env.APP_SECRET).to.equal('root_app_secret');
      expect(process.env.ENV_SETTING).to.equal('deep_test_setting');
      expect(process.env.ENV_SECRET).to.equal('deep_test_secret');
    });
  });
});
