import { beforeEach, describe, expect, it } from 'vitest';

import { definePlugin } from './definePlugin';
import { GetDotenvCli } from './GetDotEnvCli';

describe('GetDotenvCli host (skeleton)', () => {
  beforeEach(() => {
    delete process.env.APP_SETTING;
    delete process.env.APP_SECRET;
    delete process.env.ENV_SETTING;
    delete process.env.ENV_SECRET;
  });

  it('resolveAndLoad builds ctx and returns dotenv values', async () => {
    const cli = new GetDotenvCli('test');
    const ctx = await cli.resolveAndLoad({
      dotenvToken: '.testenv',
      env: 'test',
      privateToken: 'secret',
      paths: ['./test/full'],
      loadProcess: false, // getDotenv honors this internally
    });

    expect(ctx.dotenv).toEqual({
      APP_SETTING: 'deep_app_setting',
      APP_SECRET: 'deep_app_secret',
      ENV_SETTING: 'deep_test_setting',
      ENV_SECRET: 'deep_test_secret',
    });

    // Accessor should return the same context instance
    expect(cli.getCtx()).toBe(ctx);
  });

  it('honors loadProcess via getDotenv (process.env merge when true)', async () => {
    const cli = new GetDotenvCli('test');
    await cli.resolveAndLoad({
      dotenvToken: '.testenv',
      env: 'test',
      privateToken: 'secret',
      paths: ['./test/full'],
      loadProcess: true,
    });

    expect(process.env.APP_SETTING).toBe('deep_app_setting');
    expect(process.env.APP_SECRET).toBe('deep_app_secret');
    expect(process.env.ENV_SETTING).toBe('deep_test_setting');
    expect(process.env.ENV_SECRET).toBe('deep_test_secret');
  });

  it('rejects invalid option shapes under strict schema', async () => {
    const cli = new GetDotenvCli('test');
    await expect(
      cli.resolveAndLoad({
        // invalid type: should be boolean
        excludePublic: 'yes' as unknown as boolean,
      }),
    ).rejects.toThrow();
  });

  it('runs plugin afterResolve in parent → children order', async () => {
    const order: string[] = [];
    const child = definePlugin({
      id: 'child',
      setup: () => undefined,
      afterResolve: () => {
        order.push('child');
      },
    });

    const parent = definePlugin({
      id: 'parent',
      setup: () => undefined,
      afterResolve: () => {
        order.push('parent');
      },
    }).use(child);

    const cli = new GetDotenvCli('test').use(parent);
    await cli.resolveAndLoad({
      dotenvToken: '.testenv',
      env: 'test',
      privateToken: 'secret',
      paths: ['./test/full'],
    });

    expect(order).toEqual(['parent', 'child']);
  });

  it('ns helper creates a namespaced subcommand', () => {
    const cli = new GetDotenvCli('test');
    const sub = cli.ns('foo');
    expect(sub.name()).toBe('foo');
  });
});
